import express from "express";

import { getTenantPrisma } from "../../middleware/tenant-context.js";
import { appEventBus } from "../../services/app-events.js";
import {
  createOrgNodeBodySchema,
  updateOrgNodeBodySchema,
  batchUpdatePositionsBodySchema,
} from "../schemas/org-node.schema.js";

export function createOrgRouter(): express.Router {
  const router = express.Router();

  router.get("/org", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const nodes = await prisma.orgNode.findMany({
        orderBy: { position: "asc" },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              displayName: true,
              role: true,
              department: true,
              level: true,
              status: true,
              currentTaskId: true,
            },
          },
        },
      });

      // Build tree in O(n): adjacency map approach
      // Pass 1: index nodes by id for O(1) parent lookup
      const byNodeId = new Map<string, typeof nodes[number]>();
      for (const node of nodes) {
        byNodeId.set(node.id, node);
      }

      // Pass 2: create tree nodes and place each under its parent
      type TreeNode = {
        nodeId: string;
        agent: typeof nodes[0]["agent"];
        parentAgentId: string | null;
        parentNodeId: string | null;
        positionX: number;
        positionY: number;
        children: TreeNode[];
      };
      const treeNodeMap = new Map<string, TreeNode>();
      const roots: TreeNode[] = [];

      for (const node of nodes) {
        // Get or create tree node for this org node
        let treeNode = treeNodeMap.get(node.id);
        if (!treeNode) {
          treeNode = {
            nodeId: node.id,
            agent: node.agent,
            parentAgentId: null,
            parentNodeId: node.parentNodeId,
            positionX: node.positionX,
            positionY: node.positionY,
            children: [],
          };
          treeNodeMap.set(node.id, treeNode);
        } else {
          // Node was pre-created as a parent — fill in its data now
          treeNode.agent = node.agent;
          treeNode.nodeId = node.id;
          treeNode.parentNodeId = node.parentNodeId;
          treeNode.positionX = node.positionX;
          treeNode.positionY = node.positionY;
        }

        if (node.parentNodeId) {
          const parentOrgNode = byNodeId.get(node.parentNodeId);
          treeNode.parentAgentId = parentOrgNode?.agent.id ?? null;

          // Get or create parent tree node so children can attach even if
          // the parent hasn't been visited yet in this iteration
          let parentTreeNode = treeNodeMap.get(node.parentNodeId);
          if (!parentTreeNode) {
            parentTreeNode = {
              nodeId: node.parentNodeId,
              agent: null as unknown as typeof nodes[0]["agent"],
              parentAgentId: null,
              parentNodeId: null,
              positionX: 0,
              positionY: 0,
              children: [],
            };
            treeNodeMap.set(node.parentNodeId, parentTreeNode);
          }
          parentTreeNode.children.push(treeNode);
        } else {
          roots.push(treeNode);
        }
      }

      res.json({ org: roots });
    } catch (error) {
      next(error);
    }
  });

  router.get("/org/nodes", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const nodes = await prisma.orgNode.findMany({
        orderBy: { position: "asc" },
        select: {
          id: true,
          agentId: true,
          parentNodeId: true,
          position: true,
          positionX: true,
          positionY: true,
          agent: { select: { name: true, displayName: true, role: true } },
        },
      });
      res.json({ nodes });
    } catch (error) {
      next(error);
    }
  });

  router.post("/org/nodes", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const body = createOrgNodeBodySchema.parse(req.body);
      if (body.parentNodeId) {
        const parent = await prisma.orgNode.findUnique({ where: { id: body.parentNodeId } });
        if (!parent) {
          res.status(400).json({ error: "Parent OrgNode not found" });
          return;
        }
      }
      const node = await prisma.orgNode.create({
        data: {
          agentId: body.agentId,
          parentNodeId: body.parentNodeId ?? null,
          position: body.position ?? 0,
          positionX: body.positionX ?? 0,
          positionY: body.positionY ?? 0,
        },
      });
      appEventBus.emit("org_changed", { orgSlug: req.tenant?.slug ?? "default" });
      res.status(201).json({ node });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/org/nodes/:id", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const node = await prisma.orgNode.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!node) {
        res.status(404).json({ error: "OrgNode not found" });
        return;
      }
      const body = updateOrgNodeBodySchema.parse(req.body);

      // Validate parent exists if changing parentNodeId
      if (body.parentNodeId) {
        const parent = await prisma.orgNode.findUnique({ where: { id: body.parentNodeId } });
        if (!parent) {
          res.status(400).json({ error: "Parent OrgNode not found" });
          return;
        }

        // Cycle detection: walk ancestor chain from proposed parent
        if (body.parentNodeId === node.id) {
          res.status(400).json({ error: "Cannot set a node as its own parent" });
          return;
        }

        let currentId: string | null = body.parentNodeId;
        while (currentId) {
          const ancestor: { parentNodeId: string | null } | null =
            await prisma.orgNode.findUnique({
              where: { id: currentId },
              select: { parentNodeId: true },
            });
          if (!ancestor) break;
          if (ancestor.parentNodeId === node.id) {
            res.status(400).json({ error: "This change would create a cycle in the org hierarchy" });
            return;
          }
          currentId = ancestor.parentNodeId;
        }
      }

      const data: Record<string, unknown> = {};
      if (body.parentNodeId !== undefined) data["parentNodeId"] = body.parentNodeId;
      if (body.position !== undefined) data["position"] = body.position;
      if (body.positionX !== undefined) data["positionX"] = body.positionX;
      if (body.positionY !== undefined) data["positionY"] = body.positionY;
      const updated = await prisma.orgNode.update({ where: { id: node.id }, data });
      appEventBus.emit("org_changed", { orgSlug: req.tenant?.slug ?? "default" });
      res.json({ node: updated });
    } catch (error) {
      next(error);
    }
  });

  router.put("/org/nodes/positions", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const body = batchUpdatePositionsBodySchema.parse(req.body);

      await prisma.$transaction(
        body.positions.map((p) =>
          prisma.orgNode.update({
            where: { id: p.nodeId },
            data: { positionX: p.positionX, positionY: p.positionY },
          }),
        ),
      );

      appEventBus.emit("org_changed", { orgSlug: req.tenant?.slug ?? "default" });
      res.json({ updated: body.positions.length });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/org/nodes/:id", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const node = await prisma.orgNode.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!node) {
        res.status(404).json({ error: "OrgNode not found" });
        return;
      }

      // Re-parent children to deleted node's parent
      await prisma.orgNode.updateMany({
        where: { parentNodeId: node.id },
        data: { parentNodeId: node.parentNodeId },
      });

      await prisma.orgNode.delete({ where: { id: node.id } });
      appEventBus.emit("org_changed", { orgSlug: req.tenant?.slug ?? "default" });
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

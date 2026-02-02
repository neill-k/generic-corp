import express from "express";

import { db } from "../../db/client.js";
import { appEventBus } from "../../services/app-events.js";
import { createOrgNodeBodySchema, updateOrgNodeBodySchema } from "../schemas/org-node.schema.js";

export function createOrgRouter(): express.Router {
  const router = express.Router();

  router.get("/org", async (_req, res, next) => {
    try {
      const nodes = await db.orgNode.findMany({
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
      type TreeNode = { agent: typeof nodes[0]["agent"]; parentAgentId: string | null; children: TreeNode[] };
      const treeNodeMap = new Map<string, TreeNode>();
      const roots: TreeNode[] = [];

      for (const node of nodes) {
        // Get or create tree node for this org node
        let treeNode = treeNodeMap.get(node.id);
        if (!treeNode) {
          treeNode = { agent: node.agent, parentAgentId: null, children: [] };
          treeNodeMap.set(node.id, treeNode);
        } else {
          // Node was pre-created as a parent — fill in its data now
          treeNode.agent = node.agent;
        }

        if (node.parentNodeId) {
          const parentOrgNode = byNodeId.get(node.parentNodeId);
          treeNode.parentAgentId = parentOrgNode?.agent.id ?? null;

          // Get or create parent tree node so children can attach even if
          // the parent hasn't been visited yet in this iteration
          let parentTreeNode = treeNodeMap.get(node.parentNodeId);
          if (!parentTreeNode) {
            parentTreeNode = { agent: null as unknown as typeof nodes[0]["agent"], parentAgentId: null, children: [] };
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

  router.get("/org/nodes", async (_req, res, next) => {
    try {
      const nodes = await db.orgNode.findMany({
        orderBy: { position: "asc" },
        select: {
          id: true,
          agentId: true,
          parentNodeId: true,
          position: true,
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
      const body = createOrgNodeBodySchema.parse(req.body);
      if (body.parentNodeId) {
        const parent = await db.orgNode.findUnique({ where: { id: body.parentNodeId } });
        if (!parent) {
          res.status(400).json({ error: "Parent OrgNode not found" });
          return;
        }
      }
      const node = await db.orgNode.create({
        data: {
          agentId: body.agentId,
          parentNodeId: body.parentNodeId ?? null,
          position: body.position ?? 0,
        },
      });
      appEventBus.emit("org_changed", {});
      res.status(201).json({ node });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/org/nodes/:id", async (req, res, next) => {
    try {
      const node = await db.orgNode.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!node) {
        res.status(404).json({ error: "OrgNode not found" });
        return;
      }
      const body = updateOrgNodeBodySchema.parse(req.body);
      if (body.parentNodeId) {
        const parent = await db.orgNode.findUnique({ where: { id: body.parentNodeId } });
        if (!parent) {
          res.status(400).json({ error: "Parent OrgNode not found" });
          return;
        }
      }
      const data: Record<string, unknown> = {};
      if (body.parentNodeId !== undefined) data["parentNodeId"] = body.parentNodeId;
      if (body.position !== undefined) data["position"] = body.position;
      const updated = await db.orgNode.update({ where: { id: node.id }, data });
      appEventBus.emit("org_changed", {});
      res.json({ node: updated });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/org/nodes/:id", async (req, res, next) => {
    try {
      const node = await db.orgNode.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!node) {
        res.status(404).json({ error: "OrgNode not found" });
        return;
      }
      await db.orgNode.delete({ where: { id: node.id } });
      appEventBus.emit("org_changed", {});
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

# Agent Workflow Builder - Design & Implementation

## Overview

A visual n8n-style workflow builder for designing agent organizational structures. Users can drag agents onto a canvas, draw delegation connections, configure agent properties, and export the configuration.

## Design Decisions

### 1. Connection Semantics

**Decision**: Connections represent **delegation relationships** (one-directional).

- **Arrow direction**: From delegator → delegatee (manager → report)
- **Example**: If Agent A has a connection to Agent B, it means "Agent A can delegate tasks to Agent B"
- **Implementation**: Connections map to the `parentNodeId` field in the `OrgNode` model

**Why**: This matches the existing database schema where org hierarchy is represented through parent-child relationships.

### 2. Configurable Agent Properties

**Decision**: Only expose properties that define agent identity and behavior, NOT derived state.

**Editable fields**:
- `displayName` - Full name (e.g., "Marcus Bell")
- `role` - Job title (e.g., "CEO")
- `department` - Team/division (e.g., "Executive")
- `level` - Org level: `ic`, `lead`, `manager`, `vp`, `c-suite`
- `personality` - System prompt defining agent behavior (multi-line textarea)

**NOT editable**:
- `status` - Derived from agent activity (idle, running, error, offline)
- `currentTaskId` - Runtime state
- `name` - Auto-generated from `displayName` (lowercase, hyphenated)

**Why**: Users configure agent identity, the system manages runtime state.

### 3. Organization Templates

**Decision**: Provide pre-configured organizational patterns as starting points.

**Templates to implement**:
1. **Strict Hierarchy** - Traditional command chain (CEO → VPs → Managers → ICs)
2. **Flat Team** - Peer agents with shared task queue
3. **Capability-Based Routing** - Router agent that delegates based on skills
4. **Specialist Pools** - Grouped by specialty (Frontend, Backend, Data, etc.)
5. **Matrix Organization** - Dual reporting (functional + project teams)
6. **Autonomous Cells** - Self-sufficient small teams
7. **Swarm/Collective** - Peer-to-peer collaboration
8. **Hybrid** - Hierarchy for coordination + capability routing for execution

**Why**: Reduces cognitive load, provides best-practice patterns, accelerates setup.

### 4. Export Format

**Decision**: Export to the existing `SeedAgent[]` format used in `apps/server/src/db/seed-data.ts`.

**Format**:
```typescript
interface SeedAgent {
  name: string;           // Auto-generated from displayName
  displayName: string;
  role: string;
  department: string;
  level: "ic" | "lead" | "manager" | "vp" | "c-suite";
  reportsTo: string | null;  // Derived from connections
  personality: string;
}
```

**Why**: Direct compatibility with existing seeding infrastructure. No schema changes needed.

### 5. UX Patterns

#### Node Interaction
- **Drag nodes** to reposition
- **Click node** to open configuration sidebar
- **Blue connector dots** on left (input) and right (output) of each node

#### Connection Management
- **Draw connection**: Click and drag from output dot (right) to input dot (left)
- **Delete connection**: Click connection → confirm, OR right-click → immediate delete
- **Visual feedback**: Connections turn red on hover to indicate interactivity

#### Canvas
- **Grid background** for visual alignment
- **Infinite scrollable canvas** (2000x2000px)
- **Connections behind nodes** (z-index layering)
- **Smooth bezier curves** that loop out to avoid sharp angles

## Implementation with React Flow

### Installation

```bash
cd apps/dashboard
pnpm add reactflow
```

### Component Structure

```
apps/dashboard/src/components/
└── workflow-builder/
    ├── AgentWorkflowBuilder.tsx   # Main container
    ├── AgentNode.tsx               # Custom node component
    ├── Toolbar.tsx                 # Template selector, export, clear
    ├── ConfigSidebar.tsx           # Agent configuration panel
    ├── templates.ts                # Org pattern templates
    └── types.ts                    # Flow node/edge types
```

### Core Implementation

#### 1. Custom Node Type

```tsx
// apps/dashboard/src/components/workflow-builder/AgentNode.tsx
import { Handle, Position } from 'reactflow';

interface AgentNodeData {
  displayName: string;
  role: string;
  department: string;
  level: 'ic' | 'lead' | 'manager' | 'vp' | 'c-suite';
  personality: string;
}

export function AgentNode({ data }: { data: AgentNodeData }) {
  const initial = data.displayName.charAt(0).toUpperCase();

  return (
    <div className="w-60 bg-slate-800 border-2 border-slate-600 rounded-lg">
      <Handle type="target" position={Position.Left} />

      <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-slate-700 to-slate-800 rounded-t-lg">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {data.displayName}
          </div>
          <div className="text-xs text-slate-400 truncate">
            {data.role}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2 text-xs">
        <div>
          <div className="text-slate-500">Department</div>
          <div className="text-slate-200">{data.department}</div>
        </div>
        <div>
          <div className="text-slate-500">Level</div>
          <div className="text-slate-200">{data.level.toUpperCase()}</div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
```

#### 2. Main Workflow Builder

```tsx
// apps/dashboard/src/components/workflow-builder/AgentWorkflowBuilder.tsx
import { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { AgentNode } from './AgentNode';
import { Toolbar } from './Toolbar';
import { ConfigSidebar } from './ConfigSidebar';
import { templates } from './templates';

const nodeTypes = {
  agent: AgentNode,
};

export function AgentWorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNode(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const loadTemplate = useCallback((templateKey: string) => {
    const template = templates[templateKey];
    if (!template) return;

    setNodes(template.nodes);
    setEdges(template.edges);
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const addAgent = useCallback(() => {
    const id = `agent-${nodes.length + 1}`;
    const newNode = {
      id,
      type: 'agent',
      position: { x: 400, y: 300 },
      data: {
        displayName: 'New Agent',
        role: 'Team Member',
        department: 'Operations',
        level: 'ic' as const,
        personality: 'You are a new agent.',
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(id);
  }, [nodes, setNodes]);

  const exportConfig = useCallback(() => {
    const config = nodes.map((node) => {
      // Find parent from edges
      const parentEdge = edges.find((e) => e.target === node.id);
      const parentNode = parentEdge
        ? nodes.find((n) => n.id === parentEdge.source)
        : null;

      const name = node.data.displayName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      return {
        name,
        displayName: node.data.displayName,
        role: node.data.role,
        department: node.data.department,
        level: node.data.level,
        reportsTo: parentNode ? parentNode.data.name : null,
        personality: node.data.personality,
      };
    });

    console.log(JSON.stringify(config, null, 2));
    // TODO: Show export modal with JSON
  }, [nodes, edges]);

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        onLoadTemplate={loadTemplate}
        onAddAgent={addAgent}
        onExport={exportConfig}
        onClear={() => {
          setNodes([]);
          setEdges([]);
          setSelectedNode(null);
        }}
      />

      <div className="flex-1 flex">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-950"
        >
          <Background color="#1e293b" gap={20} />
          <Controls />
          <MiniMap />
        </ReactFlow>

        {selectedNode && (
          <ConfigSidebar
            nodeId={selectedNode}
            nodes={nodes}
            onUpdate={(id, data) => {
              setNodes((nds) =>
                nds.map((node) =>
                  node.id === id ? { ...node, data: { ...node.data, ...data } } : node
                )
              );
            }}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
```

#### 3. Templates

```tsx
// apps/dashboard/src/components/workflow-builder/templates.ts
export const templates = {
  hierarchy: {
    nodes: [
      {
        id: '1',
        type: 'agent',
        position: { x: 400, y: 100 },
        data: {
          displayName: 'Marcus Bell',
          role: 'CEO',
          department: 'Executive',
          level: 'c-suite',
          personality: 'You are Marcus Bell, CEO of Generic Corp.\nYou coordinate strategic initiatives.',
        },
      },
      {
        id: '2',
        type: 'agent',
        position: { x: 250, y: 280 },
        data: {
          displayName: 'Sable Chen',
          role: 'Principal Engineer',
          department: 'Engineering',
          level: 'lead',
          personality: 'You are Sable Chen, Principal Engineer.\nYou design system architecture.',
        },
      },
      {
        id: '3',
        type: 'agent',
        position: { x: 550, y: 280 },
        data: {
          displayName: 'Vivian Reyes',
          role: 'VP Product',
          department: 'Product',
          level: 'vp',
          personality: 'You are Vivian Reyes, VP Product.\nYou define product strategy.',
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e1-3', source: '1', target: '3' },
    ],
  },
  // Add other templates...
};
```

#### 4. Configuration Sidebar

```tsx
// apps/dashboard/src/components/workflow-builder/ConfigSidebar.tsx
interface ConfigSidebarProps {
  nodeId: string;
  nodes: any[];
  onUpdate: (id: string, data: Partial<AgentNodeData>) => void;
  onClose: () => void;
}

export function ConfigSidebar({ nodeId, nodes, onUpdate, onClose }: ConfigSidebarProps) {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  return (
    <div className="w-96 bg-slate-900 border-l border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Agent Configuration</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xl"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">
            Display Name
          </label>
          <input
            type="text"
            value={node.data.displayName}
            onChange={(e) => onUpdate(nodeId, { displayName: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">
            Role
          </label>
          <input
            type="text"
            value={node.data.role}
            onChange={(e) => onUpdate(nodeId, { role: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">
            Department
          </label>
          <input
            type="text"
            value={node.data.department}
            onChange={(e) => onUpdate(nodeId, { department: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">
            Level
          </label>
          <select
            value={node.data.level}
            onChange={(e) => onUpdate(nodeId, { level: e.target.value })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white"
          >
            <option value="ic">IC (Individual Contributor)</option>
            <option value="lead">Lead</option>
            <option value="manager">Manager</option>
            <option value="vp">VP</option>
            <option value="c-suite">C-Suite</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">
            Personality (System Prompt)
          </label>
          <textarea
            value={node.data.personality}
            onChange={(e) => onUpdate(nodeId, { personality: e.target.value })}
            rows={8}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white font-mono resize-y"
            placeholder="You are Marcus Bell, CEO of Generic Corp..."
          />
        </div>
      </div>
    </div>
  );
}
```

### Integration into Dashboard

Add a new route in your dashboard:

```tsx
// apps/dashboard/src/App.tsx
import { AgentWorkflowBuilder } from './components/workflow-builder/AgentWorkflowBuilder';

// Add route
<Route path="/org-builder" element={<AgentWorkflowBuilder />} />
```

### Styling with Tailwind

React Flow works great with Tailwind. The examples above use Tailwind classes that match your existing design system (slate colors, similar to the dashboard).

## Next Steps

1. **Implement templates** - Create all 8 organizational patterns
2. **Export modal** - Show formatted JSON with copy button
3. **Import/Load** - Allow loading existing configurations
4. **Validation** - Check for cycles, orphaned nodes, etc.
5. **Auto-layout** - Use React Flow's layout algorithms for auto-arrangement
6. **Persistence** - Save/load from backend
7. **Agent preview** - Live preview of agent system prompt with variables interpolated

## Future Enhancements

- **Minimap** for large org charts
- **Search/filter** agents by name, department, or level
- **Bulk operations** - Select multiple nodes, group actions
- **Agent capabilities** - Tag agents with skills/capabilities
- **Load distribution** - Visualize task load across agents
- **Real-time status** - Show live agent status overlays
- **Collaboration** - Multi-user editing with WebSocket sync
- **Version history** - Track org structure changes over time
- **Templates marketplace** - Share/import community org patterns

## Resources

- [React Flow Documentation](https://reactflow.dev/)
- [React Flow Examples](https://reactflow.dev/examples)
- [React Flow Pro Examples](https://pro.reactflow.dev/examples) (advanced patterns)

# Plugin Development

Learn how to build custom plugins for Generic Corp.

## Overview

The Generic Corp plugin system allows you to extend functionality by:

- Adding new API endpoints
- Registering custom job processors
- Extending agent capabilities
- Adding UI components to the dashboard
- Integrating with external services

## Plugin Structure

A plugin is a TypeScript/JavaScript module that exports a plugin object:

```typescript
import { Plugin } from '@generic-corp/sdk';

export const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My awesome plugin',
  
  async initialize(context) {
    // Setup code
  },
  
  async shutdown() {
    // Cleanup code
  }
};
```

## Getting Started

### 1. Create Plugin Package

```bash
cd packages
mkdir my-plugin
cd my-plugin
pnpm init
```

### 2. Install Dependencies

```bash
pnpm add @generic-corp/sdk
```

### 3. Create Plugin File

Create `src/index.ts`:

```typescript
import { Plugin, PluginContext } from '@generic-corp/sdk';

export const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'Adds custom functionality',
  
  async initialize(context: PluginContext) {
    console.log('Plugin initialized');
    
    // Register routes, jobs, etc.
    context.router.get('/hello', (req, res) => {
      res.json({ message: 'Hello from plugin!' });
    });
  },
  
  async shutdown() {
    console.log('Plugin shutdown');
  }
};
```

## Plugin Context

The `PluginContext` object provides access to:

```typescript
interface PluginContext {
  // Express router for adding routes
  router: Router;
  
  // Database access via Prisma
  db: PrismaClient;
  
  // Job queue for background tasks
  queue: Queue;
  
  // Socket.io for real-time updates
  io: Server;
  
  // Configuration
  config: PluginConfig;
  
  // Logger
  logger: Logger;
}
```

## Adding API Endpoints

```typescript
async initialize(context: PluginContext) {
  const { router, db } = context;
  
  router.get('/api/my-plugin/data', async (req, res) => {
    const data = await db.myTable.findMany();
    res.json(data);
  });
  
  router.post('/api/my-plugin/action', async (req, res) => {
    const result = await performAction(req.body);
    res.json(result);
  });
}
```

## Registering Job Processors

```typescript
async initialize(context: PluginContext) {
  const { queue } = context;
  
  queue.process('my-custom-job', async (job) => {
    const { data } = job;
    
    // Process the job
    const result = await processData(data);
    
    return result;
  });
}
```

## Adding Agent Capabilities

```typescript
import { AgentCapability } from '@generic-corp/sdk';

const myCapability: AgentCapability = {
  name: 'custom-search',
  description: 'Search external data source',
  
  async execute(input: any) {
    const results = await searchExternalAPI(input.query);
    return results;
  }
};

async initialize(context: PluginContext) {
  context.registerCapability(myCapability);
}
```

## Emitting Real-time Events

```typescript
async initialize(context: PluginContext) {
  const { io } = context;
  
  // Emit to all clients
  io.emit('plugin:event', { data: 'value' });
  
  // Emit to specific room
  io.to('room-id').emit('plugin:event', { data: 'value' });
}
```

## Database Migrations

If your plugin requires database changes:

1. Create a migration file in your plugin:

```typescript
// migrations/001_create_table.ts
import { Prisma } from '@prisma/client';

export async function up(prisma: PrismaClient) {
  await prisma.$executeRaw`
    CREATE TABLE plugin_data (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function down(prisma: PrismaClient) {
  await prisma.$executeRaw`DROP TABLE plugin_data`;
}
```

2. Register migration in plugin:

```typescript
export const myPlugin: Plugin = {
  // ...
  migrations: [
    require('./migrations/001_create_table')
  ]
};
```

## Configuration

Plugins can define configuration schemas:

```typescript
export const myPlugin: Plugin = {
  name: 'my-plugin',
  
  configSchema: {
    apiKey: {
      type: 'string',
      required: true,
      description: 'API key for external service'
    },
    timeout: {
      type: 'number',
      default: 5000,
      description: 'Request timeout in ms'
    }
  },
  
  async initialize(context: PluginContext) {
    const { apiKey, timeout } = context.config;
    // Use configuration
  }
};
```

## Testing Plugins

Create tests using your preferred framework:

```typescript
import { describe, it, expect } from 'vitest';
import { myPlugin } from '../src';

describe('myPlugin', () => {
  it('should initialize successfully', async () => {
    const context = createMockContext();
    await myPlugin.initialize(context);
    expect(context.router.stack).toHaveLength(1);
  });
});
```

## Publishing Plugins

1. Build your plugin:
```bash
pnpm build
```

2. Publish to npm:
```bash
pnpm publish
```

3. Install in Generic Corp:
```bash
pnpm add @your-org/generic-corp-plugin-name
```

4. Register in `apps/server/src/plugins.ts`:
```typescript
import { myPlugin } from '@your-org/generic-corp-plugin-name';

export const plugins = [
  myPlugin,
  // ... other plugins
];
```

## Best Practices

1. **Namespace routes**: Prefix plugin routes with `/api/plugin-name/`
2. **Handle errors**: Use try-catch and return appropriate error responses
3. **Validate input**: Always validate request data
4. **Clean up resources**: Implement proper shutdown logic
5. **Document API**: Provide clear API documentation
6. **Version carefully**: Follow semantic versioning
7. **Test thoroughly**: Write comprehensive tests

## Example Plugins

See the `packages/plugins-base` directory for example implementations:

- **Slack Integration**: Send notifications to Slack
- **GitHub Integration**: Sync tasks with GitHub Issues
- **Analytics**: Custom analytics and reporting

## Next Steps

- [Architecture Guide](architecture.md)
- [API Reference](api-reference.md)
- [Plugin System Details](architecture/plugins.md)

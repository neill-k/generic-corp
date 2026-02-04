# Configuration

Configure Generic Corp for your environment.

## Environment Variables

Generic Corp uses environment variables for configuration. Create `.env` files in the respective app directories.

### Server Configuration

Location: `apps/server/.env`

```env
# Node Environment
NODE_ENV=development  # development | production | test

# Server
PORT=3000
HOST=localhost

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional in development

# Claude API
ANTHROPIC_API_KEY=your-api-key

# Security
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=7d
SESSION_SECRET=your-session-secret

# CORS
CORS_ORIGIN=http://localhost:5173  # Comma-separated for multiple

# Logging
LOG_LEVEL=debug  # error | warn | info | debug
LOG_FORMAT=json  # json | pretty

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Job Queue
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=3

# File Upload
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_DIR=./uploads
```

### Dashboard Configuration

Location: `apps/dashboard/.env`

```env
# API
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000

# Features
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=true
```

## Database Configuration

### Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]?[options]
```

### Connection Pool

Configure in `apps/server/src/db/client.ts`:

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'error', 'warn'],
});
```

### SSL Configuration

For production databases with SSL:

```env
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
```

## Redis Configuration

### Basic Configuration

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret
REDIS_DB=0
```

### Redis URL Format

Alternatively, use a single URL:

```env
REDIS_URL=redis://:password@host:6379/0
```

### Redis Cluster

For Redis Cluster:

```typescript
// apps/server/src/redis/client.ts
import { Cluster } from 'ioredis';

const cluster = new Cluster([
  { host: 'node1', port: 6379 },
  { host: 'node2', port: 6379 },
  { host: 'node3', port: 6379 },
]);
```

## Authentication

### JWT Configuration

```env
JWT_SECRET=your-very-secure-secret
JWT_EXPIRATION=7d  # 7 days
JWT_ISSUER=generic-corp
```

### Session Configuration

```typescript
// apps/server/src/auth/session.ts
export const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};
```

## CORS Configuration

### Single Origin

```env
CORS_ORIGIN=https://yourdomain.com
```

### Multiple Origins

```env
CORS_ORIGIN=https://app.yourdomain.com,https://admin.yourdomain.com
```

### Dynamic CORS

```typescript
// apps/server/src/middleware/cors.ts
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
```

## Logging Configuration

### Log Levels

- `error`: Only errors
- `warn`: Warnings and errors
- `info`: Informational messages
- `debug`: Detailed debug information

### Winston Configuration

```typescript
// apps/server/src/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.LOG_FORMAT === 'pretty'
    ? winston.format.simple()
    : winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

## Rate Limiting

Configure per-endpoint rate limits:

```typescript
// apps/server/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP',
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts',
});
```

## Job Queue Configuration

### Queue Settings

```env
QUEUE_CONCURRENCY=5
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY=5000  # milliseconds
```

### Worker Configuration

```typescript
// apps/server/src/queue/worker.ts
export const workerConfig = {
  concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
  maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '3'),
  backoff: {
    type: 'exponential',
    delay: parseInt(process.env.QUEUE_RETRY_DELAY || '5000'),
  },
};
```

## File Upload Configuration

```env
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads
ALLOWED_MIME_TYPES=image/jpeg,image/png,application/pdf
```

## Plugin Configuration

Plugins can have their own configuration:

```env
# Slack Plugin
PLUGIN_SLACK_WEBHOOK_URL=https://hooks.slack.com/...
PLUGIN_SLACK_CHANNEL=#general

# GitHub Plugin
PLUGIN_GITHUB_TOKEN=ghp_...
PLUGIN_GITHUB_ORG=your-org
```

## Production Best Practices

### Security

1. **Use strong secrets**: Generate cryptographically secure random strings
   ```bash
   openssl rand -base64 32
   ```

2. **Enable HTTPS**: Always use HTTPS in production
   ```env
   FORCE_HTTPS=true
   ```

3. **Secure cookies**:
   ```env
   COOKIE_SECURE=true
   COOKIE_HTTPONLY=true
   COOKIE_SAMESITE=strict
   ```

### Performance

1. **Connection pooling**: Optimize database connections
   ```env
   DATABASE_POOL_MIN=2
   DATABASE_POOL_MAX=10
   ```

2. **Redis caching**: Enable caching
   ```env
   CACHE_TTL=300  # 5 minutes
   ```

3. **Compression**: Enable gzip
   ```env
   ENABLE_COMPRESSION=true
   ```

## Environment-Specific Configurations

### Development

```env
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_PLAYGROUND=true
```

### Staging

```env
NODE_ENV=production
LOG_LEVEL=info
ENABLE_METRICS=true
```

### Production

```env
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_MONITORING=true
SENTRY_DSN=https://...
```

## Configuration Validation

The server validates configuration on startup:

```typescript
// apps/server/src/config/validate.ts
export function validateConfig() {
  const required = [
    'DATABASE_URL',
    'REDIS_HOST',
    'ANTHROPIC_API_KEY',
    'JWT_SECRET',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required config: ${key}`);
    }
  }
}
```

## Next Steps

- [Quick Start](quickstart.md)
- [Architecture](../architecture.md)
- [Deployment](../deployment.md)

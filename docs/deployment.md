# Deployment Guide

Guide for deploying Generic Corp to production environments.

## Overview

Generic Corp can be deployed in various configurations:

- **Single Server**: All components on one machine (development/small deployments)
- **Containerized**: Docker Compose or Kubernetes
- **Cloud Platforms**: AWS, GCP, Azure, or Vercel/Railway

## Prerequisites

- Production-ready PostgreSQL database
- Redis instance
- Node.js runtime environment
- SSL certificates (for HTTPS)
- Domain name and DNS configuration

## Environment Configuration

Create production environment file:

```bash
cp apps/server/.env.example apps/server/.env.production
```

Configure for production:

```env
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@db-host:5432/genericcorp

# Redis
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# API Keys
ANTHROPIC_API_KEY=your-production-api-key

# Server
PORT=3000
CORS_ORIGIN=https://yourdomain.com

# Security
JWT_SECRET=your-secure-jwt-secret
SESSION_SECRET=your-secure-session-secret

# Logging
LOG_LEVEL=info
```

## Docker Deployment

### Using Docker Compose

1. Build production images:

```bash
docker compose -f docker-compose.prod.yml build
```

2. Start services:

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Docker Compose Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: genericcorp
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: genericcorp
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    restart: unless-stopped

  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://genericcorp:${DB_PASSWORD}@postgres:5432/genericcorp
      REDIS_HOST: redis
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  dashboard:
    build:
      context: .
      dockerfile: apps/dashboard/Dockerfile
    ports:
      - "80:80"
    depends_on:
      - server
    restart: unless-stopped

volumes:
  postgres-data:
  redis-data:
```

## Kubernetes Deployment

See [Kubernetes configuration](deployment/kubernetes.md) for detailed K8s setup.

## Cloud Platform Deployment

### Vercel (Frontend)

Deploy the dashboard to Vercel:

```bash
cd apps/dashboard
vercel --prod
```

### Railway (Backend)

1. Connect your GitHub repository to Railway
2. Configure environment variables
3. Deploy from the `main` branch

### AWS Deployment

Components:
- **EC2**: Application servers
- **RDS**: PostgreSQL database
- **ElastiCache**: Redis cluster
- **ALB**: Load balancer
- **S3**: Static assets
- **CloudFront**: CDN

See [AWS Deployment Guide](deployment/aws.md) for details.

## Database Migration

Run migrations in production:

```bash
pnpm db:migrate deploy
```

## Build for Production

```bash
# Build all packages
pnpm build

# Test production build locally
NODE_ENV=production pnpm start
```

## Monitoring

### Health Checks

The server exposes health check endpoints:

```
GET /health          # Basic health check
GET /health/ready    # Readiness probe
GET /health/live     # Liveness probe
```

### Logging

Configure structured logging:

```typescript
// apps/server/src/logger.ts
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Metrics

Integrate with monitoring services:

- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **Sentry**: Error tracking
- **DataDog**: Application monitoring

## Security Checklist

- [ ] Enable HTTPS/TLS
- [ ] Set secure session cookies
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Database backups
- [ ] DDoS protection

## Performance Optimization

### Database
- Enable connection pooling
- Add appropriate indexes
- Regular VACUUM operations

### Redis
- Configure eviction policies
- Monitor memory usage
- Enable persistence

### Application
- Enable gzip compression
- Use CDN for static assets
- Implement caching strategies
- Optimize bundle sizes

## Scaling

### Horizontal Scaling

Run multiple server instances behind a load balancer:

```nginx
upstream generic_corp {
    server server1:3000;
    server server2:3000;
    server server3:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://generic_corp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Background Workers

Scale job processing independently:

```bash
# Start additional workers
WORKER_CONCURRENCY=10 node apps/server/dist/worker.js
```

## Backup and Recovery

### Database Backups

```bash
# Automated daily backups
pg_dump -h db-host -U user genericcorp > backup-$(date +%Y%m%d).sql
```

### Disaster Recovery

1. Regular automated backups
2. Off-site backup storage
3. Documented recovery procedures
4. Periodic recovery drills

## Troubleshooting

### Common Issues

**Database connection timeout**
- Check connection pool settings
- Verify network connectivity
- Review firewall rules

**High memory usage**
- Monitor Redis memory
- Check for memory leaks
- Review worker concurrency

**Slow response times**
- Enable query logging
- Check database indexes
- Review API performance

## Next Steps

- [Docker Deployment](deployment/docker.md)
- [Production Best Practices](deployment/production.md)
- [Monitoring Setup](deployment/monitoring.md)

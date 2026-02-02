# Generic Corp AI Agent Platform - Self-Hosted Deployment Guide

[![Docker](https://img.shields.io/badge/Docker-20.10%2B-blue)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

Deploy the Generic Corp AI Agent Orchestration Platform on your own infrastructure with full control and privacy.

## 🚀 Quick Start (5 Minutes)

### Prerequisites

- Docker 20.10+ and Docker Compose
- 4GB RAM minimum (8GB recommended)
- 20GB disk space
- Linux, macOS, or Windows with WSL2

### One-Command Deployment

```bash
# Clone the repository
git clone https://github.com/generic-corp/agent-platform.git
cd agent-platform

# Generate encryption key
export ENCRYPTION_KEY=$(openssl rand -base64 32)

# Start all services
docker-compose -f docker-compose.full.yml up -d

# Run database migrations
docker-compose -f docker-compose.full.yml exec app npx prisma migrate deploy

# Check status
docker-compose -f docker-compose.full.yml ps
```

That's it! The platform is now running at:
- **API Server:** http://localhost:3000
- **Temporal UI:** http://localhost:8080
- **Health Check:** http://localhost:3000/health

## 📋 What's Included

The self-hosted deployment includes:

- **Multi-Agent Orchestration System**: Coordinate multiple AI agents with role-based capabilities
- **Temporal Workflow Engine**: Reliable, durable task orchestration
- **PostgreSQL Database**: Persistent storage with Prisma ORM
- **Redis Queue**: BullMQ-powered job processing
- **WebSocket Server**: Real-time agent communication
- **Temporal UI**: Monitor workflows and agent activities
- **Encrypted Credential Storage**: Secure OAuth token management

## 🛠️ Detailed Setup

### Step 1: Environment Configuration

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173

# Database (using Docker service names)
DATABASE_URL=postgresql://genericcorp:genericcorp@postgres:5432/genericcorp?schema=public

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Temporal
TEMPORAL_ADDRESS=temporal:7233

# Encryption Key (REQUIRED - generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your_generated_encryption_key_here

# Optional: Anthropic API Key (if not using Claude Code)
# ANTHROPIC_API_KEY=your_api_key_here
```

### Step 2: Start Services

```bash
# Pull all images
docker-compose -f docker-compose.full.yml pull

# Start services in detached mode
docker-compose -f docker-compose.full.yml up -d

# Watch logs
docker-compose -f docker-compose.full.yml logs -f app
```

### Step 3: Initialize Database

```bash
# Run Prisma migrations
docker-compose -f docker-compose.full.yml exec app npx prisma migrate deploy

# Optional: Seed with sample agents
docker-compose -f docker-compose.full.yml exec app npm run db:seed
```

### Step 4: Verify Installation

```bash
# Check health
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":1706260800000}

# View all running services
docker-compose -f docker-compose.full.yml ps
```

## 🔒 Security Configuration

### Generate Secure Encryption Key

```bash
# Generate a strong encryption key
openssl rand -base64 32

# Add to .env file
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
```

### Production Security Checklist

- [ ] Change default PostgreSQL credentials
- [ ] Use a strong, unique encryption key
- [ ] Enable SSL/TLS for external connections
- [ ] Configure firewall rules (allow only necessary ports)
- [ ] Set up automated backups
- [ ] Use secrets management (HashiCorp Vault, AWS Secrets Manager)
- [ ] Enable audit logging
- [ ] Regular security updates

### Recommended PostgreSQL Configuration

Edit `docker-compose.full.yml`:

```yaml
postgres:
  environment:
    POSTGRES_USER: ${POSTGRES_USER:-genericcorp}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-change_this_password}
    POSTGRES_DB: ${POSTGRES_DB:-genericcorp}
```

Then create `.env`:

```bash
POSTGRES_USER=your_secure_username
POSTGRES_PASSWORD=your_secure_password_min_32_chars
POSTGRES_DB=genericcorp
```

## 📊 Monitoring & Operations

### View Logs

```bash
# All services
docker-compose -f docker-compose.full.yml logs -f

# Specific service
docker-compose -f docker-compose.full.yml logs -f app
docker-compose -f docker-compose.full.yml logs -f postgres
docker-compose -f docker-compose.full.yml logs -f temporal
```

### Access Temporal UI

Navigate to http://localhost:8080 to:
- Monitor workflow executions
- View agent task history
- Debug failed workflows
- Track performance metrics

### Database Management

```bash
# Access PostgreSQL shell
docker-compose -f docker-compose.full.yml exec postgres psql -U genericcorp -d genericcorp

# Backup database
docker-compose -f docker-compose.full.yml exec postgres pg_dump -U genericcorp genericcorp > backup.sql

# Restore database
docker-compose -f docker-compose.full.yml exec -T postgres psql -U genericcorp -d genericcorp < backup.sql
```

### Redis Management

```bash
# Access Redis CLI
docker-compose -f docker-compose.full.yml exec redis redis-cli

# Check queue depth
docker-compose -f docker-compose.full.yml exec redis redis-cli KEYS "*"

# Flush cache (WARNING: Deletes all data)
docker-compose -f docker-compose.full.yml exec redis redis-cli FLUSHALL
```

## 🔄 Updates & Maintenance

### Updating to Latest Version

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.full.yml build --no-cache
docker-compose -f docker-compose.full.yml up -d

# Run migrations
docker-compose -f docker-compose.full.yml exec app npx prisma migrate deploy
```

### Backup Strategy

#### Automated Daily Backups

Create `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/genericcorp"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker-compose -f docker-compose.full.yml exec -T postgres \
  pg_dump -U genericcorp genericcorp | \
  gzip > $BACKUP_DIR/postgres_$DATE.sql.gz

# Backup Redis
docker-compose -f docker-compose.full.yml exec redis \
  redis-cli SAVE

# Keep last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/genericcorp-backup.log 2>&1
```

## 🌐 Production Deployment

### Recommended Infrastructure

**Minimum Production Specs:**
- 2 vCPU, 8GB RAM
- 50GB SSD storage
- Ubuntu 22.04 LTS or similar

**Recommended Production Specs:**
- 4 vCPU, 16GB RAM
- 100GB SSD storage
- Load balancer (NGINX/Traefik)
- Managed PostgreSQL (RDS, Cloud SQL)
- Managed Redis (ElastiCache, Memorystore)

### SSL/TLS Configuration

Using NGINX as reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name agents.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/agents.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agents.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

### Resource Limits

Configure resource limits in `docker-compose.full.yml`:

```yaml
app:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 4G
      reservations:
        cpus: '1'
        memory: 2G
```

## 🐛 Troubleshooting

### Application Won't Start

```bash
# Check service status
docker-compose -f docker-compose.full.yml ps

# View application logs
docker-compose -f docker-compose.full.yml logs app

# Restart services
docker-compose -f docker-compose.full.yml restart
```

### Database Connection Errors

```bash
# Verify PostgreSQL is healthy
docker-compose -f docker-compose.full.yml exec postgres pg_isready -U genericcorp

# Check connection from app container
docker-compose -f docker-compose.full.yml exec app \
  node -e "require('./dist/db/index.js')"
```

### Temporal Workflow Failures

1. Access Temporal UI: http://localhost:8080
2. Navigate to "Workflows" tab
3. Find failed workflow
4. Check error details and stack trace

### High Memory Usage

```bash
# Check resource usage
docker stats

# Restart specific service
docker-compose -f docker-compose.full.yml restart app

# Clear Redis cache
docker-compose -f docker-compose.full.yml exec redis redis-cli FLUSHALL
```

### Port Conflicts

If ports are already in use, edit `docker-compose.full.yml`:

```yaml
ports:
  - "3001:3000"  # Changed from 3000:3000
```

## 📈 Scaling

### Horizontal Scaling

To run multiple application instances:

```yaml
app:
  deploy:
    replicas: 3
  # ... rest of config
```

Add load balancer (NGINX, HAProxy, or Traefik) in front.

### Database Scaling

For production workloads:
1. Use managed PostgreSQL (AWS RDS, GCP Cloud SQL)
2. Enable read replicas for read-heavy workloads
3. Configure connection pooling (PgBouncer)

## 🆘 Support & Community

- **Documentation:** https://docs.generic-corp.com
- **GitHub Issues:** https://github.com/generic-corp/agent-platform/issues
- **Discord Community:** https://discord.gg/genericcorp
- **Email Support:** support@generic-corp.com

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Contributing

We welcome contributions! See CONTRIBUTING.md for guidelines.

---

**Built with ❤️ by Generic Corp**

*Empowering teams with autonomous AI agent orchestration*

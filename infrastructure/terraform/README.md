# Generic Corp Multi-Tenant Infrastructure

This Terraform configuration deploys the complete infrastructure for Generic Corp's multi-tenant SaaS platform on AWS.

## Architecture Overview

- **VPC**: Multi-AZ network with public, private, and database subnets
- **EKS**: Kubernetes cluster with 4 node groups (system, api, worker, spot)
- **RDS**: PostgreSQL 15 with Multi-AZ for high availability
- **ElastiCache**: Redis cluster with automatic failover
- **Secrets Manager**: Secure storage for database credentials

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.0
3. **kubectl** for Kubernetes management
4. **AWS permissions** for EKS, RDS, VPC, ElastiCache

## Quick Start

### 1. Initialize Terraform

```bash
cd infrastructure/terraform
terraform init
```

### 2. Create a terraform.tfvars file

```hcl
aws_region  = "us-east-1"
environment = "production"
cluster_name = "generic-corp-saas"
db_instance_class = "db.r6g.xlarge"
```

### 3. Plan the deployment

```bash
terraform plan
```

### 4. Apply the configuration

```bash
terraform apply
```

**Note:** This will take 15-20 minutes to provision all resources.

### 5. Configure kubectl

```bash
aws eks update-kubeconfig --region us-east-1 --name generic-corp-saas
kubectl get nodes
```

## Resource Costs (Approximate Monthly)

| Resource | Type | Cost |
|----------|------|------|
| EKS Control Plane | - | $73 |
| EC2 Nodes | 10x m5.xlarge | $1,400 |
| RDS PostgreSQL | db.r6g.xlarge Multi-AZ | $650 |
| ElastiCache | 3x cache.r6g.large | $500 |
| NAT Gateway | 3x (Multi-AZ) | $100 |
| Data Transfer | Variable | $100-200 |
| **Total** | | **~$2,823/month** |

## Environments

### Staging
```hcl
environment = "staging"
db_instance_class = "db.t4g.large"
# Single NAT Gateway, no Multi-AZ
# Cost: ~$800/month
```

### Production
```hcl
environment = "production"
db_instance_class = "db.r6g.xlarge"
# Multi-AZ, enhanced monitoring
# Cost: ~$2,800/month
```

## Post-Deployment Steps

After infrastructure is provisioned:

1. **Install Kubernetes add-ons:**
   ```bash
   # Install AWS Load Balancer Controller
   kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds"

   # Install metrics server for HPA
   kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
   ```

2. **Deploy monitoring stack:**
   ```bash
   kubectl create namespace monitoring
   # Apply Prometheus, Grafana manifests (see k8s/monitoring/)
   ```

3. **Create database schemas:**
   ```bash
   # Connect to RDS
   export DB_HOST=$(terraform output -raw db_endpoint | cut -d: -f1)
   psql -h $DB_HOST -U postgres -d genericcorp

   # Run schema setup
   \i setup-tenant-schemas.sql
   ```

4. **Deploy application:**
   ```bash
   kubectl apply -f k8s/api-server/
   kubectl apply -f k8s/workers/
   ```

## State Management

### Remote State (Recommended for Teams)

Create S3 bucket for state:
```bash
aws s3 mb s3://generic-corp-terraform-state --region us-east-1
aws s3api put-bucket-versioning --bucket generic-corp-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

Then uncomment the `backend "s3"` block in `main.tf` and run:
```bash
terraform init -migrate-state
```

## Disaster Recovery

### Database Snapshots
```bash
# Manual snapshot before major changes
aws rds create-db-snapshot \
  --db-instance-identifier generic-corp-saas-postgres \
  --db-snapshot-identifier pre-migration-$(date +%Y%m%d)
```

### Restore from Snapshot
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier generic-corp-saas-postgres-restored \
  --db-snapshot-identifier <snapshot-id>
```

## Scaling

### Vertical Scaling (Database)
```hcl
# Update terraform.tfvars
db_instance_class = "db.r6g.2xlarge"

# Apply changes (will cause brief downtime for Multi-AZ)
terraform apply
```

### Horizontal Scaling (Kubernetes)
```bash
# Scale API pods
kubectl scale deployment api-server --replicas=10

# Or update HPA
kubectl autoscale deployment api-server --min=3 --max=15 --cpu-percent=70
```

## Troubleshooting

### Can't connect to EKS cluster
```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name generic-corp-saas

# Verify IAM permissions
aws sts get-caller-identity
```

### Database connection issues
```bash
# Check security group rules
aws ec2 describe-security-groups --group-ids <rds-sg-id>

# Verify from EKS node
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql -h <db-endpoint> -U postgres -d genericcorp
```

### Redis connection issues
```bash
# Check cluster status
aws elasticache describe-replication-groups \
  --replication-group-id generic-corp-saas-redis

# Test from pod
kubectl run -it --rm redis-test --image=redis:7 --restart=Never -- \
  redis-cli -h <redis-endpoint> ping
```

## Cleanup

**WARNING:** This will destroy all resources and data!

```bash
# Disable deletion protection on RDS (if enabled)
aws rds modify-db-instance \
  --db-instance-identifier generic-corp-saas-postgres \
  --no-deletion-protection

# Destroy all resources
terraform destroy
```

## Next Steps

1. Review the [infrastructure design document](../../apps/server/docs/multi-tenant-infrastructure.md)
2. Set up CI/CD pipeline for automated deployments
3. Configure monitoring and alerting
4. Implement backup and disaster recovery procedures
5. Security audit and penetration testing

## Support

For questions or issues:
- **Yuki Tanaka** (SRE) - Infrastructure and operations
- **Sable Chen** (Principal Engineer) - Architecture review
- **Marcus Bell** (CEO) - Strategic decisions

---

**Last Updated:** 2026-01-26
**Maintained By:** Yuki Tanaka

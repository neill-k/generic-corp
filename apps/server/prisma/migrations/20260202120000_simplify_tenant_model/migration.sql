-- Remove billing/SaaS fields from tenants table
-- adminEmail is NOT NULL, must make nullable before dropping
ALTER TABLE "tenants" ALTER COLUMN "admin_email" DROP NOT NULL;
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "plan_tier",
  DROP COLUMN IF EXISTS "allowed_domains",
  DROP COLUMN IF EXISTS "api_key_hash",
  DROP COLUMN IF EXISTS "max_agents",
  DROP COLUMN IF EXISTS "max_tasks_per_month",
  DROP COLUMN IF EXISTS "storage_limit_gb",
  DROP COLUMN IF EXISTS "stripe_customer_id",
  DROP COLUMN IF EXISTS "stripe_subscription_id",
  DROP COLUMN IF EXISTS "admin_email";

-- Add displayName field
ALTER TABLE "tenants" ADD COLUMN "display_name" TEXT NOT NULL DEFAULT '';

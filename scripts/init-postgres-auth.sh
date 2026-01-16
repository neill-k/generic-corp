#!/bin/bash
# Initialize PostgreSQL authentication for external connections
# This script fixes pg_hba.conf to allow connections from Docker host

set -e

echo "Configuring PostgreSQL authentication..."

# Wait for PostgreSQL to be ready
until docker exec generic-corp-postgres pg_isready -U genericcorp > /dev/null 2>&1; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 1
done

# Configure pg_hba.conf to allow external connections with md5 authentication
docker exec generic-corp-postgres sh << 'EOF'
# Remove any existing entries for 0.0.0.0/0
sed -i '/^host.*all.*all.*0\.0\.0\.0\/0/d' /var/lib/postgresql/data/pg_hba.conf

# Add md5 authentication for external connections (Docker host)
echo "host    all             all             0.0.0.0/0               md5" >> /var/lib/postgresql/data/pg_hba.conf

# Also add trust for Docker network range (172.x.x.x)
echo "host    all             all             172.0.0.0/8               trust" >> /var/lib/postgresql/data/pg_hba.conf
EOF

# Reload PostgreSQL configuration
docker exec generic-corp-postgres psql -U genericcorp -d genericcorp -c "SELECT pg_reload_conf();" > /dev/null

# Verify password is set
docker exec generic-corp-postgres psql -U genericcorp -d genericcorp -c "ALTER USER genericcorp WITH PASSWORD 'genericcorp';" > /dev/null

echo "PostgreSQL authentication configured successfully!"
echo "You can now connect using: psql -h localhost -U genericcorp -d genericcorp"

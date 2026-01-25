-- Create Temporal database user and databases
-- This script runs on PostgreSQL container startup

CREATE USER temporal WITH PASSWORD 'temporal';
CREATE DATABASE temporal OWNER temporal;
CREATE DATABASE temporal_visibility OWNER temporal;
GRANT ALL PRIVILEGES ON DATABASE temporal TO temporal;
GRANT ALL PRIVILEGES ON DATABASE temporal_visibility TO temporal;

-- Create Temporal database user and databases
-- This runs on PostgreSQL initialization

DO $$
BEGIN
    -- Create temporal user if not exists
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'temporal') THEN
        CREATE USER temporal WITH PASSWORD 'temporal';
    END IF;
END
$$;

-- Create temporal databases
CREATE DATABASE temporal OWNER temporal;
CREATE DATABASE temporal_visibility OWNER temporal;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE temporal TO temporal;
GRANT ALL PRIVILEGES ON DATABASE temporal_visibility TO temporal;

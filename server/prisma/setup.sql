-- DevSync PostgreSQL Database and User Setup Script
-- Run this if the DevSync database or user role does not yet exist.
-- Safe to run: checks if role/database exist before creating.

DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE rolname = 'devsync') THEN
      CREATE ROLE devsync WITH LOGIN PASSWORD 'devsync' CREATEDB;
   END IF;
END
$do$;

-- Create database if not exists (run as postgres superuser if needed)
SELECT 'CREATE DATABASE devsync OWNER devsync'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'devsync')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE devsync TO devsync;
\connect devsync
GRANT ALL ON SCHEMA public TO devsync;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO devsync;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO devsync;

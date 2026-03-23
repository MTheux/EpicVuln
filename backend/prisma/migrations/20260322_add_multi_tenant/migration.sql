-- Create organizations table
CREATE TABLE IF NOT EXISTS "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "description" TEXT,
    "logo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- Add organization_id to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add organization_id to vulnerabilities
ALTER TABLE "vulnerabilities" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;
ALTER TABLE "vulnerabilities" ADD CONSTRAINT "vulnerabilities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add organization_id to assets
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;
ALTER TABLE "assets" ADD CONSTRAINT "assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create default CredSystem organization and assign existing data
INSERT INTO "organizations" ("id", "name", "sector", "description", "updated_at")
VALUES ('org-credsystem-default', 'CredSystem', 'Financeiro', 'Administradora de cartoes de credito para o varejo', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Assign existing users (admin) to CredSystem org
UPDATE "users" SET "organization_id" = 'org-credsystem-default' WHERE "organization_id" IS NULL AND "email" LIKE '%credsystem%';

-- Assign existing vulnerabilities to CredSystem org
UPDATE "vulnerabilities" SET "organization_id" = 'org-credsystem-default' WHERE "organization_id" IS NULL;

-- Assign existing assets to CredSystem org
UPDATE "assets" SET "organization_id" = 'org-credsystem-default' WHERE "organization_id" IS NULL;

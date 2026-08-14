-- Rename Role enum value SIMPLE -> PERSONAL
ALTER TYPE "Role" RENAME VALUE 'SIMPLE' TO 'PERSONAL';

-- Update default for users.role to match
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'PERSONAL';

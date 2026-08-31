-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'member';

-- Backfill: the earliest doctor of each clinic becomes its admin.
UPDATE "Doctor" d SET "role" = 'admin'
WHERE d."clinicId" IS NOT NULL
  AND d."id" = (
    SELECT id FROM "Doctor"
    WHERE "clinicId" = d."clinicId"
    ORDER BY "createdAt" ASC, "id" ASC
    LIMIT 1
  );

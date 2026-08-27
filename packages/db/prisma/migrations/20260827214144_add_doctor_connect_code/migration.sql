-- Doctor.connectCode: add nullable, backfill existing rows with a random 6-char
-- code, then enforce NOT NULL + unique.
ALTER TABLE "Doctor" ADD COLUMN "connectCode" TEXT;

UPDATE "Doctor"
SET "connectCode" = upper(substr(md5(random()::text || id), 1, 6))
WHERE "connectCode" IS NULL;

ALTER TABLE "Doctor" ALTER COLUMN "connectCode" SET NOT NULL;

CREATE UNIQUE INDEX "Doctor_connectCode_key" ON "Doctor"("connectCode");

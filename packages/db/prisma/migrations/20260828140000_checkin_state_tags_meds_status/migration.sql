-- CheckIn: add state tags (JSON array) and widen medsTaken to a status string.

ALTER TABLE "CheckIn" ADD COLUMN "stateTags" TEXT;

ALTER TABLE "CheckIn" RENAME COLUMN "medsTaken" TO "medsStatus";

ALTER TABLE "CheckIn" ALTER COLUMN "medsStatus" TYPE TEXT
  USING (
    CASE
      WHEN "medsStatus" IS TRUE THEN 'yes'
      WHEN "medsStatus" IS FALSE THEN 'no'
      ELSE NULL
    END
  );

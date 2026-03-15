-- Run this if you use raw SQL updates instead of Prisma migrate.
-- Creates table for configurable visa document checklist (Settings -> Чек-лист визы).

CREATE TABLE IF NOT EXISTS "VisaChecklistTemplate" (
  "id" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "VisaChecklistTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VisaChecklistTemplate_countryCode_code_key"
  ON "VisaChecklistTemplate"("countryCode", "code");

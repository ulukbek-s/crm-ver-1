-- Add columns that exist in Prisma schema but may be missing in DB
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT;
ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "countryId" TEXT;
ALTER TABLE "Program" DROP CONSTRAINT IF EXISTS "Program_countryId_fkey";
ALTER TABLE "Program" ADD CONSTRAINT "Program_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Vacancy.programId (required for creating vacancies)
ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "programId" TEXT;
ALTER TABLE "Vacancy" DROP CONSTRAINT IF EXISTS "Vacancy_programId_fkey";
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

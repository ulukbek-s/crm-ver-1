# Миграция БД для обновлений CRM

После обновления схемы Prisma выполните миграцию. Новые поля:

1. **VacancyCandidate**: `contractDocumentId` (UUID, nullable), `contractSentAt` (timestamp, nullable)
2. **Candidate**: `telegramUsername` (string, nullable)
3. **Document**: связь с VacancyCandidate для контракта (relation)
4. **Program**: `countryId` (TEXT, nullable) — программы привязаны к стране

В корне проекта выполните (интерактивно):

```bash
npx prisma migrate dev --schema=packages/database/prisma/schema.prisma --name add_employer_contract_telegram_and_program_country
```

Либо вручную в PostgreSQL:

```sql
-- VacancyCandidate: контракт от работодателя
ALTER TABLE "VacancyCandidate" ADD COLUMN IF NOT EXISTS "contractDocumentId" TEXT;
ALTER TABLE "VacancyCandidate" ADD COLUMN IF NOT EXISTS "contractSentAt" TIMESTAMP(3);
ALTER TABLE "VacancyCandidate" ADD CONSTRAINT "VacancyCandidate_contractDocumentId_fkey"
  FOREIGN KEY ("contractDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Candidate: Telegram для связи
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT;

-- Program: привязка к стране (филиал остаётся независимым)
ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "countryId" TEXT;
ALTER TABLE "Program" ADD CONSTRAINT "Program_countryId_fkey"
  FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

После миграции: `npx prisma generate --schema=packages/database/prisma/schema.prisma`

-- Inregistrarea cere acum datele de care are nevoie o platforma de rezervari:
-- profil de jucator pentru conturile Personal, date de firma pentru Business.

CREATE TYPE "SkillLevel" AS ENUM ('INCEPATOR', 'MEDIU', 'AVANSAT', 'COMPETITIV');
CREATE TYPE "PreferredTime" AS ENUM ('DIMINEATA', 'PRANZ', 'DUPA_AMIAZA', 'SEARA', 'WEEKEND');

ALTER TABLE "users" ADD COLUMN "birthDate" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "skillLevel" "SkillLevel";
ALTER TABLE "users" ADD COLUMN "preferredTimes" "PreferredTime"[] DEFAULT ARRAY[]::"PreferredTime"[];
ALTER TABLE "users" ADD COLUMN "companyName" TEXT;
ALTER TABLE "users" ADD COLUMN "taxId" TEXT;
ALTER TABLE "users" ADD COLUMN "website" TEXT;
ALTER TABLE "users" ADD COLUMN "address" TEXT;
ALTER TABLE "users" ADD COLUMN "acceptedTermsAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;

-- Conturile existente au acceptat termenii la inregistrare, doar ca pe atunci
-- nu notam momentul. Fara linia asta ar parea ca nu i-a acceptat nimeni.
UPDATE "users" SET "acceptedTermsAt" = "createdAt" WHERE "acceptedTermsAt" IS NULL;

CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    -- Amprenta, nu tokenul: din baza de date nu se poate reconstrui linkul.
    "tokenHash" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

ALTER TABLE "password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

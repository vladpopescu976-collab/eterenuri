-- Confirmarea adresei de email dupa inregistrare.

-- Datele cerute in pasul 2 al formularului de inregistrare.
ALTER TABLE "users" ADD COLUMN "city" TEXT;
ALTER TABLE "users" ADD COLUMN "sports" "SportType"[] DEFAULT ARRAY[]::"SportType"[];

CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    -- Amprenta tokenului, nu tokenul: din baza de date nu se poate reconstrui
    -- linkul de confirmare al nimanui.
    "tokenHash" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_verification_tokens_tokenHash_key"
    ON "email_verification_tokens"("tokenHash");
CREATE INDEX "email_verification_tokens_userId_idx"
    ON "email_verification_tokens"("userId");

ALTER TABLE "email_verification_tokens"
    ADD CONSTRAINT "email_verification_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Conturile existente sunt dinainte de aceasta regula. Fara linia asta,
-- autentificarea le-ar refuza pe toate, inclusiv conturile de business care
-- au deja terenuri publicate.
UPDATE "users" SET "emailVerified" = CURRENT_TIMESTAMP WHERE "emailVerified" IS NULL;

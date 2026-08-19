-- Inregistrarea unui cont Business cerea codul fiscal si adresa sediului.
-- Sunt date de facturare, nu de deschidere a contului: le scoatem din formular
-- si din tabel. Nu exista niciun rand cu ele completate.
ALTER TABLE "users" DROP COLUMN "taxId";
ALTER TABLE "users" DROP COLUMN "address";

-- Cautarea dupa oras se facea cu "contains", care ignora majusculele dar nu si
-- diacriticele: "Timisoara" nu gasea "Timișoara". Tinem separat o forma fara
-- diacritice si cu litere mici, dupa care cautam exact.
ALTER TABLE "fields" ADD COLUMN "cityKey" TEXT NOT NULL DEFAULT '';

-- Umplem coloana pentru terenurile existente. unaccent nu e garantat instalat,
-- asa ca inlocuim explicit literele romanesti.
UPDATE "fields" SET "cityKey" = btrim(lower(
  translate("city",
    'ăâîșşțţĂÂÎȘŞȚŢ',
    'aaissttAAISSTT')
));

DROP INDEX IF EXISTS "fields_city_idx";
CREATE INDEX "fields_cityKey_idx" ON "fields"("cityKey");

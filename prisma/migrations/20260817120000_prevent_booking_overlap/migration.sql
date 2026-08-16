-- Doi clienti pot apasa "Rezerva" in aceeasi secunda pentru acelasi interval.
-- O verificare facuta in cod (citeste, apoi scrie) nu poate opri asta: ambele
-- cereri citesc "liber" inainte ca vreuna sa scrie. Singurul loc unde regula
-- chiar tine este baza de date.
--
-- Constrangerea de mai jos face imposibila existenta a doua rezervari active
-- (PENDING sau CONFIRMED) care se suprapun pe acelasi teren. A doua scriere
-- primeste eroare, indiferent cate cereri vin simultan.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (
    "fieldId" WITH =,
    tsrange("startTime", "endTime", '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));

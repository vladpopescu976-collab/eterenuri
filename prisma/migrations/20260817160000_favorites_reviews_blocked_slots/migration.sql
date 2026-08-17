-- Terenuri favorite
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "favorites_userId_fieldId_key" ON "favorites"("userId", "fieldId");
CREATE INDEX "favorites_userId_idx" ON "favorites"("userId");

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_fieldId_fkey"
    FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recenzii, legate de o rezervare incheiata
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "ownerReply" TEXT,
    "ownerReplyAt" TIMESTAMP(3),
    "bookingId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");
CREATE INDEX "reviews_fieldId_idx" ON "reviews"("fieldId");
CREATE INDEX "reviews_authorId_idx" ON "reviews"("authorId");

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_fieldId_fkey"
    FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ore blocate manual de proprietar (mentenanta, rezervari telefonice)
CREATE TABLE "blocked_slots" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blocked_slots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "blocked_slots_fieldId_idx" ON "blocked_slots"("fieldId");

ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_fieldId_fkey"
    FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_valid_range"
    CHECK ("endTime" > "startTime");

-- Doua blocari nu se pot suprapune pe acelasi teren (garantie prin index,
-- deci rezista si la cereri simultane).
ALTER TABLE "blocked_slots"
  ADD CONSTRAINT "blocked_slots_no_overlap"
  EXCLUDE USING gist (
    "fieldId" WITH =,
    tsrange("startTime", "endTime", '[)') WITH &&
  );

-- O ora blocata si o rezervare activa nu pot coexista pe acelasi interval.
-- Constrangerea EXCLUDE nu poate acoperi doua tabele, asa ca folosim triggere.
-- Codul aplicatiei ia in plus un lock pe teren, ca verificarea sa fie corecta
-- si cand doua cereri vin in acelasi timp.
CREATE OR REPLACE FUNCTION "booking_not_on_blocked_slot"() RETURNS trigger AS $$
BEGIN
  IF NEW."status" IN ('PENDING', 'CONFIRMED') AND EXISTS (
    SELECT 1 FROM "blocked_slots" b
    WHERE b."fieldId" = NEW."fieldId"
      AND b."startTime" < NEW."endTime"
      AND b."endTime" > NEW."startTime"
  ) THEN
    RAISE EXCEPTION 'BOOKING_ON_BLOCKED_SLOT' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "bookings_check_blocked_slots"
  BEFORE INSERT OR UPDATE ON "bookings"
  FOR EACH ROW EXECUTE FUNCTION "booking_not_on_blocked_slot"();

CREATE OR REPLACE FUNCTION "blocked_slot_not_on_booking"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "bookings" bk
    WHERE bk."fieldId" = NEW."fieldId"
      AND bk."status" IN ('PENDING', 'CONFIRMED')
      AND bk."startTime" < NEW."endTime"
      AND bk."endTime" > NEW."startTime"
  ) THEN
    RAISE EXCEPTION 'BLOCKED_SLOT_ON_BOOKING' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "blocked_slots_check_bookings"
  BEFORE INSERT OR UPDATE ON "blocked_slots"
  FOR EACH ROW EXECUTE FUNCTION "blocked_slot_not_on_booking"();

-- Nimic nu limita incercarile de autentificare: se putea incerca parola la
-- nesfarsit. Numaram esecurile pe (email + IP) intr-o fereastra de timp.
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "cheie" TEXT NOT NULL,
    "incercari" INTEGER NOT NULL DEFAULT 0,
    "primaEroare" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaEroare" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "login_attempts_cheie_key" ON "login_attempts"("cheie");

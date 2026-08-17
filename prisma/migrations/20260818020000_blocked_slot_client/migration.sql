-- O rezervare primita la telefon ocupa terenul exact ca o blocare, doar ca are
-- un client. Cu numele completat, intervalul e o rezervare manuala; fara el,
-- ramane o blocare obisnuita (mentenanta, eveniment propriu).
ALTER TABLE "blocked_slots" ADD COLUMN "clientName" TEXT;
ALTER TABLE "blocked_slots" ADD COLUMN "clientPhone" TEXT;

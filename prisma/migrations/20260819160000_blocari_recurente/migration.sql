-- Blocarile care se repeta („in fiecare luni, 20-21”) se scriu ca randuri
-- obisnuite, cate unul pentru fiecare aparitie. Asa raman valabile toate
-- verificarile care exista deja: constrangerea de suprapunere, calendarul si
-- disponibilitatea nu trebuie sa stie nimic despre repetare. Id-ul de serie
-- leaga randurile intre ele, ca sa poata fi sterse toate odata.
ALTER TABLE "blocked_slots" ADD COLUMN "serieId" TEXT;
CREATE INDEX "blocked_slots_serieId_idx" ON "blocked_slots"("serieId");

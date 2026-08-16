import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { FeaturedFields } from "@/components/featured-fields";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s,
// ceea ce facea ca autentificarea sa esueze mereu dupa o pauza.
export const maxDuration = 60;

// Lista de terenuri se citeste din baza de date la fiecare cerere.
// Fara asta pagina era generata static la build si terenurile adaugate
// ulterior nu mai apareau niciodata.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedFields />
      <HowItWorks />
    </>
  );
}

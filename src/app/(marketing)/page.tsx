import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { FeaturedFields } from "@/components/featured-fields";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedFields />
      <HowItWorks />
    </>
  );
}

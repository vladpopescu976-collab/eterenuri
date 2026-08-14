"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeroSearch } from "@/components/hero-search";

const headingLine1 = "Rezervă un teren sportiv";
const headingLine2 = "în câteva secunde";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.035 },
  },
};

const word = {
  hidden: { opacity: 0, y: 18, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function AnimatedLine({ text }: { text: string }) {
  return (
    <motion.span variants={container} initial="hidden" animate="show" className="inline-block">
      {text.split(" ").map((w, i) => (
        <motion.span key={i} variants={word} className="inline-block whitespace-pre">
          {w}
          {i < text.split(" ").length - 1 ? " " : ""}
        </motion.span>
      ))}
    </motion.span>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] bg-size-[32px_32px] opacity-40" />
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 left-1/4 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 right-1/4 h-[24rem] w-[24rem] rounded-full bg-primary/10 blur-3xl"
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 text-center sm:pt-32">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm"
        >
          <span className="flex h-2 w-2 rounded-full bg-primary" />
          Peste tot în România
        </motion.div>

        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
          <AnimatedLine text={headingLine1} />
          <br />
          <span className="text-primary">
            <AnimatedLine text={headingLine2} />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground"
        >
          Fotbal, baschet, tenis și multe altele — găsește terenul potrivit lângă tine
          și trimite o cerere de rezervare instant.
        </motion.p>

        <div className="mt-10">
          <HeroSearch />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-6 flex items-center justify-center"
        >
          <Button
            variant="link"
            className="text-muted-foreground"
            nativeButton={false}
            render={<Link href="/autentificare?tip=business" />}
          >
            Ești proprietar de teren? Adaugă-l gratuit
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { CalendarCheck, MapPinned, Search } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Caută un teren",
    description: "Filtrează după sport, oraș și dată pentru a găsi terenul potrivit.",
  },
  {
    icon: CalendarCheck,
    title: "Trimite o cerere",
    description: "Alege un interval orar disponibil și trimite cererea de rezervare.",
  },
  {
    icon: MapPinned,
    title: "Joacă",
    description: "Primești confirmarea de la proprietar și te prezinți la teren.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Cum funcționează</h2>
          <p className="mt-2 text-muted-foreground">
            Trei pași simpli între tine și următorul meci.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] as const }}
              className="relative flex flex-col items-center rounded-2xl border bg-card p-8 text-center"
            >
              <span className="absolute -top-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <step.icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
              </div>
              <p className="mt-5 font-semibold">{step.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PAGINI, listaPagini } from "@/lib/pagini";

export const maxDuration = 60;

export function generateStaticParams() {
  return listaPagini().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pagina = PAGINI[slug];
  return { title: pagina ? `${pagina.titlu} — Scorer` : "Scorer" };
}

export default async function PaginaStatica({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pagina = PAGINI[slug];
  if (!pagina) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{pagina.titlu}</h1>
      {pagina.actualizat && (
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ultima actualizare: {pagina.actualizat}
        </p>
      )}

      <div className="mt-8 space-y-8">
        {pagina.sectiuni.map((sectiune) => (
          <section key={sectiune.titlu}>
            <h2 className="text-lg font-semibold">{sectiune.titlu}</h2>
            <div className="mt-2 space-y-3">
              {sectiune.paragrafe.map((text, i) => (
                <p key={i} className="text-[15px] leading-relaxed text-muted-foreground">
                  {text}
                </p>
              ))}
              {sectiune.lista && (
                <ul className="mt-2 space-y-1.5">
                  {sectiune.lista.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-[15px] leading-relaxed text-muted-foreground"
                    >
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

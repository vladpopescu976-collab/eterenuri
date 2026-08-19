import Link from "next/link";
import { Mail } from "lucide-react";

const columns = [
  {
    title: "Platformă",
    links: [
      { href: "/#terenuri", label: "Caută terenuri" },
      { href: "/autentificare?tip=business", label: "Adaugă-ți terenul" },
      { href: "/autentificare", label: "Autentificare" },
    ],
  },
  {
    title: "Companie",
    links: [
      { href: "/pagini/despre-noi", label: "Despre noi" },
      { href: "/pagini/contact", label: "Contact" },
          ],
  },
  {
    title: "Legal",
    links: [
      { href: "/pagini/termeni-si-conditii", label: "Termeni și condiții" },
      { href: "/pagini/politica-de-confidentialitate", label: "Politica de confidențialitate" },
      { href: "/pagini/politica-cookie-uri", label: "Politica cookie-uri" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                E
              </span>
              <span className="text-lg font-semibold tracking-tight">Scorer</span>
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              Platforma prin care găsești și rezervi terenuri sportive rapid, sau îți
              administrezi propriile terenuri.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a
                href="mailto:contact@scorer.ro"
                aria-label="Email"
                className="flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title} className="space-y-3">
              <p className="text-sm font-semibold">{column.title}</p>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Scorer. Toate drepturile rezervate.</p>
          <p>Făcut cu grijă pentru comunitatea sportivă din România.</p>
        </div>
      </div>
    </footer>
  );
}

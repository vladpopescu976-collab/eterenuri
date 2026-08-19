import Link from "next/link";
import { ChevronRight, User, Building2, Eye } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const options = [
  {
    href: "/autentificare?tip=personal",
    icon: User,
    title: "Cont Personal",
    description: "Caută și rezervă terenuri sportive pentru tine sau prietenii tăi.",
  },
  {
    href: "/autentificare?tip=business",
    icon: Building2,
    title: "Cont Business",
    description: "Administrează-ți terenurile și cererile de rezervare primite.",
  },
];

export function AuthChooser() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Bine ai venit pe Scorer</h1>
        <p className="text-muted-foreground">
          Alege tipul de cont pentru a continua cu autentificarea sau înregistrarea.
        </p>
      </div>

      <div className="space-y-3">
        {options.map((option) => (
          <Link key={option.href} href={option.href} className="block">
            <Card className="flex flex-row items-center gap-4 p-4 transition-colors hover:border-primary hover:bg-accent/50">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <option.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="font-medium leading-none">{option.title}</p>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">sau</span>
        <Separator className="flex-1" />
      </div>

      <Button variant="outline" className="w-full" nativeButton={false} render={<Link href="/" />}>
        <Eye className="h-4 w-4" />
        Continuă ca vizitator
      </Button>
    </div>
  );
}

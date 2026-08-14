import { Phone, TriangleAlert } from "lucide-react";

type UrgentBooking = {
  id: string;
  createdAt: Date;
  startTime: Date;
  customer: { name: string; phone: string | null };
  field: { name: string; contactPhone: string | null };
};

function minutesAgo(date: Date) {
  return Math.round((Date.now() - date.getTime()) / 60000);
}

export function UrgentBookingsAlert({ bookings, ownerPhone }: { bookings: UrgentBooking[]; ownerPhone: string | null }) {
  if (bookings.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
          <TriangleAlert className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
            {bookings.length === 1
              ? "O cerere așteaptă răspuns de peste o oră"
              : `${bookings.length} cereri așteaptă răspuns de peste o oră`}
          </p>
          <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-400/80">
            Clienții nu au primit încă un răspuns — sună-i ca să eviți o rezervare pierdută.
          </p>

          <ul className="mt-3 space-y-2">
            {bookings.map((b) => {
              const phone = b.field.contactPhone || ownerPhone;
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm dark:bg-black/20"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-amber-950 dark:text-amber-200">
                      {b.customer.name} · {b.field.name}
                    </p>
                    <p className="text-xs text-amber-800/70 dark:text-amber-400/70">
                      cerută acum {minutesAgo(b.createdAt)} min
                    </p>
                  </div>
                  {phone ? (
                    <a
                      href={`tel:${phone}`}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Sună la {phone}
                    </a>
                  ) : (
                    <span className="shrink-0 text-xs text-amber-800/60 dark:text-amber-400/60">
                      Fără număr de contact
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

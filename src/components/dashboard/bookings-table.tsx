"use client";

import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Clock3, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { RescheduleDialog } from "@/components/dashboard/reschedule-dialog";
import { approveBooking, rejectBooking } from "@/lib/actions/business";
import { bookingStatusLabel } from "@/lib/status";
import type { BookingStatus } from "@prisma/client";

type Row = {
  id: string;
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  customer: { name: string; phone: string | null };
  field: { id: string; name: string };
};

const FILTERS: (BookingStatus | "ALL")[] = ["ALL", "PENDING", "CONFIRMED", "REJECTED", "RESCHEDULE_PROPOSED"];

function fmtDate(d: Date) {
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}
function toTimeInput(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function BookingsTable({ bookings, fields }: { bookings: Row[]; fields: { id: string; name: string }[] }) {
  const [filter, setFilter] = useState<BookingStatus | "ALL">("ALL");
  const [fieldFilter, setFieldFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [rescheduling, setRescheduling] = useState<Row | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => {
        if (filter !== "ALL" && b.status !== filter) return false;
        if (fieldFilter !== "ALL" && b.field.id !== fieldFilter) return false;
        if (query && !b.customer.name.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }, [bookings, filter, fieldFilter, query]);

  function handleApprove(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        await approveBooking(id);
        toast.success("Rezervare aprobată.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "A apărut o eroare.");
      } finally {
        setPendingId(null);
      }
    });
  }

  function handleReject(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        await rejectBooking(id);
        toast.success("Rezervare respinsă.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "A apărut o eroare.");
      } finally {
        setPendingId(null);
      }
    });
  }

  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-[20px] font-semibold">Gestionare rezervări</h1>
          <p className="text-[13px] text-muted-foreground">
            {bookings.length} în total · {pendingCount} necesită răspuns
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Caută după client…" className="pl-9" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors " +
              (filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground")
            }
          >
            {f === "ALL" ? "Toate" : bookingStatusLabel[f]}
          </button>
        ))}
        <select
          value={fieldFilter}
          onChange={(e) => setFieldFilter(e.target.value)}
          className="ml-auto rounded-lg border bg-background px-3 py-1.5 text-[12.5px] focus:border-primary focus:outline-none"
        >
          <option value="ALL">Toate terenurile</option>
          {fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-background shadow-sm">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b text-[11.5px] uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 font-medium">Teren</th>
              <th className="px-5 py-3 font-medium">Dată &amp; oră</th>
              <th className="px-5 py-3 font-medium">Preț</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {filtered.map((b) => (
                <motion.tr
                  key={b.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-b text-[13.5px] last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium">{b.customer.name}</p>
                    <p className="text-[11.5px] text-muted-foreground">{b.customer.phone ?? "—"}</p>
                  </td>
                  <td className="px-5 py-3.5">{b.field.name}</td>
                  <td className="px-5 py-3.5">
                    <p>{fmtDate(b.startTime)}</p>
                    <p className="font-mono text-[11.5px] text-muted-foreground tabular-nums">
                      {fmtTime(b.startTime)} – {fmtTime(b.endTime)}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 font-mono tabular-nums">{b.totalPrice.toFixed(0)} RON</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {b.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            disabled={isPending && pendingId === b.id}
                            onClick={() => handleApprove(b.id)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] font-medium text-emerald-700 hover:brightness-95 disabled:opacity-50 dark:bg-emerald-500/10 dark:text-emerald-400"
                          >
                            <Check className="h-3.5 w-3.5" /> Aprobă
                          </button>
                          <button
                            type="button"
                            disabled={isPending && pendingId === b.id}
                            onClick={() => handleReject(b.id)}
                            className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[12px] font-medium text-rose-700 hover:brightness-95 disabled:opacity-50 dark:bg-rose-500/10 dark:text-rose-400"
                          >
                            <X className="h-3.5 w-3.5" /> Respinge
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setRescheduling(b)}
                        title="Mută rezervarea la altă dată/oră"
                        className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1.5 text-[12px] font-medium hover:bg-muted/70"
                      >
                        <Clock3 className="h-3.5 w-3.5" />
                        <span className="hidden lg:inline">Mută ora</span>
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[13.5px] font-medium">Nicio rezervare găsită</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">Încearcă alt filtru sau altă căutare.</p>
          </div>
        )}
      </div>

      {rescheduling && (
        <RescheduleDialog
          bookingId={rescheduling.id}
          clientName={rescheduling.customer.name}
          fieldName={rescheduling.field.name}
          defaultDate={toDateInput(rescheduling.startTime)}
          defaultStart={toTimeInput(rescheduling.startTime)}
          defaultEnd={toTimeInput(rescheduling.endTime)}
          open={!!rescheduling}
          onOpenChange={(open) => !open && setRescheduling(null)}
        />
      )}
    </div>
  );
}

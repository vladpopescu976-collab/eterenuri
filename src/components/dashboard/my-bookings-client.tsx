"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { MapPin, Check, X, CalendarClock, Ban } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { EditBookingDialog } from "@/components/edit-booking-dialog";
import { acceptReschedule, cancelBooking, declineReschedule } from "@/lib/actions/bookings";
import type { BookingStatus } from "@prisma/client";

type Booking = {
  id: string;
  status: BookingStatus;
  startTime: Date;
  endTime: Date;
  proposedStartTime: Date | null;
  proposedEndTime: Date | null;
  rescheduleNote: string | null;
  totalPrice: number;
  field: { id: string; name: string; city: string; openingHour: number; closingHour: number };
};

function fmtDateTime(d: Date) {
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}

function BookingRow({ booking }: { booking: Booking }) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  // O rezervare poate fi modificată sau anulată cât timp e încă activă și nu
  // s-a consumat. Cele respinse, anulate sau trecute rămân doar în istoric.
  const isOver = booking.endTime < new Date();
  const canManage =
    !isOver && booking.status !== "CANCELLED" && booking.status !== "REJECTED";

  function cancel() {
    if (!confirm("Sigur anulezi această rezervare? Orele vor redeveni libere pentru alți clienți.")) {
      return;
    }
    startTransition(async () => {
      const result = await cancelBooking(booking.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Rezervarea a fost anulată.");
    });
  }

  function accept() {
    startTransition(async () => {
      const result = await acceptReschedule(booking.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Noua oră a fost acceptată.");
    });
  }

  function decline() {
    startTransition(async () => {
      const result = await declineReschedule(booking.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Mutarea a fost refuzată.");
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-[15px] font-semibold">{booking.field.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {booking.field.city}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <p className="mt-3 text-[13.5px]">
        {fmtDateTime(booking.startTime)} · {fmtTime(booking.startTime)}–{fmtTime(booking.endTime)}
      </p>
      <p className="mt-1 font-mono text-[13px] tabular-nums text-muted-foreground">
        {booking.totalPrice.toFixed(0)} RON
      </p>

      {booking.status === "RESCHEDULE_PROPOSED" && booking.proposedStartTime && booking.proposedEndTime && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
          <p className="text-[12.5px] font-medium text-blue-700 dark:text-blue-400">
            Proprietarul a propus o nouă oră
          </p>
          <p className="mt-1 text-[13.5px] text-blue-900 dark:text-blue-300">
            {fmtDateTime(booking.proposedStartTime)} · {fmtTime(booking.proposedStartTime)}–{fmtTime(booking.proposedEndTime)}
          </p>
          {booking.rescheduleNote && (
            <p className="mt-1 text-[12.5px] text-blue-700/80 dark:text-blue-400/80">{booking.rescheduleNote}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={accept}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> Acceptă noua oră
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={decline}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-300 px-3 py-2 text-[12.5px] font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
            >
              <X className="h-3.5 w-3.5" /> Refuză
            </button>
          </div>
        </div>
      )}

      {canManage && (
        <div className="mt-4 flex gap-2 border-t pt-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setEditOpen(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Modifică rezervarea
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={cancel}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
          >
            <Ban className="h-3.5 w-3.5" />
            Anulează
          </button>
        </div>
      )}

      {canManage && (
        <EditBookingDialog
          bookingId={booking.id}
          fieldId={booking.field.id}
          fieldName={booking.field.name}
          openingHour={booking.field.openingHour}
          closingHour={booking.field.closingHour}
          currentStart={booking.startTime}
          currentEnd={booking.endTime}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </motion.div>
  );
}

export function MyBookingsClient({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center">
        <p className="text-[14px] font-medium">Nu ai nicio rezervare încă</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Caută un teren și trimite prima ta cerere de rezervare.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {bookings.map((b) => (
        <BookingRow key={b.id} booking={b} />
      ))}
    </div>
  );
}

import type { BookingStatus } from "@prisma/client";

export const bookingStatusLabel: Record<BookingStatus, string> = {
  PENDING: "În așteptare",
  CONFIRMED: "Confirmat",
  REJECTED: "Respins",
  RESCHEDULE_PROPOSED: "Mutare propusă",
  CANCELLED: "Anulată",
};

export const bookingStatusTone: Record<BookingStatus, "success" | "warning" | "critical" | "info" | "muted"> = {
  PENDING: "warning",
  CONFIRMED: "success",
  REJECTED: "critical",
  RESCHEDULE_PROPOSED: "info",
  CANCELLED: "muted",
};

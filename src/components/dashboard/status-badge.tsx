import { cn } from "@/lib/utils";
import { bookingStatusLabel, bookingStatusTone } from "@/lib/status";
import type { BookingStatus } from "@prisma/client";

const TONE_CLASSES: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  critical: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  muted: "bg-muted text-muted-foreground",
};

const DOT_CLASSES: Record<string, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
  info: "bg-blue-500",
  muted: "bg-muted-foreground",
};

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const tone = bookingStatusTone[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
        TONE_CLASSES[tone],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_CLASSES[tone])} />
      {bookingStatusLabel[status]}
    </span>
  );
}

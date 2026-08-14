import {
  CircleDot,
  Dumbbell,
  Goal,
  Target,
  Trophy,
  Volleyball,
  type LucideIcon,
} from "lucide-react";
import type { SportType } from "@prisma/client";

export const sportMeta: Record<SportType, { label: string; icon: LucideIcon }> = {
  FOOTBALL: { label: "Fotbal", icon: Goal },
  BASKETBALL: { label: "Baschet", icon: CircleDot },
  TENNIS: { label: "Tenis", icon: Target },
  VOLLEYBALL: { label: "Volei", icon: Volleyball },
  HANDBALL: { label: "Handbal", icon: Goal },
  PADEL: { label: "Padel", icon: Target },
  BADMINTON: { label: "Badminton", icon: Trophy },
  OTHER: { label: "Altele", icon: Dumbbell },
};

export const sportOptions = Object.entries(sportMeta).map(([value, meta]) => ({
  value: value as SportType,
  label: meta.label,
}));

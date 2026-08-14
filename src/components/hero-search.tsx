"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ro } from "date-fns/locale";
import { format } from "date-fns";
import { CalendarIcon, MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sportOptions } from "@/lib/sports";

export function HeroSearch() {
  const router = useRouter();
  const [sport, setSport] = useState<string>("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (sport) params.set("sport", sport);
    if (city) params.set("oras", city);
    if (date) params.set("data", format(date, "yyyy-MM-dd"));
    router.push(`/cauta-terenuri${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
      className="mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-2xl border bg-card/80 p-2 shadow-xl shadow-black/5 backdrop-blur-md sm:flex-row sm:items-center sm:rounded-full"
    >
      <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 sm:rounded-full">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Select value={sport} onValueChange={(value) => setSport(value ?? "")}>
          <SelectTrigger className="w-full border-0 bg-transparent p-0 shadow-none focus-visible:ring-0">
            <SelectValue placeholder="Sport" />
          </SelectTrigger>
          <SelectContent>
            {sportOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden h-8 w-px bg-border sm:block" />

      <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 sm:rounded-full">
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Oraș sau zonă"
          className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="hidden h-8 w-px bg-border sm:block" />

      <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm sm:rounded-full"
            />
          }
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={date ? "text-foreground" : "text-muted-foreground"}>
            {date ? format(date, "d MMMM yyyy", { locale: ro }) : "Data"}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(value) => {
              setDate(value);
              setDatePopoverOpen(false);
            }}
            locale={ro}
            disabled={{ before: new Date() }}
          />
        </PopoverContent>
      </Popover>

      <motion.div whileTap={{ scale: 0.97 }} className="sm:shrink-0">
        <Button type="submit" size="lg" className="w-full rounded-full sm:w-auto">
          <Search className="h-4 w-4" />
          Caută
        </Button>
      </motion.div>
    </motion.form>
  );
}

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, CalendarCheck2, Timer, Gauge } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import { computeKpis, revenueSeries, hoursBySport, type AnalyticsBooking, type AnalyticsField } from "@/lib/analytics";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function KpiCard({ icon: Icon, label, value, hint }: { icon: typeof Wallet; label: string; value: string; hint: string }) {
  return (
    <motion.div variants={item}>
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" strokeWidth={2} />
            </div>
          </div>
          <p className="mt-3 font-heading text-[26px] font-semibold tracking-tight tabular-nums">{value}</p>
          <p className="mt-2 text-[12.5px] text-muted-foreground">{hint}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

type SimpleTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: readonly { value?: string | number | readonly (string | number)[]; payload?: unknown }[];
};

function ChartTooltip({ active, payload, label }: SimpleTooltipProps) {
  const entry = payload?.[0];
  if (!active || !entry || entry.value == null) return null;
  const rezervari = (entry.payload as { rezervari?: number } | undefined)?.rezervari ?? 0;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
      <p className="text-[11.5px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-[13.5px] font-semibold tabular-nums">
        {Number(entry.value).toLocaleString("ro-RO")} RON
      </p>
      <p className="text-[11px] text-muted-foreground">{rezervari} rezervări</p>
    </div>
  );
}

export function OverviewClient({ bookings, fields }: { bookings: AnalyticsBooking[]; fields: AnalyticsField[] }) {
  const [range, setRange] = useState(14);

  const kpis = useMemo(() => computeKpis(bookings, fields), [bookings, fields]);
  const chartData = useMemo(() => revenueSeries(bookings, range), [bookings, range]);
  const sportData = useMemo(() => hoursBySport(bookings, fields), [bookings, fields]);
  const maxShare = Math.max(1, ...sportData.map((s) => s.ore));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Încasări estimate (luna curentă)"
          value={`${kpis.monthRevenue.toLocaleString("ro-RO")} RON`}
          hint="din rezervări confirmate"
        />
        <KpiCard icon={CalendarCheck2} label="Total rezervări" value={kpis.totalBookings.toString()} hint="toate statusurile" />
        <KpiCard
          icon={Timer}
          label="Ore ocupate"
          value={`${Math.round(kpis.occupiedHours * 10) / 10} h`}
          hint="confirmate, total"
        />
        <KpiCard icon={Gauge} label="Rata de ocupare" value={`${kpis.occupancyRate}%`} hint="ultimele 7 zile" />
      </div>

      <motion.div variants={item}>
        <Card className="shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-heading text-[15.5px] font-semibold">Încasări estimate</h3>
                <p className="text-[12.5px] text-muted-foreground">Rezervări confirmate, ultimele {range} zile</p>
              </div>
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {[7, 14].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={
                      "rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors " +
                      (range === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {r} zile
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 6" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11.5, fill: "var(--muted-foreground)" }}
                    interval={range > 10 ? 1 : 0}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11.5, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => `${v} RON`}
                    width={72}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--primary)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                  <Area
                    type="monotone"
                    dataKey="venit"
                    stroke="var(--primary)"
                    strokeWidth={2.25}
                    fill="url(#revenueFill)"
                    activeDot={{ r: 4.5, stroke: "var(--background)", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-heading text-[15.5px] font-semibold">Ore rezervate pe sport</h3>
            <p className="text-[12.5px] text-muted-foreground">Rezervări confirmate</p>
            {sportData.length === 0 ? (
              <div className="flex h-[160px] items-center justify-center text-[12.5px] text-muted-foreground">
                Nicio rezervare confirmată încă.
              </div>
            ) : (
              <div className="mt-5 h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sportData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="sport"
                      tickLine={false}
                      axisLine={false}
                      width={64}
                      tick={{ fontSize: 12.5, fill: "var(--foreground)" }}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--muted)" }}
                      content={({ active, payload }: SimpleTooltipProps) =>
                        active && payload?.[0]?.value != null ? (
                          <div className="rounded-xl border bg-popover px-3 py-2 shadow-lg">
                            <p className="font-mono text-[13px] font-semibold tabular-nums">{payload[0].value} ore</p>
                          </div>
                        ) : null
                      }
                    />
                    <Bar dataKey="ore" radius={[0, 6, 6, 0]} maxBarSize={18}>
                      {sportData.map((entry) => (
                        <Cell key={entry.sport} fill="var(--primary)" fillOpacity={0.35 + (entry.ore / maxShare) * 0.65} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

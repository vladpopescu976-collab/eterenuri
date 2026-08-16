"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ExternalLink, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { FieldFormDialog, type EditableField } from "@/components/dashboard/field-form-dialog";
import { updateField, removeField } from "@/lib/actions/business";
import { sportMeta } from "@/lib/sports";

type Field = EditableField;

function FieldCard({
  field,
  existingPhones,
}: {
  field: Field;
  existingPhones: { name: string; contactPhone: string }[];
}) {
  const [draft, setDraft] = useState(field);
  const [prevField, setPrevField] = useState(field);
  const [saved, setSaved] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (field !== prevField) {
    setPrevField(field);
    setDraft(field);
  }

  const dirty =
    draft.pricePerHour !== field.pricePerHour ||
    draft.openingHour !== field.openingHour ||
    draft.closingHour !== field.closingHour ||
    draft.isActive !== field.isActive ||
    draft.contactPhone !== field.contactPhone;

  function save() {
    if (!draft.contactPhone?.trim()) {
      toast.error("Adaugă un număr de telefon de contact.");
      return;
    }
    startTransition(async () => {
      const result = await updateField({
        fieldId: draft.id,
        pricePerHour: draft.pricePerHour,
        openingHour: draft.openingHour,
        closingHour: draft.closingHour,
        isActive: draft.isActive,
        contactPhone: draft.contactPhone!.trim(),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    });
  }

  function remove() {
    if (!confirm(`Sigur elimini „${field.name}”? Toate rezervările asociate vor fi șterse.`)) return;
    startTransition(async () => {
      const result = await removeField(field.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Teren eliminat.");
    });
  }

  const Icon = sportMeta[draft.sportType].icon;

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading text-[15px] font-semibold">{draft.name}</p>
            <p className="text-[12.5px] text-muted-foreground">
              {sportMeta[draft.sportType].label} · {draft.city}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[11.5px] font-medium transition-colors hover:border-primary hover:text-primary"
              >
                <Pencil className="h-3 w-3" />
                Modifică
              </button>
              <Link
                href={`/terenuri/${field.id}`}
                className="flex items-center gap-1 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                Vezi pagina publică
              </Link>
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <span className="text-[11.5px] font-medium text-muted-foreground">{draft.isActive ? "Activ" : "Inactiv"}</span>
          <span
            role="switch"
            aria-checked={draft.isActive}
            onClick={() => setDraft((d) => ({ ...d, isActive: !d.isActive }))}
            className={"relative h-5 w-9 shrink-0 rounded-full transition-colors " + (draft.isActive ? "bg-primary" : "bg-muted")}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow"
              style={{ left: draft.isActive ? 18 : 2 }}
            />
          </span>
        </label>
      </div>

      <div className="mt-4">
        <label className="text-[11.5px] font-medium text-muted-foreground">Telefon de contact</label>
        <Input
          type="tel"
          value={draft.contactPhone ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, contactPhone: e.target.value }))}
          placeholder="07xx xxx xxx"
          className="mt-1"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11.5px] font-medium text-muted-foreground">Preț / oră</label>
          <div className="mt-1 flex items-center rounded-lg border focus-within:border-primary">
            <input
              type="number"
              value={draft.pricePerHour}
              onChange={(e) => setDraft((d) => ({ ...d, pricePerHour: Number(e.target.value) }))}
              className="w-full rounded-l-lg bg-transparent px-3 py-2 text-[13.5px] tabular-nums focus:outline-none"
            />
            <span className="pr-3 text-[12px] text-muted-foreground">RON</span>
          </div>
        </div>

        <div>
          <label className="text-[11.5px] font-medium text-muted-foreground">Deschidere</label>
          <Input
            type="number"
            min={0}
            max={23}
            value={draft.openingHour}
            onChange={(e) => setDraft((d) => ({ ...d, openingHour: Number(e.target.value) }))}
            className="mt-1 tabular-nums"
          />
        </div>

        <div>
          <label className="text-[11.5px] font-medium text-muted-foreground">Închidere</label>
          <Input
            type="number"
            min={1}
            max={24}
            value={draft.closingHour}
            onChange={(e) => setDraft((d) => ({ ...d, closingHour: Number(e.target.value) }))}
            className="mt-1 tabular-nums"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={save}
            disabled={(!dirty && !saved) || isPending}
            className={
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors " +
              (saved
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : dirty
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground")
            }
          >
            <Save className="h-3.5 w-3.5" />
            {saved ? "Salvat" : "Salvează"}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            title="Elimină terenul"
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border text-muted-foreground hover:border-destructive/40 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <FieldFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        field={field}
        existingPhones={existingPhones}
      />
    </motion.div>
  );
}

export function FieldSettingsClient({ fields }: { fields: Field[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const existingPhones = fields
    .filter((f): f is Field & { contactPhone: string } => !!f.contactPhone)
    .map((f) => ({ name: f.name, contactPhone: f.contactPhone }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-[20px] font-semibold">Terenurile tale</h1>
          <p className="text-[13px] text-muted-foreground">
            {fields.filter((f) => f.isActive).length} active din {fields.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Adaugă teren
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <p className="text-[13.5px] font-medium">Niciun teren adăugat</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">Adaugă primul tău teren pentru a începe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AnimatePresence>
            {fields.map((field) => (
              <FieldCard key={field.id} field={field} existingPhones={existingPhones} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <FieldFormDialog open={addOpen} onOpenChange={setAddOpen} existingPhones={existingPhones} />
    </div>
  );
}

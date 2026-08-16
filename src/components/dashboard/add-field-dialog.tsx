"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ImagePlus, Link2, Loader2, X } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addField } from "@/lib/actions/business";
import { sportOptions } from "@/lib/sports";
import { MAX_FIELD_IMAGES, fieldSchema } from "@/lib/validations/field";
import type { SportType } from "@prisma/client";

const empty = {
  name: "",
  sportType: sportOptions[0].value as SportType,
  city: "",
  address: "",
  price: "",
  open: "8",
  close: "22",
  contactPhone: "",
  description: "",
  amenities: "",
};

const MAX_IMAGES = MAX_FIELD_IMAGES;

// Platforma taie cererile mai mari de ~4,5 MB înainte să ajungă la codul
// nostru, iar răspunsul ei nu e JSON. Trimitem pozele una câte una și
// verificăm dimensiunea din timp, ca mesajul să rămână inteligibil.
const MAX_FILE_BYTES = 4 * 1024 * 1024;

function formatMB(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const AMENITY_SUGGESTIONS = ["Nocturnă", "Vestiare", "Dușuri", "Parcare", "Acoperit", "Echipament inclus"];

function splitList(value: string, separator: RegExp) {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

type ExistingFieldPhone = { name: string; contactPhone: string };

export function AddFieldDialog({
  open,
  onOpenChange,
  existingPhones = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPhones?: ExistingFieldPhone[];
}) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [images, setImages] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addLink() {
    const value = linkInput.trim();
    if (!value) return;
    if (!/^https?:\/\//i.test(value)) {
      setError("Linkul trebuie să înceapă cu http:// sau https://");
      return;
    }
    if (images.length >= MAX_IMAGES) {
      setError(`Poți adăuga maximum ${MAX_IMAGES} poze.`);
      return;
    }
    setError("");
    setImages((prev) => [...prev, value]);
    setLinkInput("");
  }

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`Poți adăuga maximum ${MAX_IMAGES} poze.`);
      return;
    }

    setError("");
    setUploading(true);
    try {
      for (const file of Array.from(fileList).slice(0, remaining)) {
        if (file.size > MAX_FILE_BYTES) {
          setError(
            `Poza „${file.name}” are ${formatMB(file.size)}. Limita este de ${formatMB(MAX_FILE_BYTES)} per poză — micșoreaz-o și încearcă din nou.`
          );
          return;
        }

        const body = new FormData();
        body.append("files", file);

        const response = await fetch("/api/upload", { method: "POST", body });

        // Când cererea e oprită de platformă (poză prea mare) răspunsul e o
        // pagină HTML, nu JSON, iar `response.json()` arunca o eroare seacă.
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          if (response.status === 413) {
            setError(`Poza „${file.name}” este prea mare. Încearcă una sub ${formatMB(MAX_FILE_BYTES)}.`);
          } else {
            setError(data?.error ?? `Încărcarea pozei „${file.name}” a eșuat (cod ${response.status}).`);
          }
          return;
        }

        const urls: unknown = data?.urls;
        if (!Array.isArray(urls) || urls.length === 0) {
          setError("Serverul nu a returnat poza încărcată. Încearcă din nou.");
          return;
        }
        setImages((prev) => [...prev, ...(urls as string[])]);
      }
    } catch {
      setError("Încărcarea a eșuat. Verifică conexiunea și încearcă din nou.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload = {
      name: form.name.trim(),
      sportType: form.sportType,
      city: form.city.trim(),
      address: form.address.trim(),
      pricePerHour: Number(form.price),
      openingHour: Number(form.open),
      closingHour: Number(form.close),
      contactPhone: form.contactPhone.trim(),
      description: form.description.trim() || undefined,
      amenities: splitList(form.amenities, /,/),
      images,
    };

    // Verificăm cu exact aceleași reguli ca serverul, ca greșelile obișnuite
    // (telefon scris aiurea, oră de închidere mai mică decât cea de
    // deschidere) să apară instant, cu mesajul lor adevărat.
    const parsed = fieldSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Completează corect toate câmpurile obligatorii.");
      return;
    }

    startTransition(async () => {
      const result = await addField(parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Terenul a fost adăugat.");
      setForm(empty);
      setImages([]);
      setLinkInput("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adaugă un teren nou</DialogTitle>
          <DialogDescription>Terenul va apărea imediat în lista ta și va putea primi rezervări.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="field-name">Nume teren</Label>
            <Input
              id="field-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="ex. Arena Sud Fotbal"
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sport</Label>
              <Select value={form.sportType} onValueChange={(v) => v && set("sportType", v as SportType)}>
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sportOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="field-city">Oraș</Label>
              <Input id="field-city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="ex. București" className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label htmlFor="field-address">Adresă</Label>
            <Input
              id="field-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="ex. Str. Sportivilor 12"
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="field-price">Preț / oră</Label>
              <Input
                id="field-price"
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="100"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="field-open">Deschidere</Label>
              <Input
                id="field-open"
                type="number"
                min="0"
                max="23"
                value={form.open}
                onChange={(e) => set("open", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="field-close">Închidere</Label>
              <Input
                id="field-close"
                type="number"
                min="1"
                max="24"
                value={form.close}
                onChange={(e) => set("close", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="field-phone">Telefon de contact</Label>
              {existingPhones.length > 0 && (
                <Select
                  value=""
                  onValueChange={(v) => {
                    const match = existingPhones.find((p) => p.contactPhone === v);
                    if (match) set("contactPhone", match.contactPhone);
                  }}
                >
                  <SelectTrigger className="h-6 w-auto border-none px-1.5 text-xs text-muted-foreground shadow-none hover:text-foreground">
                    <SelectValue placeholder="Folosește numărul altui teren" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingPhones.map((p) => (
                      <SelectItem key={p.name} value={p.contactPhone}>
                        {p.name} · {p.contactPhone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Input
              id="field-phone"
              type="tel"
              value={form.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
              placeholder="07xx xxx xxx"
              className="mt-1.5"
            />
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              Vei fi anunțat să suni clientul dacă o cerere rămâne neconfirmată peste o oră.
            </p>
          </div>

          <div>
            <Label htmlFor="field-description">Descriere (opțional)</Label>
            <Textarea
              id="field-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="ex. Teren cu gazon sintetic de ultimă generație, nocturnă inclusă."
              rows={2}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="field-amenities">Facilități (opțional)</Label>
            <Input
              id="field-amenities"
              value={form.amenities}
              onChange={(e) => set("amenities", e.target.value)}
              placeholder="Nocturnă, Vestiare, Parcare"
              className="mt-1.5"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {AMENITY_SUGGESTIONS.map((suggestion) => {
                const current = splitList(form.amenities, /,/);
                const isSelected = current.includes(suggestion);
                return (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() =>
                      set(
                        "amenities",
                        (isSelected
                          ? current.filter((item) => item !== suggestion)
                          : [...current, suggestion]
                        ).join(", ")
                      )
                    }
                    className={
                      "rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors " +
                      (isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground")
                    }
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Poze (opțional)</Label>

            {images.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {images.map((src, index) => (
                  <div
                    key={src}
                    className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                  >
                    <Image
                      src={src}
                      alt={`Poza ${index + 1}`}
                      fill
                      sizes="120px"
                      className="object-cover"
                      unoptimized
                    />
                    {index === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        Principală
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={`Elimină poza ${index + 1}`}
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || images.length >= MAX_IMAGES}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2.5 text-[12.5px] font-medium transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {uploading ? "Se încarcă…" : "Încarcă poze"}
              </button>

              <div className="flex items-center gap-1.5 rounded-lg border px-2 focus-within:border-primary">
                <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLink();
                    }
                  }}
                  onBlur={addLink}
                  placeholder="sau lipește un link"
                  disabled={images.length >= MAX_IMAGES}
                  className="border-0 px-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              hidden
              onChange={(e) => uploadFiles(e.target.files)}
            />

            <p className="mt-1.5 text-[11.5px] text-muted-foreground">
              Poți încărca fișiere de pe calculator sau adăuga linkuri. Maximum {MAX_IMAGES} poze,
              {" "}{formatMB(MAX_FILE_BYTES)} fiecare. Prima poză devine imaginea principală.
            </p>
          </div>

          {error && <p className="text-[12.5px] text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Anulează
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? "Se adaugă…" : "Adaugă terenul"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

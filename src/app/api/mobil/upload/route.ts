import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { cereBusiness, eroare, eroareNeasteptata, raspuns } from "@/lib/api/raspuns";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  isStorageConfigured,
  storageBucket,
  storageClient,
} from "@/lib/storage";

export const maxDuration = 60;

/**
 * Încărcarea pozelor din aplicație. Aceeași logică ca pe web, doar că
 * autentificarea se face cu tokenul Bearer, nu cu cookie de sesiune.
 */
export async function POST(request: Request) {
  try {
    const { eroare: refuz, sesiune } = await cereBusiness(request);
    if (refuz) return refuz;

    if (!isStorageConfigured || !storageClient) {
      return eroare(
        "Încărcarea pozelor nu este configurată pe server. Folosește deocamdată un link.",
        503
      );
    }

    const formData = await request.formData();
    const fisiere = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (fisiere.length === 0) return eroare("Nu ai trimis nicio poză.");
    if (fisiere.length > 6) return eroare("Poți încărca maximum 6 poze.");

    const adrese: string[] = [];

    for (const fisier of fisiere) {
      const extensie = ALLOWED_IMAGE_TYPES[fisier.type];
      if (!extensie) {
        return eroare(`Format neacceptat: ${fisier.name}. Folosește JPG, PNG, WEBP sau AVIF.`);
      }
      if (fisier.size > MAX_UPLOAD_BYTES) {
        return eroare(`Poza „${fisier.name}” depășește limita de 4 MB.`);
      }

      const cheie = `terenuri/${sesiune.userId}/${randomUUID()}.${extensie}`;

      try {
        await storageClient.send(
          new PutObjectCommand({
            Bucket: storageBucket,
            Key: cheie,
            Body: Buffer.from(await fisier.arrayBuffer()),
            ContentType: fisier.type,
            CacheControl: "public, max-age=31536000, immutable",
          })
        );
      } catch (err) {
        const cauza = err instanceof Error ? err.name : "UnknownError";
        console.error("Eroare la scrierea pozei in bucket:", cauza, err);
        const credentialeGresite =
          cauza === "InvalidAccessKeyId" ||
          cauza === "SignatureDoesNotMatch" ||
          cauza === "AccessDenied";
        return eroare(
          credentialeGresite
            ? "Storage-ul a respins cheile de acces. Verifică setările serverului."
            : "Poza nu a putut fi salvată. Încearcă din nou.",
          502
        );
      }

      // Bucket-ul e privat — pozele se servesc prin /api/poze/<cheie>.
      adrese.push(`/api/poze/${cheie}`);
    }

    return raspuns({ poze: adrese }, 201);
  } catch (error) {
    return eroareNeasteptata("mobil-upload", error);
  }
}

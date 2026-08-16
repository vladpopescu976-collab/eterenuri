import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { auth } from "@/auth";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  isStorageConfigured,
  storageBucket,
  storageClient,
} from "@/lib/storage";

// Baza Prisma Postgres se suspenda cand e inactiva, iar prima cerere
// care o trezeste poate dura ~30s. Implicit Vercel taie functia la 10s,
// ceea ce facea ca autentificarea sa esueze mereu dupa o pauza.
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "BUSINESS") {
    return NextResponse.json(
      { error: "Trebuie să fii autentificat cu un cont Business." },
      { status: 401 }
    );
  }

  if (!isStorageConfigured || !storageClient) {
    return NextResponse.json(
      { error: "Încărcarea pozelor nu este configurată. Folosește deocamdată un link." },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "Nu ai selectat nicio poză." }, { status: 400 });
  }
  if (files.length > 6) {
    return NextResponse.json({ error: "Poți încărca maximum 6 poze." }, { status: 400 });
  }

  const urls: string[] = [];

  for (const file of files) {
    const extension = ALLOWED_IMAGE_TYPES[file.type];
    if (!extension) {
      return NextResponse.json(
        { error: `Format neacceptat: ${file.name}. Folosește JPG, PNG, WEBP sau AVIF.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Poza „${file.name}” depășește 5 MB.` },
        { status: 400 }
      );
    }

    const key = `terenuri/${session.user.id}/${randomUUID()}.${extension}`;
    const body = Buffer.from(await file.arrayBuffer());

    await storageClient.send(
      new PutObjectCommand({
        Bucket: storageBucket,
        Key: key,
        Body: body,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    // Bucket-ul e privat — pozele se servesc prin /api/poze/<key>.
    urls.push(`/api/poze/${key}`);
  }

  return NextResponse.json({ urls });
}

import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";

import { isStorageConfigured, storageBucket, storageClient } from "@/lib/storage";

// Bucket-ul este privat, deci pozele încărcate sunt servite prin acest proxy.
// Cheile sunt generate de noi (terenuri/<userId>/<uuid>.<ext>), iar prefixul
// este verificat mai jos ca să nu poată fi cerut alt conținut din bucket.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: segments } = await params;
  const key = segments.join("/");

  if (!key.startsWith("terenuri/") || key.includes("..")) {
    return NextResponse.json({ error: "Resursă invalidă." }, { status: 400 });
  }

  if (!isStorageConfigured || !storageClient) {
    return NextResponse.json({ error: "Storage neconfigurat." }, { status: 503 });
  }

  try {
    const object = await storageClient.send(
      new GetObjectCommand({ Bucket: storageBucket, Key: key })
    );

    if (!object.Body) {
      return NextResponse.json({ error: "Poza nu a fost găsită." }, { status: 404 });
    }

    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": object.ContentType ?? "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(object.ContentLength ? { "Content-Length": String(object.ContentLength) } : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: "Poza nu a fost găsită." }, { status: 404 });
  }
}

#!/usr/bin/env bash
# Next.js standalone output tracing does not bundle @next/swc-* native
# binaries. Prisma Compute builds locally (on this machine) and runs the
# result on a linux/x64 container, so without this the runtime falls back
# to an on-demand SWC download that fails (no /bin/sh in that container).
# This copies a prefetched linux-x64-gnu binary into the standalone bundle
# when present; it's a no-op elsewhere (e.g. plain local dev builds).
set -e

SRC="node_modules/@next/swc-linux-x64-gnu"
DEST=".next/standalone/node_modules/@next/swc-linux-x64-gnu"

if [ -d "$SRC" ] && [ -d ".next/standalone" ]; then
  mkdir -p "$DEST"
  cp -R "$SRC/." "$DEST/"
  echo "copy-linux-swc: bundled @next/swc-linux-x64-gnu into standalone output"
fi

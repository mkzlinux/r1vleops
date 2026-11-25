#!/usr/bin/env bash
# Exports the Godot ops campus to public/ops-app/ (served by Next.js at /ops-app/, embedded at /ops).
# Downloads the Godot editor and web export templates on first run into .cache/godot/.
set -euo pipefail

GODOT_VERSION="${GODOT_VERSION:-4.5.1}"
CACHE_DIR="${CACHE_DIR:-$(pwd)/.cache/godot}"
BASE_URL="https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}-stable"
EDITOR_ZIP="Godot_v${GODOT_VERSION}-stable_linux.x86_64.zip"
TEMPLATES="Godot_v${GODOT_VERSION}-stable_export_templates.tpz"
GODOT_BIN="${CACHE_DIR}/Godot_v${GODOT_VERSION}-stable_linux.x86_64"
TEMPLATE_DIR="${HOME}/.local/share/godot/export_templates/${GODOT_VERSION}.stable"
OUT_DIR="public/ops-app"

mkdir -p "${CACHE_DIR}"
if [ ! -x "${GODOT_BIN}" ]; then
  echo "Downloading Godot ${GODOT_VERSION}…"
  curl -fsSL "${BASE_URL}/${EDITOR_ZIP}" -o "${CACHE_DIR}/${EDITOR_ZIP}"
  unzip -oq "${CACHE_DIR}/${EDITOR_ZIP}" -d "${CACHE_DIR}"
  chmod +x "${GODOT_BIN}"
fi
if [ ! -f "${TEMPLATE_DIR}/web_nothreads_release.zip" ]; then
  echo "Downloading web export templates…"
  curl -fsSL "${BASE_URL}/${TEMPLATES}" -o "${CACHE_DIR}/${TEMPLATES}"
  mkdir -p "${TEMPLATE_DIR}"
  unzip -oq "${CACHE_DIR}/${TEMPLATES}" 'templates/web_nothreads_*' 'templates/version.txt' -d "${CACHE_DIR}/tpl"
  cp "${CACHE_DIR}"/tpl/templates/* "${TEMPLATE_DIR}/"
fi

npx -y tsx@4.20.6 scripts/gen-godot-demo.ts
mkdir -p "${OUT_DIR}"
find "${OUT_DIR}" -mindepth 1 -delete
"${GODOT_BIN}" --headless --path godot --import >/dev/null 2>&1 || true
"${GODOT_BIN}" --headless --path godot --export-release "Web" "../${OUT_DIR}/index.html"
echo "Exported to ${OUT_DIR}/"

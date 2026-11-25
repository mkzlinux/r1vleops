#!/usr/bin/env bash
# Runs the Godot headless tests. Requires the editor binary that scripts/export-godot.sh downloads.
set -euo pipefail
GODOT_VERSION="${GODOT_VERSION:-4.5.1}"
GODOT_BIN="${GODOT_BIN:-$(pwd)/.cache/godot/Godot_v${GODOT_VERSION}-stable_linux.x86_64}"
npx -y tsx@4.20.6 scripts/gen-godot-demo.ts
"${GODOT_BIN}" --headless --path godot --import >/dev/null 2>&1 || true
"${GODOT_BIN}" --headless --path godot res://tests/test_runner.tscn

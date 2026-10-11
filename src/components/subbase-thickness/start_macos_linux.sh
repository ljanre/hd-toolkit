#!/usr/bin/env sh
set -eu
app_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
app_file="$app_dir/dist/index.html"
if command -v open >/dev/null 2>&1; then
  open "$app_file"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$app_file"
else
  printf 'Open this file in your browser:\n%s\n' "$app_file"
fi

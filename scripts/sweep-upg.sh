#!/usr/bin/env bash
set -euo pipefail
export npm_config_prefix="${HOME}/.npm-global"
export PATH="${HOME}/.npm-global/bin:${PATH}"
BASE_DIR="${1:-output/generated-seeds}"
shift || true
SEEDS=("${@:-7 13 21 34}")
mkdir -p "$BASE_DIR"
for s in ${SEEDS[@]}; do
  upg seed "$s" --archetype cli --runtime node --database none --name "mps-seed-$s" --force -o "$BASE_DIR/cli-$s" || true
  upg seed "$s" --archetype library --runtime node --database none --name "mps-lib-$s" --force -o "$BASE_DIR/lib-$s" || true
done
find "$BASE_DIR" -maxdepth 2 -type f -name package.json | sort

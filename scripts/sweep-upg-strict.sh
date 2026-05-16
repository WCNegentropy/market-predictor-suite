#!/usr/bin/env bash
set -euo pipefail
export npm_config_prefix="${HOME}/.npm-global"
export PATH="${HOME}/.npm-global/bin:${PATH}"
BASE_DIR="${1:-output/generated-seeds-strict}"
shift || true
SEEDS=("${@:-7 13 21 34 42 55}")
LANGS=(javascript typescript)
ARCHS=(cli library)
mkdir -p "$BASE_DIR"
for lang in "${LANGS[@]}"; do
  for arch in "${ARCHS[@]}"; do
    for s in ${SEEDS[@]}; do
      upg seed "$s" --archetype "$arch" --language "$lang" --runtime node --database none --name "mps-${arch}-${lang}-${s}" --force -o "$BASE_DIR/${arch}-${lang}-${s}" || true
    done
  done
done
find "$BASE_DIR" -type f -name package.json | sort

#!/bin/zsh
cd "${0:A:h}"
NODE_BIN="$(command -v node 2>/dev/null || true)"
if [[ -z "$NODE_BIN" ]]; then
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node; do
    if [[ -x "$candidate" ]]; then NODE_BIN="$candidate"; break; fi
  done
fi
if [[ -z "$NODE_BIN" ]]; then echo '未找到 Node.js'; exit 1; fi
"$NODE_BIN" platform/launch.mjs --stop

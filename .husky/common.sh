#!/usr/bin/env sh

find_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    command -v pnpm
    return 0
  fi

  for candidate in \
    "$HOME/.nvm/versions/node"/*/bin/pnpm \
    "/usr/local/bin/pnpm" \
    "/opt/homebrew/bin/pnpm"
  do
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

PNPM_CMD="$(find_pnpm)" || {
  echo "husky - pnpm not found. Please install pnpm or update PATH."
  exit 1
}

exec "$PNPM_CMD" "$@"

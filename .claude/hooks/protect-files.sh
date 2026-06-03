#!/usr/bin/env bash
# PreToolUse hook for Edit|MultiEdit|Write. Block writes to sensitive paths.
# Exit 2 = block (stderr surfaced to Claude). Exit 0 = allow.

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Strip leading ./ for cleaner matching
FILE="${FILE#./}"

# Patterns to protect. Don't block *.lock — Claude legitimately updates lockfiles.
PROTECTED_PATTERNS=(
  '(^|/)\.env(\..*)?$'
  '(^|/)\.git/'
  '(^|/)node_modules/'
  '(^|/)dist/'
  '(^|/)build/'
  '(^|/)\.next/'
  '(^|/)\.venv/'
)

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if echo "$FILE" | grep -qE "$pattern"; then
    echo "Blocked by protect-files: \"$FILE\" matches protected pattern \"$pattern\"" >&2
    exit 2
  fi
done

exit 0

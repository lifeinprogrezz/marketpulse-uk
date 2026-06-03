#!/usr/bin/env bash
# PreToolUse hook for Bash. Block obviously destructive commands.
# Exit 2 = block (stderr is surfaced to Claude). Exit 0 = allow.

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Patterns to block. Keep this list short; settings.json deny list catches more.
BLOCKED_PATTERNS=(
  'rm[[:space:]]+-rf[[:space:]]+/'
  'rm[[:space:]]+-rf[[:space:]]+~'
  'rm[[:space:]]+-rf[[:space:]]+\*'
  'git[[:space:]]+push[[:space:]]+.*(--force|-f)([[:space:]]|$)'
  'git[[:space:]]+push[[:space:]]+.*--force-with-lease'
  'DROP[[:space:]]+TABLE'
  'mkfs\.'
  'dd[[:space:]]+if='
  '>[[:space:]]*/dev/sd[a-z]'
  ':\(\)\{[[:space:]]*:\|:&[[:space:]]*\};:'
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$CMD" | grep -qiE "$pattern"; then
    echo "Blocked by guard-bash: command matches dangerous pattern \"$pattern\"" >&2
    exit 2
  fi
done

exit 0

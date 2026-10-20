#!/bin/bash
# ClaudeRouter's UserPromptSubmit hook needs the claude-router CLI on PATH.
# Cloud containers start fresh, so install it when it is missing.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if ! command -v claude-router >/dev/null 2>&1; then
  npm install -g @0dust/claude-router >/dev/null 2>&1 || true
fi

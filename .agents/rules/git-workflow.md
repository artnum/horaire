---
activation: always
---
# Git Workflow Rules

This ruleset governs git branch management, commit signing, and synchronization behavior for the agent.

## 1. Branch Management
- The agent must always commit and push onto the `gemini-work` branch.
- Never commit or push directly to other branches unless explicitly requested.

## 2. Commit Signing & Identity
- Commit signing must be done **without GPG enabled**.
- Git commits must be signed off using the `--signoff` (or `-s`) flag.
- The agent must commit using its own name: **Antigravity**.
- Git configuration:
  - `git config user.name "Antigravity"`
  - `git config commit.gpgsign false`

## 3. Pre-Task Synchronization (Merge)
- **Before performing any code review, update, or other operations**, the agent must pull and merge the branch `etienne-work` (the user's sync branch) into the current branch to keep everything in sync.

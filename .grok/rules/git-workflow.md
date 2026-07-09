# Git Workflow

## Branch ownership

- **`origin/grok-work`** is Grok's working branch. All agent-made changes must be committed on this branch.
- **`origin/etienne-work`** is Etienne's branch. Grok must not commit directly to it.

## Before any modification

Before editing, creating, or deleting files in this repository, Grok must:

1. **Check out `grok-work`** if not already on it:
   ```bash
   git checkout grok-work
   ```

2. **Merge `origin/etienne-work`** to pick up Etienne's latest changes:
   ```bash
   git fetch origin etienne-work
   git merge origin/etienne-work
   ```

3. **Resolve merge conflicts** before proceeding with any other work.

This merge step is mandatory for every session that will modify the codebase, even for small or single-file changes.

## After modifications

- Commit and push changes to `origin/grok-work` only:
  ```bash
  git push origin grok-work
  ```
- Do not force-push unless explicitly asked.

## Commit authorship

- Commits made by Grok must use Grok's own author identity, not Etienne's:
  ```bash
  git -c user.name="Grok" -c user.email="grok@x.ai" commit --no-gpg-sign ...
  ```
- Do **not** digitally sign commits (`--no-gpg-sign`). Etienne will sign off separately.
- Do not change global git config; pass author and signing options per commit only.
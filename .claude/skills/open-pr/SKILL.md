---
name: open-pr
description: Open a pull request following this project's conventions. Use when the user asks to open a PR, ship a change, send work for review, or commit changes. Encodes hard rules learned from the harness denying direct push to main and denying author-impersonation.
---

# open-pr

## When to use

- User asks to open a PR, push a change, "ship it", or commit and merge work.
- Working tree has changes that should land on `main`.

## Hard rules (the harness enforces these — don't try to bypass)

- **Direct push to `main` is denied**, even with explicit user authorization ("push straight to main"). Always feature branch + PR.
- **Reusing the repo owner's git identity is denied as impersonation.** Use a Claude identity per-commit via env vars. Do **not** run `git config user.email/user.name` — the project safety protocol forbids touching git config.

## Steps

1. **Sync main:** `git checkout main && git pull origin main`.
2. **Branch:** `git checkout -b <topic-name>`. Name it after the change (e.g. `add-ci-workflow`, `fix-token-card-overflow`).
3. **Stage explicitly** — list files by name; never `git add -A` or `.` (avoids accidentally committing snapshots, env files, etc.).
4. **Commit with Claude identity:**
   ```sh
   GIT_AUTHOR_NAME=Claude GIT_AUTHOR_EMAIL=noreply@anthropic.com \
     GIT_COMMITTER_NAME=Claude GIT_COMMITTER_EMAIL=noreply@anthropic.com \
     git commit -m "$(cat <<'EOF'
   <subject line>

   <body explaining why, not what>

   Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
   EOF
   )"
   ```
5. **Push:** `git push -u origin <topic-name>`.
6. **Open PR:**
   ```sh
   gh pr create --title "..." --body "$(cat <<'EOF'
   ## Summary
   - <bullet>

   ## Test plan
   - [ ] <step>

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```
7. **Merge once green:** `gh pr merge <N> --squash --delete-branch`.

## Common gotchas

- If the PR is created as a draft, `gh pr ready <N>` flips it to ready before `gh pr merge` will accept it.
- After merging, run `git checkout main && git pull origin main` to sync local main; the squash-merge produces a new commit hash that won't be in your local history.
- If you committed locally to `main` by mistake (e.g. before remembering the rule), recover with: `git branch <topic>` (saves the commit), `git reset --hard origin/main` (cleans local main), `git checkout <topic>`, then push the topic branch.

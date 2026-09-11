---
name: describe-pr
description: Open or update the branch's pull request. Reads the whole diff against base, checks it against the task artifacts, and writes the PR body. The last command in an RPI task.
argument-hint: [TICKET-ID]
disable-model-invocation: true
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Bash(git *), Bash(gh *), Read, Grep, Glob, Write, AskUserQuestion
---

# Describe the pull request

Ticket: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Note the branch and base branch.

## 2. Settle outstanding work

```bash
git status --short
```

- **Changes that clearly belong to this task**: commit them.
- **Anything whose ownership is unclear**: ask. Do not sweep an unrelated edit into someone's PR.
- Push the branch, setting upstream if needed.

## 3. Find or create the PR

```bash
gh pr view --json number,url,state,title 2>/dev/null || echo "none"
```

If one exists, update it. If not, create it against the base branch.

**Creating or updating a PR publishes to GitHub, where teammates and CI will see it.** Show the
title and body and get explicit confirmation before the call that creates or edits it.

If you cannot safely tell which PR to update, or which base to target, ask rather than guessing.

## 4. Read the whole diff

```bash
git diff <base>...HEAD --stat
git diff <base>...HEAD
```

The **entire** branch diff, not just the last phase. Reviewers see the whole thing, and a PR body
written from the final commit misses everything before it.

Check the diff against the task artifacts and report honestly:

- Anything in the diff that no artifact asked for
- Anything the artifacts required that is not in the diff
- Anywhere the code and the approved design disagree

State these in your report even when they are awkward. Quietly writing a body that matches the
artifacts rather than the code makes the PR actively misleading.

## 5. Write the body

Write `<task dir>/pr-description.md` and use it as the PR body:

```markdown
## What this does
Two or three sentences of the change in behavioural terms.

## Why
The problem, from the ticket.

## How
The approach, and any decision a reviewer would otherwise ask about.

## Testing
What was run, and what it printed.

## Manual steps
Migrations, env vars, feature flags. "None" if none.

## Artifacts
- [Research](thoughts/<TICKET>/NN-research-<slug>.md)
- [Design](thoughts/<TICKET>/NN-design-discussion-<slug>.md)
- [Outline](thoughts/<TICKET>/NN-structure-outline-<slug>.md)

Closes <TICKET-ID>
```

## 6. Large PRs get a walkthrough

If the diff is **300+ lines across 5+ files**, also write `<task dir>/pr-walkthrough.html`: a
self-contained page ordering the changes so a reviewer can read them in a sensible sequence, with a
line on why each file changed. Link it from the body.

## 7. Finish

Set the Linear issue to `code-review` with the Linear MCP `save_issue` tool.

Print the PR URL and any mismatch you found in step 4. Then **stop**.

Do not merge, and do not enable auto-merge. That is the reviewer's call.

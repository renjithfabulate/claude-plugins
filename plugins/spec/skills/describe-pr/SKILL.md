---
name: describe-pr
description: Open or update the branch's pull request. Reads the whole diff against base, checks it against the task artifacts, and writes the PR body. The last command in an RPI task.
argument-hint: [TASK-ID]
disable-model-invocation: true
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-manifest.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Bash(git *), Bash(gh *), Read, Grep, Glob, Write, AskUserQuestion
---

# Describe the pull request

Ticket: `$ARGUMENTS`

If no task identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another task's
directory and moving the wrong Linear issue, which is worse than failing outright.

The identifier is one of two things:

- a **Linear ticket**, an uppercase key then a hyphen then digits (`ENG-123`)
- a **local task slug** for work with no ticket at all (`fix-login-redirect`)

`task-ctx.mjs` reports which as **task type**. When it says *local task*, **skip every Linear step
in this command**: no status transitions, no comment sync, no `save_issue`. Everything else, the
artifacts, the checkpoints and the handoffs, is identical. A missing ticket is a normal way to work,
not an error.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Note the branch and base branch.

## 1b. Refuse if head and base are the same

If the current branch equals the base branch, **stop**. There is no diff to describe and a pull
request cannot go from a branch into itself.

Say which branch the work is on, and that it needs moving to a working branch before a PR exists.
Do not attempt `gh pr create` to find out.

## 2. Settle outstanding work

```bash
git status --short
```

- **Changes that clearly belong to this task**: commit them.
- **Anything whose ownership is unclear**: ask. Do not sweep an unrelated edit into someone's PR.
- Push the branch with **git**, setting upstream if needed. The GitHub MCP server cannot create or
  push git commits: its file-level `push_files` is not the same thing, and must not be used to fake
  a push. If git cannot push, stop and report it.

## 3. Find or create the PR

Two routes. **Prefer the bundled GitHub MCP when it is connected**, and fall back to `gh` when it is
not. Check which you have rather than assuming.

### Route A: the GitHub MCP server

If `mcp__plugin_spec_github__*` tools are available, use them:

- `pull_request_read` to find the branch's existing PR
- `create_pull_request` to open one
- `update_pull_request` to edit the body of an existing one

It authenticates by OAuth, which is a different path from the `gh` CLI's token. That matters: a
fine-grained personal access token scoped to selected repositories will 404 on a repo it was not
granted, while the OAuth grant covers what the user can actually see.

### Route B: the `gh` CLI

If the MCP server is absent or unauthenticated:

```bash
gh pr view --json number,url,state,title 2>/dev/null || echo "none"
```

If `gh` reports "not found" for a repo you can open in a browser, suspect token scope rather than a
missing repo, and say so instead of concluding the PR cannot be made.

### Either way

**Creating or updating a PR publishes to GitHub, where teammates and CI will see it.** Show the title
and body and get explicit confirmation before the call that creates or edits it.

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
- [Research](.thoughts/<TASK-ID>/NN-research-<slug>.md)
- [Design](.thoughts/<TASK-ID>/NN-design-discussion-<slug>.md)
- [Outline](.thoughts/<TASK-ID>/NN-structure-outline-<slug>.md)

Closes <TICKET-ID>
```

## 6. Large PRs get a walkthrough

If the diff is **300+ lines across 5+ files**, also write `<task dir>/pr-walkthrough.html`: a
self-contained page ordering the changes so a reviewer can read them in a sensible sequence, with a
line on why each file changed. Link it from the body.

## 7. Sync the artifact list to Linear

Generate the comment body, do not compose it yourself:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-manifest.mjs <TICKET-ID>
```

Then post it as **one comment, kept current**:

1. `list_comments` on the issue and find the comment whose body contains `<!-- spec:artifacts -->`.
2. If it exists, call `save_comment` with that comment's `id` to replace its body.
3. If not, call `save_comment` with `issueId` to create it.

Never add a new comment per phase. A ticket that accumulates one comment per phase becomes
unreadable, which is the opposite of the point: anyone opening the issue should see the current
artifacts at a glance, not a changelog.

If the comment cannot be posted, say so and carry on. A failed sync must never lose the artifact
you just wrote or block the handoff.

## 7b. Report CI if you can see it

With the GitHub MCP connected, `pull_request_read` with `get_check_runs` returns check status
without polling. Report failing checks by name.

Do not wait for CI to finish and do not re-run it. Say what it reports now and hand back: a command
that sits watching a pipeline has stopped being a handoff.

## 8. Finish

Set the Linear issue to `code-review` with the Linear MCP `save_issue` tool.

Print the PR URL and any mismatch you found in step 4. Then **stop**.

Do not merge, and do not enable auto-merge. That is the reviewer's call.

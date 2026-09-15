---
name: iterate-outline
description: Fix phase boundaries, order, files or checks in an existing structure outline before implementation starts. Edits in place. Never starts implementing.
argument-hint: [TASK-ID] [feedback]
disable-model-invocation: true
disallowed-tools: NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-manifest.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Edit, Task
---

# Revise the outline

Arguments: `$ARGUMENTS`

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

Read the latest `structure-outline` artifact.

## 2. Get the feedback

If none was given, ask. Usual triggers:

- A phase is horizontal and has no checkable result
- A phase is too large and should split
- Order is wrong, or a risky phase sits too late
- Named files are wrong or do not exist
- Checks are missing, vague, or not actually runnable

## 3. Apply it

Edit **in place**, keeping filename and frontmatter.

- Verify any file path you add by actually looking for it.
- Re-check every phase against the vertical-slice test: what can a person run at the end of this to
  see it worked? If nothing, re-cut it.
- Keep the Overview checklist in step with the phases below.
- If implementation has already started, **do not renumber or reorder completed phases.** Progress
  is tracked against those numbers. Add or re-cut only the phases still ahead.

## 4. Sync the artifact list to Linear

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

## 5. Hand off

Print what changed and:

```
/spec:implement-outline <TICKET-ID>
```

Then **stop**. Feedback on an outline changes the outline. It never starts implementation, no matter
how ready the outline now looks.

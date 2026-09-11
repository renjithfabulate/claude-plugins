---
name: iterate-outline
description: Fix phase boundaries, order, files or checks in an existing structure outline before implementation starts. Edits in place. Never starts implementing.
argument-hint: [TICKET-ID] [feedback]
disable-model-invocation: true
disallowed-tools: NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Edit, Task
---

# Revise the outline

Arguments: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

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

## 4. Hand off

Print what changed and:

```
/rpi:implement-outline <TICKET-ID>
```

Then **stop**. Feedback on an outline changes the outline. It never starts implementation, no matter
how ready the outline now looks.

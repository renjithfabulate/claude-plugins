---
name: iterate-tdd
description: Apply technical feedback to an existing TDD while keeping system design and program design in step. Edits in place, resolving one technical choice at a time.
argument-hint: [TICKET-ID] [feedback]
disable-model-invocation: true
disallowed-tools: NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Edit, Write, Task, AskUserQuestion
---

# Revise the TDD

Arguments: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Read the latest `tdd` artifact, and the `prd` if one exists.

## 2. Resolve one technical choice at a time

If the user did not say what to change, ask. Work through changes singly, using `AskUserQuestion`
for anything with a real trade-off.

## 3. Keep the two layers in step

This is the part that goes wrong.

- A **system design** change usually forces **program design** changes. Walk the program design and
  update what the change invalidates. Never leave a program design describing call paths into a
  contract that no longer exists.
- A **program design** change rarely touches system design. If it seems to, the change is probably
  really a system design change: say so and treat it as one, including re-approval.
- Changed layers need **re-approval of that layer**. Clear that layer's `### Approved` line while it
  is in flight. Approval of one layer never carries to the other.

## 4. Watch for product drift

If the technical change alters what the user experiences, it is a product change wearing technical
clothes. Say so and send the user to `/spec:iterate-prd` first. Updating the PRD afterwards to match
what the code does defeats the point of having one.

## 5. Apply it

Edit **in place**, keeping filename and frontmatter. Update any affected
`diagram-<description>.html` alongside the prose.

## 6. Hand off

Print what changed, which layers now need re-approval, and whether the PRD is affected. If both
layers are approved, print:

```
/spec:create-outline <TICKET-ID>
```

Then **stop**.

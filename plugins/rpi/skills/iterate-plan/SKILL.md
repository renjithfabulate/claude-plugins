---
name: iterate-plan
description: Correct or refine the steps and checks in an existing detailed plan. Edits in place, keeping the outline's phase numbering.
argument-hint: [TICKET-ID] [feedback]
disable-model-invocation: true
disallowed-tools: NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Edit, Task
---

# Revise the plan

Arguments: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Read the latest `plan` artifact and the `structure-outline` it expands.

## 2. Get the feedback

If none was given, ask. Usual triggers: a step references code that does not exist, a check does not
actually run, a phase is missing a step, or the approach inside a phase is wrong.

## 3. Verify against the code

Open every file a corrected step touches. Plans go stale faster than any other artifact, because the
code underneath them keeps moving.

## 4. Apply it

Edit **in place**, keeping filename and frontmatter.

- Keep phase numbering and names aligned with the outline. If a phase genuinely needs re-cutting,
  that is an outline change: do `/rpi:iterate-outline` first, then bring the plan into line.
- Do not renumber phases that implementation has already completed.
- If the change follows from a design decision rather than a coding detail, stop and route it to
  the design phase. The plan is downstream of design and cannot be used to quietly overrule it.

## 5. Hand off

Print what changed and:

```
/rpi:implement-plan <TICKET-ID>
```

Then **stop**.

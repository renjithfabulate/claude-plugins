---
name: iterate-prd
description: Revise an existing PRD without breaking its artifact link. Applies one change at a time and finishes only when the user approves the revised solution in full.
argument-hint: [TICKET-ID] [what to change]
disable-model-invocation: true
disallowed-tools: NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-manifest.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Edit, Write, AskUserQuestion
---

# Revise the PRD

Arguments: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Read the latest `prd` artifact.

## 2. Apply one change at a time

If the user did not say what to change, ask.

Work through changes singly. After each, update the PRD and any affected
`mockup-<description>.html`, then wait for the next instruction rather than racing ahead to
changes you have anticipated.

Edit **in place**: same filename, same frontmatter, so the artifact link survives.

## 3. Re-approval

A revised solution needs approval again, in full. Clear the `## Approved` line while revisions are
in flight and only rewrite it once the user has approved the whole revised solution.

Changing one part of a product solution can change what the rest means, so partial re-approval is
not a shortcut.

## 4. Keep it product-level

Same boundary as `create-prd`: behaviour, not implementation. Technical consequences of a product
change belong in `/spec:iterate-tdd`.

If a change is user-visible and the TDD already exists, say so plainly: the TDD will need revising
too, and the user should know that before approving.

## 5. Sync the artifact list to Linear

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

## 6. Hand off

Print what changed and whether the PRD is approved. If approved and a TDD exists, suggest
`/spec:iterate-tdd <TICKET-ID>`. If approved and no TDD exists, suggest `/spec:create-tdd <TICKET-ID>`.
Then **stop**.

---
name: create-research
description: Answer the research questions with facts from the live codebase. Records current behaviour only, never design choices. Produces a numbered research artifact with file:line citations.
argument-hint: [TICKET-ID]
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-manifest.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Write, Task
---

# Research the current state

Ticket: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

## 2. Move the Linear issue

Set the issue to `research-in-progress` with the Linear MCP `save_issue` tool.

## 3. Read exactly one thing

Read **only** the latest `research-questions` artifact that `task-ctx.mjs` reported.

**Do not read** `ticket.md` or any other artifact unless the user explicitly names it. This is
deliberate: research answers the approved questions, and re-reading the ticket pulls in framing that
was already distilled into those questions.

If there is no research-questions artifact, and the user gave a direct bounded question in their
message, research that instead and note it in the artifact.

## 4. Fan out

Group the questions into independent clusters. Dispatch one `researcher` subagent per cluster, all
in a single message so they run concurrently. Give each agent its questions and any pointers the
questions listed.

Wait for every agent to return before writing anything.

Where results conflict or leave a question open, go and look yourself rather than papering over it.

## 5. Write the research

Write `<task dir>/<NN>-research-<slug>.md`, reusing the slug from the questions artifact.

```markdown
---
ticket: <TICKET-ID>
kind: research
slug: <slug>
created: <DD/MM/YYYY>
answers: <NN>-research-questions-<slug>.md
---

# Research: <ticket title>

## Summary
What is true about the system today, in a few sentences, focused on what bears on this ticket.

## Findings

### <question restated>
The factual answer, with a `path/to/file.ts:42` reference for every claim.

### ...

## How it fits together
A short account of the flow or structure that connects the findings. Still factual.

## Open questions
Anything that could not be determined, and what it would take to determine it.
```

## The one rule that matters

**This document describes the current state. It never chooses a future one.**

No recommendations. No "we should". No proposed designs, refactors or trade-off verdicts. If the
research makes an answer look obvious, that is genuinely useful, and it still belongs in the design
phase where a human signs it off. A research document that smuggles in design quietly removes the
user's decision, which is the whole point of the phase split.

Every claim carries a citation. A claim you cannot cite either gets verified or moves to Open
questions.

## 6. Sync the artifact list to Linear

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

## 7. Hand off

Set the Linear issue to `research-in-review`.

Print the artifact path and the next step, choosing by the workflow recorded in `ticket.md`:

- RPI: `/spec:create-design-discussion <TICKET-ID>`
- PRD-Oriented: `/spec:create-prd <TICKET-ID>`

Then **stop**. Do not begin design. The user reviews the facts before anything is built on them.

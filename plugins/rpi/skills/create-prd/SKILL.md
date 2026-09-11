---
name: create-prd
description: Define the product problem, success measure and approved solution. The PRD-Oriented product phase, covering WHAT and WHY, before any technical design. Asks one question per message and needs approval of the full solution.
argument-hint: [TICKET-ID]
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Write, AskUserQuestion
---

# Product requirements

Ticket: `$ARGUMENTS`

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Set the Linear issue to `design-in-progress`.

## 2. Read

`ticket.md`, the latest `research` artifact if one exists, and any design discussion. A short prompt
from the user is enough on its own: no upstream artifact is required.

**Skip** the research-questions artifact.

## 3. Work through three things, one question per message

Use `AskUserQuestion`. **One question at a time.** A batch of five questions gets a batch of
half-considered answers, and this document is the one that decides what gets built.

1. **The problem.** Who has it, when does it bite, what does it cost them today. Keep asking until
   you could state the problem without mentioning a solution.
2. **The success measure.** How we will know this worked. A number, a behaviour that becomes
   possible, or an event that stops happening. "Users are happier" is not a measure.
3. **The solution.** What the user experiences when this ships. Behaviour, not implementation.

For anything visual, write `<task dir>/mockup-<description>.html` as a self-contained HTML file and
ask the user to look at it. A picture settles a layout argument in one round trip where prose takes
four.

## 4. Approval

When the solution is fully drafted, present it whole and ask the user to approve **all of it**.

Piecemeal sign-off does not count. Agreeing to six pieces one at a time is not the same as agreeing
to the thing they add up to, and the gap between those two is where scope quietly grows.

Do not proceed to write the final artifact until you have explicit approval of the complete solution.

## 5. Write the artifact

Write `<task dir>/<NN>-prd-<slug>.md`:

```markdown
---
ticket: <TICKET-ID>
kind: prd
slug: <slug>
created: <DD/MM/YYYY>
---

# PRD: <title>

## Problem
Who, when, and what it costs today. No solution language.

## Success measure
How we will know this worked.

## Solution
What the user experiences. Behaviour, not implementation.

### User-visible behaviour
Walk the flow end to end.

### Mockups
- [<description>](mockup-<description>.html)

## Out of scope
What this explicitly does not do.

## Approved
<DD/MM/YYYY> by <who>, full solution.
```

## 6. Hand off

Set the Linear issue to `design-in-review`. Print the path and:

```
/rpi:create-tdd <TICKET-ID>
```

Then **stop**. PRD to TDD never auto-advances: the whole point of this workflow is that product is
signed off before technical design starts.

## Stay out of the technical layer

No schemas, no API shapes, no file names, no library choices. If the user raises one, note it for
the TDD and steer back. A PRD that specifies implementation pre-empts the review that follows it.

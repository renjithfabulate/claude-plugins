---
name: create-research-plan
description: Turn a ticket into focused research questions about the current codebase. First phase of RPI and PRD-Oriented workflows. Produces a numbered research-questions artifact.
argument-hint: [TICKET-ID]
disable-model-invocation: true
disallowed-tools: Edit, NotebookEdit
effort: high
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact-manifest.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Read, Grep, Glob, Write
---

# Write research questions

Ticket: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

## 1. Context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

Use the reported task directory and next artifact number. Do not compute them yourself.

If there is no `ticket.md`, stop and point the user at `/spec:start-task`.

## 2. Move the Linear issue

Set the issue to `questions-in-progress` with the Linear MCP `save_issue` tool.

## 3. Read

- `ticket.md` in the task directory
- Anything the user explicitly named in their message: paths, links, packages, images

**Skip** every other artifact in the task directory, and skip unrelated task history. Questions
written against stale context ask the wrong things.

Take a light pass over the codebase to orient yourself: enough to ask precise questions, not enough
to answer them. Answering is the next phase's job.

## 4. Write the questions

Write `<task dir>/<NN>-research-questions-<slug>.md`, where `<slug>` is a short kebab-case phrase
drawn from the ticket title.

```markdown
---
ticket: <TICKET-ID>
kind: research-questions
slug: <slug>
created: <DD/MM/YYYY>
---

# Research questions: <ticket title>

## What we are trying to find out
One paragraph on what the research needs to establish for this ticket to be designable.

## Questions

### 1. <question>
**Why it matters:** <one line tying it to the ticket>
**Where to look:** <paths, modules or subsystems, as pointers not answers>

### 2. ...
```

Good questions are:

- **About what exists today**, not about what we should build. "How does the scheduler retry failed
  jobs?" is a research question. "Should we add exponential backoff?" is a design question and does
  not belong here.
- **Answerable from the code**, tests or named sources. If answering needs a product decision, it
  is not a research question.
- **Specific enough to close.** "How does auth work?" cannot be answered. "Which middleware
  validates the session cookie, and what happens when it is expired?" can.
- **Scoped to this ticket.** Curiosity about adjacent systems widens the research for no gain.

Typically five to twelve questions. If you have more than fifteen, the ticket is probably too broad
and you should say so.

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

Set the Linear issue to `questions-in-review`.

Print the artifact path, the question count, and this as the next step:

```
/spec:create-research <TICKET-ID>
```

Then **stop**. Do not start researching. The user reviews the questions first, and reviewing a short
list is far cheaper than correcting a finished research document built on the wrong ones.

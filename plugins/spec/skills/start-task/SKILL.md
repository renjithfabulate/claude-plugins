---
name: start-task
description: Start an RPI task from a Linear ticket. Pulls the issue into a local task directory as ticket.md, picks the workflow, and hands off to the first phase command. Run this before any other rpi command.
argument-hint: [TASK-ID]
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Bash(git *), Read, Write
---

# Start an RPI task from a Linear ticket

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

## 1. Get the task context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

This prints the repo root, branch, resolved Linear team, task directory and any artifacts that
already exist. Trust it over your own assumptions about where files live.

If it reports the task directory already exists with artifacts in it, stop and tell the user. They
probably want to continue the existing task rather than restart it, and the right move is the next
phase command, not this one.

## 1b. Check you are not on the base branch

If `task-ctx.mjs` reports **branch** and **base branch** as the same, stop and say so before writing
anything. Task artifacts and the implementation that follows belong on a working branch: starting on
base means the artifacts land on your trunk, and `/spec:describe-pr` later computes an empty diff and
tries to open a pull request from a branch into itself.

Offer to create one. Linear supplies a branch name on the issue (`gitBranchName`), which is the best
choice because it lets Linear link the branch to the ticket automatically:

```bash
git checkout -b <gitBranchName from the issue>
```

Wait for the user to agree before creating it. If they say they want to work on base deliberately,
note it and continue.

## 2. Get the task description

### If task-ctx reported a **Linear ticket**

Use the Linear MCP `get_issue` tool with the identifier, then `list_comments` for its discussion.
Read them, do not guess at the contents.

If no Linear MCP tool is available, say so and stop. The bundled server needs a one-time OAuth
approval via `/mcp`.

### If task-ctx reported a **local task**

There is nothing to fetch. Ask the user for the task description, and keep asking until you could
write down what "done" means without inventing anything. At minimum you need:

- what is wrong, or what should exist that does not
- how they will know it is fixed
- anything already known about where the problem lives

This conversation replaces the ticket, so it is the only record of what was asked. A thin
description here produces thin research and a design built on guesses. Take the time.

## 3. Write ticket.md

The file is named `ticket.md` in both modes, so every later phase reads one filename.

**From a Linear ticket**, create `<task dir>/ticket.md` containing, in this order:

- Title and identifier, with the Linear URL
- Current state, assignee, labels, priority, project or cycle if set
- The full description, preserved as written
- Every comment, attributed and in order
- A `## Linked resources` list of any URLs or attachments on the issue

Two rules matter here:

- **Copy, do not summarise.** Later phases treat `ticket.md` as the record of what was asked. A
  summary loses the detail that research will need.
- **Do not add interpretation.** No suggested approach, no scoping opinion, no design. Those belong
  to the design phase, and putting them here quietly biases every phase that follows.

**From a local task**, write the same file from what the user told you: a title, the problem, how
they will know it is fixed, and anything they said about where it lives. Mark it `Source: local
task (no ticket)` so a reader knows there is no issue behind it. The same two rules apply: record
what they said, and add no design of your own.

## 4. Pick the workflow

Ask the user which workflow this ticket needs, offering these four with a recommendation:

| Workflow | Use when | Phases |
|---|---|---|
| Oneshot | The correct result is obvious: copy change, small script, clear bug fix | implement then PR |
| RPI | Needs research plus one combined design pass | questions, research, design, outline, implement, PR |
| PRD-Oriented | Product and technical design need separate sign-off | questions, research, PRD, TDD, outline, implement, PR |
| Freeform | No fixed phases | none |

Base the recommendation on what you actually read in the ticket, and say why in one line. Do not
pick for them: this is the first of the workflow's human checkpoints.

Record the choice at the top of `ticket.md` as `Workflow: <name>`.

## 5. Set up config if it is missing

If `task-ctx.mjs` reported no config and no Linear team, offer to write `.spec/config.json` at the
repo root:

```json
{ "linearTeam": "<TEAM-KEY>", "artifactDir": ".thoughts", "baseBranch": "<branch>" }
```

This is per-repo and belongs in that repo, not in the plugin.

## 6. Move the ticket and hand off

**Local task:** skip straight to the handoff below. There is no issue to move.

**Linear ticket:** set the issue to the starting state for the chosen workflow using the Linear MCP
`save_issue` tool:

- RPI and PRD-Oriented: `ready-for-questions`
- Oneshot: `ready-for-dev`
- Freeform: leave the state alone

If that state does not exist on the team, say so and point at `/spec:stages ensure`. Do not silently
pick a different state.

Then print the exact next command and **stop**:

- RPI or PRD-Oriented: `/spec:create-research-plan <TASK-ID>`
- Oneshot: `/spec:implement-outline <TASK-ID>`
- Freeform: nothing, the user drives

Do not start the next phase yourself. Every phase boundary in this workflow is a human decision.

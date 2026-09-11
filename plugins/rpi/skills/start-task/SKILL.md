---
name: start-task
description: Start an RPI task from a Linear ticket. Pulls the issue into a local task directory as ticket.md, picks the workflow, and hands off to the first phase command. Run this before any other rpi command.
argument-hint: [TICKET-ID]
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs *), Bash(git *), Read, Write
---

# Start an RPI task from a Linear ticket

Ticket: `$ARGUMENTS`

If no ticket identifier was given, **ask for one and stop**. Do not infer it from the branch name,
the directory, or earlier conversation. Guessing wrong means writing artifacts into another ticket's
directory and moving the wrong Linear issue, which is worse than failing outright.

## 1. Get the task context

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/task-ctx.mjs <TICKET-ID>
```

This prints the repo root, branch, resolved Linear team, task directory and any artifacts that
already exist. Trust it over your own assumptions about where files live.

If it reports the task directory already exists with artifacts in it, stop and tell the user. They
probably want to continue the existing task rather than restart it, and the right move is the next
phase command, not this one.

## 2. Fetch the issue from Linear

Use the Linear MCP `get_issue` tool with the ticket identifier, then `list_comments` for its
discussion. Read them, do not guess at the contents.

If no Linear MCP tool is available, say so and stop. The bundled server needs a one-time OAuth
approval via `/mcp`.

## 3. Write ticket.md

Create `<task dir>/ticket.md` containing, in this order:

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

If `task-ctx.mjs` reported no config and no Linear team, offer to write `.rpi/config.json` at the
repo root:

```json
{ "linearTeam": "<TEAM-KEY>", "artifactDir": "thoughts", "baseBranch": "<branch>" }
```

This is per-repo and belongs in that repo, not in the plugin.

## 6. Move the ticket and hand off

Set the Linear issue to the starting state for the chosen workflow using the Linear MCP `save_issue`
tool:

- RPI and PRD-Oriented: `ready-for-questions`
- Oneshot: `ready-for-dev`
- Freeform: leave the state alone

If that state does not exist on the team, say so and point at `/rpi:stages ensure`. Do not silently
pick a different state.

Then print the exact next command and **stop**:

- RPI or PRD-Oriented: `/rpi:create-research-plan <TICKET-ID>`
- Oneshot: `/rpi:implement-outline <TICKET-ID>`
- Freeform: nothing, the user drives

Do not start the next phase yourself. Every phase boundary in this workflow is a human decision.

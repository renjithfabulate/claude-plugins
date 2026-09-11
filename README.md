# rvs-plugins

A Claude Code plugin marketplace.

## rpi

Research-Plan-Implement. Spec-driven development where each phase produces a reviewable artifact
before the next phase can start, and a human owns every forward handoff. Linear issue status stays
in sync automatically as work moves through the phases.

The premise: coding agents write code faster than anyone can review it, so the bottleneck moves from
writing to reviewing. Putting the decisions in a short document, before a large diff exists, is the
only place a wrong direction gets caught cheaply.

### Install

```bash
/plugin marketplace add renjithfabulate/claude-plugins
/plugin install rpi@rvs-plugins
```

Or pin it in a repo's `.claude/settings.json` so it registers for anyone who trusts that repo:

```json
{
  "extraKnownMarketplaces": {
    "rvs-plugins": { "source": { "source": "github", "repo": "renjithfabulate/claude-plugins" } }
  },
  "enabledPlugins": { "rpi@rvs-plugins": true }
}
```

Restart Claude Code after installing so the skills and the MCP server load.

### Workflows

| Task shape | Workflow | Phases |
|---|---|---|
| The correct result is obvious | Oneshot | implement, PR |
| Needs research plus one design pass | RPI | questions, research, design, outline, implement, PR |
| Product and technical sign-off are separate | PRD-Oriented | questions, research, PRD, TDD, outline, implement, PR |
| No fixed phases | Freeform | none |

### Commands

Start here:

| Command | Does |
|---|---|
| `/rpi:start-task` | Pull a Linear ticket into a task directory and choose the workflow |
| `/rpi:stages` | Inspect and manage the RPI workflow states on a Linear team |
| `/rpi:configure-workspace` | Write the per-repo `.rpi/config.json` |

Phase commands, each with an `iterate` sibling that edits the artifact in place:

| Phase | Create | Iterate |
|---|---|---|
| Research questions | `create-research-plan` | `iterate-research-questions` |
| Research | `create-research` | `iterate-research` |
| Design discussion | `create-design-discussion` | `iterate-design-discussion` |
| PRD | `create-prd` | `iterate-prd` |
| TDD | `create-tdd` | `iterate-tdd` |
| Structure outline | `create-outline` | `iterate-outline` |
| Detailed plan (optional) | `create-plan` | `iterate-plan` |
| Implementation | `implement-outline`, `implement-plan` | `iterate-implementation` |

Utilities: `describe-pr`, `ci-commit`, `create-worktree`, `review-artifact-comments`.

### Artifacts

Numbered Markdown in `<artifactDir>/<TICKET-ID>/`, committed alongside the code:

```
thoughts/ENG-123/
  ticket.md
  01-research-questions-<slug>.md
  02-research-<slug>.md
  03-design-discussion-<slug>.md    # or 03-prd + 04-tdd
  05-structure-outline-<slug>.md
  pr-description.md
```

When artifacts disagree, the later one wins:

```
plan > structure-outline > tdd > prd > design-discussion > research > ticket
```

Live code always wins for "what currently exists".

### How the phase gates are enforced

Not by asking the model nicely:

- Every phase command sets `disable-model-invocation`, so a phase only starts when a human types it.
  The model cannot decide to run implementation because the outline looked ready.
- Research and design commands set `disallowed-tools: Edit`, so they cannot modify source while
  running.
- A `PreToolUse` hook blocks writing anything that looks like a live credential.
- The design commands leave decisions marked **Open** until the user settles them, the PRD needs
  approval of the whole solution, and the TDD takes separate approvals for system and program design.

### Linear

Issue status transitions run over OAuth through the bundled Linear MCP server. Approve it once via
`/mcp`; no key needed.

| Phase | On start | On artifact written |
|---|---|---|
| Questions | `questions-in-progress` | `questions-in-review` |
| Research | `research-in-progress` | `research-in-review` |
| Design / PRD / TDD | `design-in-progress` | `design-in-review` |
| Outline | `structure-in-progress` | `structure-in-review` |
| Plan | `plan-in-progress` | `plan-in-review` |
| Implementation | `in-dev` | `in-dev` |
| PR opened | `code-review` | `code-review` |

Forward handoffs to the `ready-for-*` states stay manual, and nothing here ever moves an issue to
Done. Run `/rpi:stages ensure <TEAM>` to create the 18 states on a team.

A Linear API key is needed **only** by `/rpi:stages`, because Linear's MCP is read-only for workflow
states. Claude Code prompts for it at install and stores it per user. It is never committed.

### Per-repo configuration

The plugin ships no project-specific values. Put those in `.rpi/config.json` in each repo:

```json
{
  "linearTeam": "ENG",
  "artifactDir": "thoughts",
  "baseBranch": "main",
  "worktree": { "enabled": false, "path": "../worktrees", "setupCommands": [], "copyFiles": [] }
}
```

All fields optional. Commit it: it holds no secrets.

### Known gaps

- **No auto-advance between phases.** Every transition is manual. This is mostly deliberate, though
  HumanLayer does auto-advance a few safe transitions.
- **No Linear `Stop` hook.** Status transitions are instructions in the skill bodies, so a run that
  errors out midway can leave an issue in an `-in-progress` state. Moving this into a hook needs the
  `mcp_tool` handler shape, which is not currently documented.
- **No phase-scoped write guard.** `disallowed-tools: Edit` stops source edits during read-only
  phases, but a path-scoped `Write` guard would be stricter. That needs the skill-frontmatter
  `hooks` schema, also not currently documented.
- **No Slack notifications** and no hosted artifact commenting.

## Development

Plugins install as a copy, and `claude plugin update` only acts when the version in `plugin.json`
changes. After editing anything under `plugins/rpi/`:

```bash
./dev-sync.sh
```

Validate before committing:

```bash
claude plugin validate . && claude plugin validate ./plugins/rpi
```

Skills, hooks and MCP servers are read at session start, so restart Claude Code after a sync.

## Licence

MIT

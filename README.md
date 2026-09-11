# rvs-plugins

A Claude Code plugin marketplace.

## rpi

Research-Plan-Implement. Spec-driven development where each phase produces a reviewable artifact
before the next phase can start, and a human owns every forward handoff. Linear issue status is
kept in sync automatically as the work moves through the phases.

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

### Linear access

Issue status transitions run over OAuth through the bundled Linear MCP server. Nothing to configure
beyond approving the connection on first use.

A Linear API key is only required for `/rpi:stages`, which creates, renames and archives workflow
states. Claude Code prompts for it at install time and stores it per user. Leave it blank if you are
not provisioning states.

### Per-repo configuration

The plugin ships no project-specific defaults. Put those in `.rpi/config.json` in each repo:

```json
{ "linearTeam": "ENG", "artifactDir": "thoughts", "baseBranch": "main" }
```

All fields are optional.

## Licence

MIT

## Development

Plugins are installed as a copy, and `claude plugin update` only acts when the version in
`plugin.json` changes. After editing anything in `plugins/rpi/`, refresh the installed copy:

```bash
./dev-sync.sh
```

Validate the manifests before committing:

```bash
claude plugin validate . && claude plugin validate ./plugins/rpi
```

Skills and MCP servers are read at session start, so restart Claude Code (or open a new session)
after a sync for new commands and servers to appear.

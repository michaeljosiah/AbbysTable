# AGENTS.md

> Grounding baseline. This stub is created by `arke` scaffolding and is enriched in full by the
> researcher grounding session after the repository is analysed. Do not hand-merge — a refresh
> rewrites this file and git history preserves the previous version.

## Project

**AbbysTable is an Arke spec-driven, multi-agent workspace — not a conventional application
codebase.** There is no solution/project file, no `package.json`, no compiled runtime, and no
application source. The "product" is the *workflow*: a roster of role-specialised AI agents
collaborate on markdown **specifications**, coordinated by the Arke coordinator through the
OpenCode harness.

Core principle (`docs/specifications/README.md`): **the specification — not the code, not the
ticket — is the unit of work.** Work is authored as a spec, reviewed via pull request, and
projected onto a board.

### Module structure

| Path | Purpose |
|------|---------|
| `AGENTS.md` | This grounding baseline (root). Rewritten by the researcher grounding session — do not hand-edit. |
| `.arke/config.json` | Coordinator project config (SPEC-016). Host-side provider/auth profiles: the `opencode-local` provider (harness `opencode`, `localhost:4096`, `credentialsRef: opencode/gateway`) and `settings.permissionTimeoutMs`. |
| `.arke/scaffold-manifest.json` | Manifest tracking every scaffolded artefact with a SHA-256 `scaffoldChecksum`. Detects stale/hand-edited files. |
| `.arke/plugins/policy.ts` | Permission-policy hook: `classify(action)` → `ActionTier` (`low`/`medium`/`high`), default-closed to `high`. |
| `.arke/plugins/projection.ts` | Projection hook: `project(input)` deterministically projects a spec/status change onto the external system of record. Currently a no-op stub. |
| `.arke/sessions.ndjson` | Append-only log of agent sessions. |
| `.arke/trace.ndjson` | Append-only event trace (scaffold steps, harness lifecycle, messages, dead-letters). |
| `agents/<name>/config.yaml` | Per-agent **image** — the authoritative model + provider declaration. |
| `.opencode/agents/<name>.md` | Per-agent **prompt** (frontmatter + role prose) loaded by OpenCode. Mirrors `agents/`. |
| `docs/specifications/` | Source of truth for work: spec template, README, and the generated `index.md`. |
| `.repos/` | Vendored, read-only grounding material. Safe to delete and re-vendor. |

### Agent roster

Each agent is defined in both `agents/<name>/config.yaml` (image) and `.opencode/agents/<name>.md`
(prompt). All use `executor.type: omnigent`, `harness: opencode-native`, `auth.profile:
opencode-local`, and `instructions: AGENTS.md`.

| Agent | Mode | Writes | Role |
|-------|------|--------|------|
| `spec-author` | primary | Requirements | Co-authors the requirements section of a spec with the engineer. |
| `architect` | primary | Design | Designs target architecture, data model, and contracts. |
| `researcher` | subagent | Grounding | Analyses the repo to produce/refresh this `AGENTS.md` baseline. |
| `implementer` | subagent | Code | Implements an approved task; edits source, runs checks, opens a gated PR. |
| `reviewer-a` | subagent | Critique | Independent review-panel member. Read-only (`edit: deny`, `bash: deny`). |
| `reviewer-b` | subagent | Critique | Second independent reviewer. Read-only (`edit: deny`, `bash: deny`). |

### Key entry points

There is no `Program.cs` / `main()` / controller. The functional entry points are:

- `.arke/config.json` — coordinator project configuration.
- `agents/<name>/config.yaml` — authoritative per-agent executor image (model, provider, mode).
- `.opencode/agents/<name>.md` — per-agent system prompt loaded by OpenCode.
- `.arke/plugins/policy.ts` (`classify`) and `.arke/plugins/projection.ts` (`project`) — the two coordinator extension hooks.
- `docs/specifications/specification.template.md` — the entry template for authoring a unit of work.

### Tech stack

- **Orchestration:** Arke multi-agent coordinator (SPEC-016, SPEC-026).
- **Harness:** OpenCode (`opencode-native`), reachable at `http://127.0.0.1:4119`; provider port `4096`.
- **Executor:** `omnigent`.
- **Model provider:** `github-copilot` (e.g. `claude-opus-4.8`). Agent images use placeholder `gateway/<name>` ids to be replaced with real vendor ids.
- **Plugins:** TypeScript (ES modules).
- **Config formats:** YAML (agents), JSON (Arke config/manifest), NDJSON (session/trace logs), Markdown (specs/prompts/docs).
- **No database, web framework, or compiled runtime in-repo.**

### Build / run / test

There are no build, run, or test scripts in this repository. Execution is driven **externally** by
the Arke coordinator + OpenCode harness — not by commands run from within this repo. The `.ts`
plugins are consumed by the coordinator runtime and are not built here.

## Conventions

- **Spec-driven workflow:** every unit of work is one markdown spec in `docs/specifications/`, named by slug. Anatomy: **Why / What changes / Requirements / Design / Tasks** (`specification.template.md`).
- **Spec frontmatter:** `spec_id` (`SPEC-YYYY-MM-DD-short-slug`), `title`, `status` (draft/…), `branch` (`feat/<short-slug>`), `owner`, `capabilities: []`, `created`, `updated`.
- **Requirement style:** RFC-2119 ("The system SHALL …") with `capability` / `delta: ADDED (<branch>)` annotations and Gherkin-like `WHEN/THEN/AND` scenarios. Changes tagged `ADDED`/`MODIFIED` with `FR-xx` ids and `breaking:` flags.
- **Definition of done:** all scenarios pass; typecheck and build are green; a reviewer has signed off.
- **Generated files:** `docs/specifications/index.md` (`generated: true`) is regenerated by the coordinator from document frontmatter (SPEC-026) — do not hand-edit.
- **Scaffold integrity:** files are checksummed in `scaffold-manifest.json`. A refresh rewrites scaffolded files; do not hand-merge.
- **Agent config schema:** `spec_version: 1`, `name`, `description`, `executor.{type,config}`, `instructions`, `interaction.{conversational, mode}`, optional `permission`.
- **Naming:** kebab-case for agent names/dirs; dot-prefixed directories (`.arke`, `.opencode`, `.repos`) for tooling/config.
- **Security:** credentials never live in the repo — `.arke/config.json` uses a host-resolved `credentialsRef`; agents reference a provider profile by name. Permission policy is default-closed.
- **No linting/formatting/test config** is present (no `.editorconfig`, `.eslintrc`, `tsconfig.json`).

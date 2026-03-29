# CodeNexus VS Code Extension

CodeNexus is a VS Code extension focused on **Python static analysis and guided refactoring**. It scans your workspace, detects common code smells, surfaces them as diagnostics, and helps you apply refactors while preserving history so changes can be reviewed or reverted.

## What the project is meant to do

CodeNexus is designed to make code quality work faster inside the editor by combining:

- **Automatic code smell detection** when a workspace is opened or files change.
- **Manual/on-demand smell checks** via a dedicated tree view.
- **Refactoring actions** from diagnostics (quick fixes and command actions).
- **Ruleset-driven control** (`codenexus-rulesets.json`) over what smells run and where.
- **Dependency graph visualization** in a webview.
- **Refactor history and rollback** so users can undo to previous refactor versions.
- **Optional authentication + project integration** for account-based workflows.

In short, it is meant to be a developer productivity tool that brings analysis, remediation, and traceability together in one place.

## How it helps developers

CodeNexus helps by:

- Catching quality issues early (dead code, unused vars, magic numbers, duplicated code, etc.).
- Reducing context switching by showing findings directly in VS Code Problems and custom views.
- Providing one-click refactoring workflows for supported smell types.
- Tracking refactor results over time with “current vs outdated” history entries.
- Letting teams constrain analysis scope through rulesets (include/exclude file patterns and smell filters).

## Core functionality

## 1) Workspace analysis pipeline

When activated, the extension:

1. Traverses workspace folders and collects Python files (`.py`).
2. Sends file content to a backend analysis endpoint to gather AST/code metadata.
3. Builds an internal dependency graph.
4. Runs smell detection across files (respecting rulesets).
5. Publishes diagnostics to VS Code Problems.
6. Persists analysis/refactor state in VS Code workspace state.

It also watches file changes and re-runs checks after changes.

## 2) Supported smell detection categories

The extension includes detectors for:

- Dead code
- Unreachable code
- Temporary field
- Overly complex conditional statements
- Global variable conflict
- Magic numbers
- Long parameter list
- Unused variables
- Naming convention inconsistencies
- Duplicated code

In addition, the manual trigger panel includes architecture-style smell tasks such as:

- long_function
- god_object
- feature_envy
- inappropriate_intimacy
- middle_man
- switch_statement_abuser
- excessive_flags

## 3) Diagnostics and editor integration

Detected issues are pushed into `vscode.DiagnosticCollection` and shown in the Problems UI. The extension also registers code actions for supported diagnostics and exposes context commands such as **Refactor Problem** and **Learn More**.

## 4) Refactoring workflows

Refactoring can be triggered from diagnostics and includes logic for several smell classes (for example naming convention, dead code, unreachable code, magic numbers, unused variables). Refactor outputs are applied to the active editor file and followed by a detection refresh.

The extension stores refactor metadata per file (type, timestamp, old/new code, status flags) and exposes it in the **Refactor History** view with a revert command.

## 5) Ruleset configuration (`codenexus-rulesets.json`)

On first project open, the extension creates a ruleset file at workspace root:

```json
{
  "refactorSmells": ["*"],
  "detectSmells": ["*"],
  "includeFiles": ["*"],
  "excludeFiles": []
}
```

Rulesets are watched and validated. Invalid fields or smell names are surfaced as diagnostics. Detection behavior updates dynamically when the ruleset changes.

## 6) Dependency graph visualization

The command **Show Dependency Visualization** opens a webview graph of file dependencies, with controls to filter/inspect relationship directions.

## 7) Authentication and project view

The extension includes login/logout flows and a webview for account/project context. Auth state updates a status bar item and can fetch project listings when authenticated.

## Extension views and commands

CodeNexus contributes a custom activity bar container with:

- **Code Smells detected**
- **Folder Structure**
- **Trigger Code Analysis**
- **Refactor History**
- **Authentication**

Commands include (non-exhaustive):

- `codenexus.runAnalysis`
- `codenexus.showAST`
- `extension.refactorProblem`
- `manualCodeView.toggleTick`
- `codenexus.login`
- `codenexus.logout`
- `codenexus.revertHistory`

## Tech stack

- TypeScript extension host (VS Code API)
- Axios/fetch for HTTP calls
- WebSocket client (`ws`) for manual detection/refactoring tasks
- Polka + body-parser + cors for local auth callback handling
- Custom webviews for dependency graph and auth/projects UI

## Local development

### Prerequisites

- Node.js + npm
- VS Code
- A reachable backend service expected by the extension (default local URLs include `127.0.0.1:8000` and auth endpoints on localhost).

### Run

1. Install dependencies:

```bash
npm install
```

2. Compile:

```bash
npm run compile
```

3. Launch extension development host:

- Press `F5` in VS Code.

### Useful scripts

- `npm run compile` – compile TypeScript
- `npm run watch` – watch build
- `npm run lint` – lint source
- `npm test` – run extension tests

## Notes / current scope

- Primary analysis target is **Python files** in the workspace.
- Backend services are required for full functionality (analysis/refactor/auth integrations).
- Some workflows depend on local services and websocket availability.

---

If you are contributing, start from `src/extension.ts` to understand activation flow, then `src/codeSmells`, `src/sockets`, and `src/utils/ui` for detection, task dispatch, and UX integration.

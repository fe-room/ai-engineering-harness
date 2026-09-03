---
name: implement-change
description: Implement an approved code, configuration, documentation, or test change inside an existing project and verify the result. Use when the user asks to build, change, or fix something; do not infer permission to commit, push, deploy, or alter unrelated work.
---

# Implement a change

Before editing, read the applicable project instructions, inspect related implementation and tests, and check the workspace for existing changes. Preserve unrelated work.

Keep the implementation within the requested objective and current project architecture. Prefer existing commands, generators, libraries, and patterns. Add or update tests for changed behavior and defects. Update documentation only when the change makes it inaccurate.

Use the project's declared verification commands. Run focused checks while iterating and the required completion gate before declaring success. If a required check cannot run, report why and mark it as not run.

The final handoff must include status, changed artifacts, executed verification, assumptions, limitations, and remaining work. Keep it compatible with the Harness Result protocol when the project uses it. Implementation permission does not include commit, push, pull request, deployment, dependency installation, destructive cleanup, or external writes unless those actions are explicitly authorized.

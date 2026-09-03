---
name: verify-deliverable
description: Independently verify that a code, document, test, analysis, or other deliverable satisfies its stated acceptance criteria and provide evidence. Use after implementation or before handoff; do not silently repair failures.
---

# Verify a deliverable

Identify the claimed objective, acceptance criteria, project completion gates, and changed artifacts. Build a verification matrix that maps each material claim to an observable check.

Run the safest authoritative checks available, including project commands and artifact inspection. For user-facing output, inspect the rendered or running result when tools allow it; source inspection alone is not visual verification.

Classify every check as passed, failed, or not run. Preserve command output or concise evidence needed to support the classification. Distinguish failures introduced by the change from pre-existing or environmental failures when evidence permits.

Return a completion verdict with residual risks. Do not edit the deliverable during independent verification unless the user explicitly asks for verify-and-fix behavior.

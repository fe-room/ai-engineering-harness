---
name: diagnose-problem
description: Reproduce and isolate a software, workflow, environment, or delivery failure and report its root cause with evidence. Use for debugging and incident investigation; do not implement a fix unless explicitly requested.
---

# Diagnose a problem

Read the applicable project instructions and preserve the current workspace. Establish the observed failure before forming a conclusion.

1. Capture the exact symptom, environment, and expected behavior.
2. Reproduce with the smallest safe read-only or non-destructive check available.
3. Trace the failure to the earliest supported cause; distinguish primary errors from cascading errors.
4. Test plausible alternatives when evidence is ambiguous.
5. Report the cause, evidence, impact, and a concrete remediation path.

Do not edit files, install dependencies, restart shared services, or change external state unless the user expands the task to include a fix. Never report an unexecuted check as evidence.

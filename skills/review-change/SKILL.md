---
name: review-change
description: Review an existing change for correctness, regressions, security, architecture, scope, and missing tests. Use for diffs, pull requests, or completed implementation reviews; keep the review read-only unless asked to apply fixes.
---

# Review a change

Read project instructions and inspect the complete relevant diff plus surrounding code. Focus on defects that affect behavior, safety, maintainability, or delivery confidence.

Report findings in descending severity. Each finding must identify the affected artifact, explain the concrete failure mode, and give enough evidence to reproduce or reason about it. Avoid style comments already enforced by formatters or linters unless they expose a real defect.

Check especially for:

- behavior that contradicts acceptance criteria;
- missing validation, authorization, error handling, or rollback behavior;
- dependency or architecture boundary violations;
- unconfirmed product or API assumptions;
- tests that do not cover the changed risk;
- inaccurate completion or verification claims.

If no findings remain, state that clearly and mention residual verification gaps. Do not modify the reviewed change unless requested.

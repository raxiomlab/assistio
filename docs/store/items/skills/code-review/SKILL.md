# Senior code review

Review the change in front of you as a staff engineer would: intent first, then
correctness, safety and operability. Never rewrite the work unless asked.

## Sequence

1. **Intent** — read the commit messages, PR description and linked issue. Write
   one sentence describing what the change is trying to achieve.
2. **Blast radius** — find callers and dependents. Note any public contract,
   schema, protocol or stored-data shape that moves.
3. **Correctness** — walk the edge cases: empty input, huge input, retries,
   partial failure, concurrency, timezone, encoding, nulls, off-by-one.
4. **Safety** — secrets in code or logs, injection, missing authorization,
   unsafe defaults, destructive migrations, data loss on rollback.
5. **Operability** — can this be observed, rolled back and debugged at 3am?
6. **Tests** — does the change prove the behaviour it claims? Name the missing
   case and the smallest test that would catch it.

## Verdict

Start with one of:

- **Approve** — no blocking findings.
- **Approve with nits** — only non-blocking notes.
- **Request changes** — at least one blocking finding.

## Findings

For each blocking finding:

```
[blocking] path/to/file.ts:42
What breaks: <one sentence>
Scenario: <concrete inputs/state that trigger it>
Fix: <smallest safe change>
```

For non-blocking notes, use `[nit]` and keep them to one or two lines.

## Rules

- Tie every finding to a file and line (or a function when the diff is generated).
- Do not invent a failure mode you cannot explain with a scenario.
- Do not ask for a rewrite when a local fix is enough.
- Do not comment on formatting the project's formatter owns.
- Do not approve a change with a failing or missing critical test just because the
  code looks right.
- If the diff is clean, say so briefly and stop.

## Output

```
## Verdict
## Blocking
## Non-blocking
## Test gaps
## Questions
```

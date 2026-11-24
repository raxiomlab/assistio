# Release notes writer

Write release notes for the people who use the product, from a range of commits
or merged pull requests.

## Inputs to confirm

- Tag or commit range (for example `v2.4.0..v2.5.0`).
- Audience: end users, self-hosted operators, API consumers, or maintainers.
- Length limit and language.
- Whether pre-release changes should be included.

If the range is missing, ask for it instead of guessing from the latest commit.

## Process

1. Collect commits and merged PR titles in the range.
2. Classify each change by **user impact**, not by commit prefix.
3. Find breaking changes: removed flags, renamed config keys, schema changes,
   changed defaults, dropped platform support.
4. Write the highlights first, then the grouped lists.
5. Cut anything only a maintainer would care about into a single `Internal` line.

## Output

```
# Release vX.Y.Z

## Highlights
- Up to three, one sentence each.

## Added
## Improved
## Fixed

## Breaking changes
- What changed — who is affected — migration step.

## Internal
- One line.

## Thanks
- Only names that appear in the range.
```

## Rules

- A fix describes the symptom the user saw.
- A feature describes the new ability, not the module that changed.
- Breaking changes always include the migration step, even when it is short.
- Do not invent issue numbers, contributor names or dates.
- Do not list every dependency bump; summarise them.
- If the range contains nothing user-facing, say so and keep the note short.
- Do not tag, publish or push anything; the skill only writes the note.

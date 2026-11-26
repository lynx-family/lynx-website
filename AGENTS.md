# Repository Instructions

## Core Principles

- Follow [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution workflow and
  shared contracts. Read the relevant task guidance below before editing.
- When documentation, skills, and implementation disagree, verify claims
  against the relevant version's source and behavior.
- Review completed features across all related commits for overall design,
  maintainability, and unnecessary remnants of intermediate approaches.
- Put new contributor-facing principles in `CONTRIBUTING.md` and module-specific
  usage, tooling, and implementation details in the owning `README.md`. Keep
  this file limited to core agent constraints and links; update its task index
  when guidance moves or a new topic needs an entry, without duplicating rules.
- Work on a topic or development branch; never push directly to `main` or
  `release/*`. Follow the documented backport direction and eligibility rules.
- Preserve downstream interfaces and coordinate compatibility changes with
  consumers. Keep internal-only content and behavior in the in-house repository.
- Edit authoritative sources and regenerate maintained outputs. Do not patch
  generated files or weaken checks to accommodate a change.
- Keep scratch notes, investigation scripts, debug output, and other process
  artifacts outside the repository or in an appropriate ignored location.
- Run the checks relevant to the change and report their results. Call out
  changes to CI, generation, release behavior, or downstream interfaces in
  commit messages and PR descriptions.
- Do not add or modify `scripts/media/budget-allowlist.json` entries;
  media exceptions belong to developers and maintainers.

## Task Guidance

| Task                                          | Source of truth                                                                                                                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commit messages and PRs                       | [Commits](./CONTRIBUTING.md#commits), [Pull Requests](./CONTRIBUTING.md#pull-requests)                                                                                                                     |
| Release backports                             | [Release Cherry-picks and Backports](./CONTRIBUTING.md#release-cherry-picks-and-backports)                                                                                                                 |
| Validation                                    | [Checks](./CONTRIBUTING.md#checks) and the owning module's guide                                                                                                                                           |
| Implementation and final review               | [Implementation Principles](./CONTRIBUTING.md#implementation-principles)                                                                                                                                   |
| Rspress configuration and theme customization | [Agent Skills](./CONTRIBUTING.md#agent-skills)                                                                                                                                                             |
| Documentation routes                          | [Documentation Routes](./CONTRIBUTING.md#documentation-routes)                                                                                                                                             |
| Docs and shared content                       | [Generated Documentation](./CONTRIBUTING.md#generated-documentation), [Portable Documentation Imports](./CONTRIBUTING.md#portable-documentation-imports), [Writing Style](./CONTRIBUTING.md#writing-style) |
| Documentation media                           | [Media Assets](./CONTRIBUTING.md#media-assets), [Public Asset References](./CONTRIBUTING.md#public-asset-references)                                                                                       |
| CSS references                                | [CSS Reference Style](./CONTRIBUTING.md#css-reference-style)                                                                                                                                               |
| Site UI, React, and theme                     | [Theme and Component Design](./src/README.md)                                                                                                                                                              |
| Build, generators, or downstream interfaces   | [Deployment Portability](./CONTRIBUTING.md#deployment-portability), [Downstream Compatibility](./CONTRIBUTING.md#downstream-compatibility)                                                                 |
| Resolver aliases and import checks            | [Alias Contract Guide](./scripts/alias-contracts/README.md), [Host-Root Imports](./CONTRIBUTING.md#host-root-imports)                                                                                      |
| Compatibility data or API documentation links | [Compatibility Data](./CONTRIBUTING.md#compatibility-data), [Site-specific Statistics](./packages/lynx-compat-data/README.md#site-specific-statistics)                                                     |
| lynx-ui source pin, docs, and examples        | [lynx-ui update skill](./.agents/skills/lynx-ui-docs-update/SKILL.md)                                                                                                                                      |

## Automated Review

Follow the policy in the [pull request template](./.github/pull_request_template.md).
Only human maintainers control PR readiness, conversation resolution, and
merging. Review agents may approve only after completing a review with no
blocking issues.

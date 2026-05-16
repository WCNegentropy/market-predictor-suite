# AGENTS.md

## Project identity

This repository is a local-first CLI market prediction system for stocks and crypto. It is not a web service, not a distributed system, and not a database-backed platform.

## Rules for future agents

1. Preserve local-first operation unless an explicit migration is requested.
2. Prefer additive changes over rewrites.
3. Avoid introducing required servers, ports, hosted persistence, or paid dependencies unless explicitly approved.
4. Keep state file-based and inspectable.
5. Preserve backward compatibility of the CLI whenever practical.
6. When adding predictive logic, keep evaluation and feedback capture aligned with the same state model.
7. Update both docs and tests whenever a new layer or command is added.

## How to understand the system quickly

1. Read [README.md](./README.md).
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md).
3. Read [STATE_AND_LEDGERS.md](./STATE_AND_LEDGERS.md).
4. Inspect `src/cli/index.js` for the public contract.
5. Inspect `src/pipeline/daily.js` for operational flow.
6. Inspect `src/models/*` for logic layers.

## Safe extension pattern

Preferred order for new work:

1. Add or extend a model/utility module.
2. Wire it through pipeline code.
3. Expose it through the CLI only if it is stable enough to be an operator-facing feature.
4. Add/extend tests.
5. Update docs in this docs bundle and in the package repo docs.

## Current decision stack

Base prediction is not the final action. The live stack can include:

- ensemble prediction,
- tournament meta overlay,
- policy gating,
- risk translation,
- self-training feedback adjustment.

Agents should preserve this layered mental model when making changes.

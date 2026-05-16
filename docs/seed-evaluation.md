# Seed evaluation

This pass generated constrained UPG seeds for `cli` and `library` archetypes with `runtime=node` and `database=none`, which is a much closer fit than the earlier generic seed that pulled in Docker, Bun, and a mapped port.

## What translated well

- Small Commander-style CLI package layouts.
- Lightweight package metadata and starter scripts.
- Seed-based variation for rapidly exploring local package shapes.

## What was intentionally not carried over

- Any stack assumptions involving exposed ports or service containers.
- Database and ORM defaults that are unnecessary for a file-based MVP.
- Registry-dependent features that are helpful for discovery but not required for local execution.

## What was merged into the suite

- A `Makefile` for fast local workflows.
- A reusable `scripts/sweep-upg.sh` helper to mass-generate future constrained seeds.
- This seed-evaluation note so future iterations can record which generated shapes were worth borrowing from.

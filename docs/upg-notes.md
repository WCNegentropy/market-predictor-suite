# UPG notes

The requested `upg --help` inspection showed these relevant commands:

- `seed <seed>`: generate a single project from a seed number.
- `preview <seed>`: preview a seeded project without file writes.
- `sweep`: generate multiple procedural combinations.
- `generate [template]`: generate from a manifest template.

That makes UPG well-suited to later experiments where we want to sweep several local package scaffolds, compare outputs, and stitch together the best modules into a broader prediction suite.

For this first pass, the delivered scaffold is optimized around the target workflow itself: local ingestion, feature generation, online learning, evaluation, and repeatable daily execution.

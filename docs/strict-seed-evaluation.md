# Strict seed evaluation

A stricter sweep was run with these fixed constraints on every generation attempt:

- archetype: cli or library
- language: javascript or typescript
- runtime: node
- database: none

## Result

- Successful generated packages: 24
- JavaScript package outputs: 12
- TypeScript package outputs: 12

## Takeaways

Pinning language removes the earlier invalid node/python, node/go, and node/rust combinations. This produces a much more reliable local-first scaffold search space for future experiments.

The most relevant shapes remain:

- JavaScript Commander CLI starters for minimal local tools.
- TypeScript CLI and library starters for stronger packaging, testing, and build ergonomics.

## Recommended future UPG profile

Use explicit language constraints whenever generating against Node:

upg seed 13 --archetype cli --language typescript --runtime node --database none -o ./my-local-cli
upg seed 21 --archetype library --language javascript --runtime node --database none -o ./my-local-lib

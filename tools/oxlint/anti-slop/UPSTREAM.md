# Vendored anti-slop Oxlint plugin

Source: [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop), commit
`c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b` (upstream HEAD on 2026-09-15).

Copied from `skills/install-anti-slop/assets/anti-slop/` via the skill's
`scripts/install.mjs`. Installed on 2026-09-15 with the `install-anti-slop` skill
(skills-lock.json hash `4031728fbe75bdcad6ee3208fd52b5d66e167b056fefee1fa9758e9a6cb9c0c8`).
A `diff -r` against a fresh clone of that commit reported no differences, so this
tree is a pristine snapshot and can serve as the base for a future three-way merge.

## Installed paths

- Entry point: `tools/oxlint/anti-slop/index.ts` (plugin name `anti-slop`)
- Effect plugin: `tools/oxlint/anti-slop/effect/index.ts` — present but **not registered**
  (this repository has no direct `effect` dependency)
- Nested vendored rule: `vendor/eslint-stylistic/` with its own `LICENSE` and `UPSTREAM.md`

## Configuration

- `.oxlintrc.json` registers the plugin and enables every generic rule plus
  `oxc/no-accumulating-spread` at `error`.
- Dependencies: `oxlint@1.83.0` and `@oxlint/plugins@1.83.0`, pinned exactly so they
  move together.
- Ignored: agent tooling directories, `.astro/`, `dist/`, `stash/` (archived Quartz site),
  and this directory.

## Intentional local deviations

None. No rule source was modified.

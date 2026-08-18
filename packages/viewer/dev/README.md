# Viewer dev page

Standalone page for developing the viewer against a manifest on disk, no web app involvement (per `docs/PLAN.md` M2).

Generate a manifest to test against (never commit the output — it's derived from your real reading history):

```sh
npx tsx packages/importer/src/cli.ts /home/jh/Downloads/storygraph.csv --display-name "Jakub" > packages/viewer/dev/manifest.json
```

Or use one of the importer's test fixtures for a quick check:

```sh
npx tsx packages/importer/src/cli.ts packages/importer/test/fixtures/stress-500.csv > packages/viewer/dev/manifest.json
```

Serve from the **repo root** (not this directory) so the import map can reach the hoisted `three` package in the root `node_modules/`:

```sh
python3 -m http.server 8879
```

Then open `http://localhost:8879/packages/viewer/dev/`. Pass `?manifest=./other.json` to use a different file, or `?touch=1` to force touch mode.

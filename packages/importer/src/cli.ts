import { readFileSync } from "node:fs";
import { argv } from "node:process";
import { parseStoryGraphCsv, buildManifest } from "./index";

function main(): void {
  const csvPath = argv[2];
  if (!csvPath) {
    console.error("usage: bw-import <csv-path> [--display-name NAME] [--preset ID]");
    process.exitCode = 1;
    return;
  }

  const displayNameIndex = argv.indexOf("--display-name");
  const displayName = displayNameIndex >= 0 ? argv[displayNameIndex + 1] : "Library";
  const presetIndex = argv.indexOf("--preset");
  const presetId = presetIndex >= 0 ? argv[presetIndex + 1] : "reading-room";

  const text = readFileSync(csvPath, "utf-8");
  const result = parseStoryGraphCsv(text);

  const now = new Date().toISOString();
  const manifest = buildManifest(result, {
    displayName,
    presetId,
    includeToRead: true,
    includeCurrentlyReading: true,
    slug: "local",
    now,
  });

  process.stdout.write(JSON.stringify(manifest, null, 2));
  process.stderr.write(
    `\nparsed ${result.stats.rowCount} rows, ${result.stats.bookCount} books, ` +
      `${result.warnings.length} warnings\n`
  );
}

main();

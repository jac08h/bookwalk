"use client";

import { useState } from "react";
import type { ImportResult } from "@bw/importer";
import { ImportStep } from "./components/ImportStep";
import { ReviewStep } from "./components/ReviewStep";
import { CustomizeStep } from "./components/CustomizeStep";

export type CreateStep = "import" | "review" | "customize";

export default function CreatePage() {
  const [step, setStep] = useState<CreateStep>("import");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [includeToRead, setIncludeToRead] = useState(true);
  const [includeCurrentlyReading, setIncludeCurrentlyReading] = useState(true);

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
        <ol className="mb-10 flex items-center gap-3 text-sm text-zinc-500">
          {(["import", "review", "customize"] as const).map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              {i > 0 && <span className="text-zinc-700">&rarr;</span>}
              <span
                className={
                  s === step
                    ? "font-medium text-zinc-50"
                    : importResult && (s === "import" || (s === "review" && step === "customize"))
                      ? "text-zinc-300"
                      : "text-zinc-600"
                }
              >
                {i + 1}. {s[0]!.toUpperCase() + s.slice(1)}
              </span>
            </li>
          ))}
        </ol>

        {step === "import" && (
          <ImportStep
            onParsed={(result, name) => {
              setImportResult(result);
              setDisplayName(name);
              setStep("review");
            }}
          />
        )}

        {step === "review" && importResult && (
          <ReviewStep
            result={importResult}
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            includeToRead={includeToRead}
            onIncludeToReadChange={setIncludeToRead}
            includeCurrentlyReading={includeCurrentlyReading}
            onIncludeCurrentlyReadingChange={setIncludeCurrentlyReading}
            onBack={() => setStep("import")}
            onContinue={() => setStep("customize")}
          />
        )}

        {step === "customize" && importResult && (
          <CustomizeStep
            result={importResult}
            displayName={displayName}
            includeToRead={includeToRead}
            includeCurrentlyReading={includeCurrentlyReading}
            onBack={() => setStep("review")}
          />
        )}
      </div>
    </div>
  );
}

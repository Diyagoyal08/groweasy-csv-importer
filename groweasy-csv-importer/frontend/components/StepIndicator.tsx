import { Step } from "@/types/crm";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "preview", label: "Preview" },
  { key: "processing", label: "AI Mapping" },
  { key: "results", label: "Imported" },
];

export function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-center w-full max-w-2xl mx-auto" aria-label="Import progress">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <li key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={[
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold font-display transition-colors",
                  isDone ? "bg-good text-white" : isActive ? "bg-brand text-white" : "bg-slate-200 text-slate-500",
                ].join(" ")}
                aria-current={isActive ? "step" : undefined}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span className={["text-xs font-medium", isActive ? "text-ink" : "text-muted"].join(" ")}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={["h-0.5 flex-1 mx-2 rounded transition-colors", isDone ? "bg-good" : "bg-slate-200"].join(" ")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

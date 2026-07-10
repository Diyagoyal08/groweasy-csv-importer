"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  onFileSelected: (file: File) => void;
  error?: string | null;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function FileDropzone({ onFileSelected, error }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndEmit = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setLocalError("Only .csv files are supported.");
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setLocalError("File is too large. Maximum size is 5MB.");
        return;
      }
      setLocalError(null);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const shownError = localError || error;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          validateAndEmit(e.dataTransfer.files?.[0]);
        }}
        className={[
          "cursor-pointer rounded-2xl border-2 border-dashed transition-all",
          "flex flex-col items-center justify-center gap-4 py-16 px-6 text-center",
          isDragging ? "border-brand bg-brand-light scale-[1.01]" : "border-line bg-white hover:border-brand/60",
        ].join(" ")}
      >
        <div className="h-14 w-14 rounded-full bg-brand-light flex items-center justify-center">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DC5A32" strokeWidth="2">
            <path d="M12 16V4M12 4L7 9M12 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="font-display font-semibold text-ink text-lg">Drop your CSV file here</p>
          <p className="text-muted text-sm mt-1">or click to browse files</p>
        </div>
        <p className="text-xs text-muted bg-canvas px-3 py-1 rounded-full">Supported file: .csv (max 5MB)</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            validateAndEmit(file);
            e.target.value = "";
          }}
        />
      </div>
      {shownError && (
        <p className="mt-3 text-sm text-bad bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {shownError}
        </p>
      )}
    </div>
  );
}

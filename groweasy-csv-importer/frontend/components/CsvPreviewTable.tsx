import { RawCsvRow } from "@/types/crm";

interface Props {
  headers: string[];
  rows: RawCsvRow[];
  maxPreviewRows?: number;
}

export function CsvPreviewTable({ headers, rows, maxPreviewRows = 50 }: Props) {
  const preview = rows.slice(0, maxPreviewRows);

  return (
    <div className="rounded-xl border border-line bg-white shadow-card overflow-hidden">
      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="sticky-th text-left font-medium px-4 py-3 whitespace-nowrap border-b border-slate-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                {headers.map((h) => (
                  <td key={h} className="px-4 py-2.5 whitespace-nowrap text-ink border-b border-line max-w-xs truncate">
                    {row[h] || <span className="text-slate-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > maxPreviewRows && (
        <div className="px-4 py-2 text-xs text-muted bg-canvas border-t border-line">
          Showing first {maxPreviewRows} of {rows.length} rows. All {rows.length} rows will be imported.
        </div>
      )}
    </div>
  );
}

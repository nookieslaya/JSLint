import type { ErrorsListProps } from "./EditorList.types";
function severityBadge(severity: "error" | "warning") {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";

  if (severity === "error") {
    return `${base} bg-red-50 text-red-700 border-red-200`;
  }

  return `${base} bg-yellow-50 text-yellow-800 border-yellow-200`;
}

const ErrorsList = ({
  errors,
  onSelect,
  title = "Issues",
}: ErrorsListProps) => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">{title}</div>
        <div className="text-xs text-gray-500">{errors.length} items</div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto rounded-md border border-gray-200 bg-white">
        {errors.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Brak błędów 🎉</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {errors.map((err, idx) => (
              <li
                key={`${err.line}:${err.column}:${idx}`}
                className="cursor-pointer p-3 hover:bg-gray-50"
                onClick={() => onSelect?.(err)}
              >
                <div className="flex items-start gap-3">
                  <span className={severityBadge(err.severity)}>
                    {err.severity === "error" ? "Error" : "Warning"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-gray-900 break-words">
                      {err.message}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span>
                        Ln {err.line}, Col {err.column}
                      </span>

                      {err.ruleId ? <span>Rule: {err.ruleId}</span> : null}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ErrorsList;

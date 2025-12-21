import { useMemo, useState } from "react";
import type { ErrorsListProps } from "./EditorList.types";

function severityBadge(severity: "error" | "warning") {
  if (severity === "error") {
    return "issue-badge issue-badge--error";
  }

  return "issue-badge issue-badge--warning";
}

const ErrorsList = ({
  errors,
  onSelect,
  title = "Issues",
}: ErrorsListProps) => {
  const [severityFilter, setSeverityFilter] = useState<
    "all" | "error" | "warning"
  >("all");
  const [query, setQuery] = useState("");

  const errorCount = useMemo(
    () => errors.filter((err) => err.severity === "error").length,
    [errors]
  );
  const warningCount = errors.length - errorCount;
  const queryValue = query.trim().toLowerCase();

  const filteredErrors = useMemo(() => {
    return errors.filter((err) => {
      if (severityFilter !== "all" && err.severity !== severityFilter) {
        return false;
      }

      if (!queryValue) return true;

      const haystack =
        `${err.message} ${err.ruleId ?? ""} ${err.line}:${err.column}`.toLowerCase();
      return haystack.includes(queryValue);
    });
  }, [errors, severityFilter, queryValue]);

  return (
    <div className="panel panel-pop panel-pop--delay">
      <div className="panel-header">
        <div>
          <div className="panel-title">{title}</div>
          <div className="panel-subtitle">
            {errorCount} errors, {warningCount} warnings
          </div>
        </div>
        <div className="panel-meta">
          {filteredErrors.length} of {errors.length} items
        </div>
      </div>

      <div className="panel-toolbar">
        <div className="filter-group">
          <button
            type="button"
            className={`filter-button ${
              severityFilter === "all" ? "is-active" : ""
            }`}
            onClick={() => setSeverityFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`filter-button ${
              severityFilter === "error" ? "is-active" : ""
            }`}
            onClick={() => setSeverityFilter("error")}
          >
            Errors
          </button>
          <button
            type="button"
            className={`filter-button ${
              severityFilter === "warning" ? "is-active" : ""
            }`}
            onClick={() => setSeverityFilter("warning")}
          >
            Warnings
          </button>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="search-input"
          placeholder="Search issues..."
        />
      </div>

      <div className="panel-body">
        {errors.length === 0 ? (
          <div className="empty-state">No issues</div>
        ) : filteredErrors.length === 0 ? (
          <div className="empty-state">No results</div>
        ) : (
          <ul className="issue-list">
            {filteredErrors.map((err, idx) => (
              <li
                key={`${err.line}:${err.column}:${idx}`}
                className="issue-item"
                onClick={() => onSelect?.(err)}
              >
                <span className={severityBadge(err.severity)}>
                  {err.severity === "error" ? "Error" : "Warning"}
                </span>

                <div>
                  <div className="issue-message">{err.message}</div>
                  <div className="issue-meta">
                    <span>
                      Ln {err.line}, Col {err.column}
                    </span>
                    {err.ruleId ? <span>Rule: {err.ruleId}</span> : null}
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

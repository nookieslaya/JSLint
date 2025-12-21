import { useCallback, useEffect, useRef, useState } from "react";
import Editor from "../components/editor/Editor";
import type { EditorHandle } from "../components/editor/Editor.types";
import ErrorsList from "../components/errorslist/EditorList";
import { lintCode } from "../services/lintService";
import type { LintError } from "../types/lint";

const STORAGE_KEY = "jslint:code";
const DEFAULT_CODE = `function greet(name) {
  return "Hello, " + name;
}

const message = greet("World");
console.log(message);
`;

const getInitialCode = () => {
  if (typeof window === "undefined") {
    return DEFAULT_CODE;
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ?? DEFAULT_CODE;
  } catch {
    return DEFAULT_CODE;
  }
};

const App = () => {
  const [code, setCode] = useState(getInitialCode);
  const [errors, setErrors] = useState<LintError[]>([]);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const editorRef = useRef<EditorHandle>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  const runLint = useCallback((source: string) => {
    if (!source.trim()) {
      setErrors([]);
      return;
    }

    setErrors(lintCode(source));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      runLint(code);
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [code, runLint]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore storage failures (private mode, quota)
    }
  }, [code]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleLintNow = () => {
    runLint(code);
  };

  const handleClear = () => {
    setCode("");
    setErrors([]);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyLabel("Copied");
    } catch {
      setCopyLabel("Failed");
    }

    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
    }

    copyTimeoutRef.current = window.setTimeout(() => {
      setCopyLabel("Copy");
    }, 1200);
  };

  const errorCount = errors.filter((err) => err.severity === "error").length;
  const warningCount = errors.filter((err) => err.severity === "warning").length;

  return (
    <div className="app-shell">
      <div className="app-topbar panel-pop">
        <div className="brand">
          <span className="brand-dot" />
          JSLint Studio
        </div>
        <div className="tab-pill">
          <span className="tab-dot" />
          main.js
        </div>
        <div className="control-group">
          <button
            type="button"
            className="control-button control-button-primary"
            onClick={handleLintNow}
            disabled={!code.trim()}
          >
            Lint
          </button>
          <button
            type="button"
            className="control-button"
            onClick={handleCopy}
          >
            {copyLabel}
          </button>
          <button
            type="button"
            className="control-button"
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
        <div className="spacer" />
        <div className="status-group">
          <span className="status-chip status-chip--error">
            {errorCount} Errors
          </span>
          <span className="status-chip status-chip--warning">
            {warningCount} Warnings
          </span>
          <span className="status-chip">{errors.length} Total</span>
        </div>
      </div>

      <div className="app-grid">
        <div className="panel panel-pop">
          <div className="panel-header panel-header--compact">
            <div>
              <div className="panel-title">main.js</div>
              <div className="panel-subtitle">JavaScript</div>
            </div>
            <div className="panel-meta">Autosaved</div>
          </div>
          <Editor
            ref={editorRef}
            value={code}
            onChange={setCode}
            errors={errors}
          />
        </div>

        <ErrorsList
          errors={errors}
          onSelect={(err) => {
            if (err.line) {
              editorRef.current?.revealLine(err.line, err.column);
            }
          }}
        />
      </div>
      <footer className="app-footer">
        <span className="footer-label">Built by</span>
        <a
          className="footer-link"
          href="https://github.com/nookieslaya/"
          target="_blank"
          rel="noreferrer"
        >
          github.com/nookieslaya
        </a>
      </footer>
    </div>
  );
};

export default App;

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import * as monaco from "monaco-editor";
import type { EditorProps } from "./Editor.types";
import type { EditorHandle } from "./Editor.types";
import type { LintError } from "../../types/lint";

type Props = EditorProps & {
  errors?: LintError[];
};

const THEME_NAME = "storm-dark";
let themeDefined = false;

const ensureTheme = () => {
  if (themeDefined) return;
  monaco.editor.defineTheme(THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "e2e8f5" },
      { token: "comment", foreground: "6b7a92", fontStyle: "italic" },
      { token: "keyword", foreground: "79b8ff" },
      { token: "number", foreground: "f3a854" },
      { token: "string", foreground: "8bdc8a" },
      { token: "string.escape", foreground: "ffd479" },
      { token: "identifier", foreground: "d3def5" },
      { token: "variable", foreground: "d3def5" },
      { token: "variable.predefined", foreground: "7fb0ff" },
      { token: "delimiter.parenthesis", foreground: "8ea1bf" },
      { token: "delimiter.bracket", foreground: "8ea1bf" },
      { token: "delimiter.curly", foreground: "8ea1bf" },
      { token: "delimiter", foreground: "8ea1bf" },
    ],
    colors: {
      "editor.background": "#192334",
      "editor.foreground": "#e2e8f5",
      "editor.lineHighlightBackground": "#1f2c42",
      "editorLineNumber.foreground": "#54627a",
      "editorLineNumber.activeForeground": "#a2b0c7",
      "editorCursor.foreground": "#6fd4ff",
      "editor.selectionBackground": "#2c3a52",
      "editor.inactiveSelectionBackground": "#223046",
      "editorIndentGuide.background": "#2a3a52",
      "editorIndentGuide.activeBackground": "#3a4b66",
    },
  });
  themeDefined = true;
};

const Editor = forwardRef<EditorHandle, Props>(
  ({ value, onChange, errors = [] }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const decorationsRef = useRef<string[]>([]);

    // init Monaco
    useEffect(() => {
      if (!containerRef.current || editorRef.current) return;

      ensureTheme();
      editorRef.current = monaco.editor.create(containerRef.current, {
        value,
        language: "javascript",
        theme: THEME_NAME,
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily:
          '"JetBrains Mono", "Fira Code", "Consolas", "Monaco", monospace',
        lineHeight: 22,
        padding: { top: 12, bottom: 12 },
        smoothScrolling: true,
        cursorBlinking: "phase",
      });
      monaco.editor.setTheme(THEME_NAME);

      editorRef.current.onDidChangeModelContent(() => {
        onChange(editorRef.current!.getValue());
      });
    }, []);

    // sync value
    useEffect(() => {
      if (!editorRef.current) return;
      if (editorRef.current.getValue() !== value) {
        editorRef.current.setValue(value);
      }
    }, [value]);

    // highlight errors
    useEffect(() => {
      if (!editorRef.current) return;
      const model = editorRef.current.getModel();
      if (!model) return;

      const decorations = errors.map((err) => ({
        range: new monaco.Range(err.line || 1, 1, err.line || 1, 1),
        options: {
          isWholeLine: true,
          className:
            err.severity === "error"
              ? "monaco-error-line"
              : "monaco-warning-line",
        },
      }));

      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        decorations
      );

      const markers: monaco.editor.IMarkerData[] = errors.map((err) => {
        const startLineNumber = Math.max(1, err.line || 1);
        const startColumn = Math.max(1, err.column || 1);
        const endLineNumber = Math.max(
          startLineNumber,
          err.endLine ?? err.line ?? startLineNumber
        );
        const endColumn = Math.max(
          startColumn,
          err.endColumn ?? startColumn + 1
        );

        return {
          severity:
            err.severity === "error"
              ? monaco.MarkerSeverity.Error
              : monaco.MarkerSeverity.Warning,
          message: err.message,
          startLineNumber,
          startColumn,
          endLineNumber,
          endColumn,
          source: "lint",
        };
      });

      monaco.editor.setModelMarkers(model, "lint", markers);
    }, [errors]);

    // API for App
    useImperativeHandle(ref, () => ({
      revealLine(line: number, column = 1) {
        if (!editorRef.current) return;

        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column });
        editorRef.current.focus();
      },
    }));

    return (
      <div ref={containerRef} className="editor-host" />
    );
  }
);

export default Editor;

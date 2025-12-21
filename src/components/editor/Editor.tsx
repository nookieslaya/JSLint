import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import * as monaco from "monaco-editor";
import type { EditorProps } from "./Editor.types";
import type { EditorHandle } from "./Editor.types";
import type { LintError } from "../../types/lint";

type Props = EditorProps & {
  errors?: LintError[];
};

const Editor = forwardRef<EditorHandle, Props>(
  ({ value, onChange, errors = [] }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const decorationsRef = useRef<string[]>([]);

    // init Monaco
    useEffect(() => {
      if (!containerRef.current || editorRef.current) return;

      editorRef.current = monaco.editor.create(containerRef.current, {
        value,
        language: "javascript",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
      });

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
    }, [errors]);

    // Ð«'Å API dla App
    useImperativeHandle(ref, () => ({
      revealLine(line: number, column = 1) {
        if (!editorRef.current) return;

        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column });
        editorRef.current.focus();
      },
    }));

    return (
      <div
        ref={containerRef}
        className="h-[500px] border rounded-md overflow-hidden"
      />
    );
  }
);

export default Editor;

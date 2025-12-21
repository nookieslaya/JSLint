import { useEffect, useRef, useState } from "react";
import Editor from "../components/editor/Editor";
import type { EditorHandle } from "../components/editor/Editor.types";
import ErrorsList from "../components/errorslist/EditorList";
import { lintCode } from "../services/lintService";
import type { LintError } from "../types/lint";

const App = () => {
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<LintError[]>([]);
  const editorRef = useRef<EditorHandle>(null);

  useEffect(() => {
    if (!code.trim()) {
      setErrors([]);
      return;
    }
    setErrors(lintCode(code));
  }, [code]);

  return (
    <div className="p-6 grid grid-cols-2 gap-6">
      <Editor ref={editorRef} value={code} onChange={setCode} errors={errors} />

      <ErrorsList
        errors={errors}
        onSelect={(err) => {
          if (err.line) {
            editorRef.current?.revealLine(err.line, err.column);
          }
        }}
      />
    </div>
  );
};

export default App;

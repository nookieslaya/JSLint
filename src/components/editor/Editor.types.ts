export type EditorProps = {
  value: string;
  onChange: (code: string) => void;
};

export type EditorHandle = {
  revealLine: (line: number, column?: number) => void;
};
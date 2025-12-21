export type LintSeverity = "error" | "warning";

export type Fix = {
  type: "remove";
  start: number;
  end: number;
};

export type LintError = {
  ruleId?: string | null;
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  severity: LintSeverity;
  fix?: Fix; // 👈 NOWE, opcjonalne
};
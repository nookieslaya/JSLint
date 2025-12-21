import type { LintError } from "../../types/lint";

export type ErrorsListProps = {
  errors: LintError[];
  onSelect?: (error: LintError) => void;
  title?: string;
};
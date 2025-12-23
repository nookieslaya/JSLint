import * as Babel from "@babel/standalone/babel.min.js";
import type { LintError } from "../types/lint";

/* =======================
   TYPES
======================= */

type Loc = {
  line: number;
  column: number;
};

type Decl = {
  loc: Loc;
  kind: "var" | "let" | "const" | "param" | "function";
  startIndex: number;
  endIndex: number;
};

type Scope = {
  declared: Map<string, Decl>;
  used: Set<string>;
};

/* =======================
   GLOBALS (browser env)
======================= */

const GLOBALS = new Set([
  "console",
  "window",
  "document",
  "name",
  "location",
  "navigator",
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
]);

/* =======================
   LINTER
======================= */

export function lintCode(code: string): LintError[] {
  const errors: LintError[] = [];
  const scopeStack: Scope[] = [];

  // deduplicate unused warnings
  const reportedUnused = new Set<number>();

  /* ---------- scope helpers ---------- */

  const enterScope = () => {
    scopeStack.push({
      declared: new Map(),
      used: new Set(),
    });
  };

  const exitScope = () => {
    const scope = scopeStack.pop();
    if (!scope) return;

    scope.declared.forEach((decl, name) => {
      if (scope.used.has(name)) return;

      // do not report the same declaration twice
      if (reportedUnused.has(decl.startIndex)) return;

      reportedUnused.add(decl.startIndex);

      errors.push({
        message: `'${name}' is declared but never used`,
        line: decl.loc.line,
        column: decl.loc.column,
        severity: "warning",
        fix: {
          type: "remove",
          start: decl.startIndex,
          end: decl.endIndex,
        },
      });
    });
  };

  /* ---------- declare / use ---------- */

  const getSuggestion = (name: string) => {
    const candidates = new Set<string>();

    for (let i = scopeStack.length - 1; i >= 0; i--) {
      scopeStack[i].declared.forEach((_decl, key) => {
        candidates.add(key);
      });
    }

    GLOBALS.forEach((globalName) => candidates.add(globalName));

    const lowerName = name.toLowerCase();
    for (const candidate of candidates) {
      if (candidate.toLowerCase() === lowerName && candidate !== name) {
        return candidate;
      }
    }

    const maxDistance =
      name.length <= 3 ? 1 : name.length <= 6 ? 2 : 3;

    let best: { name: string; distance: number } | null = null;

    for (const candidate of candidates) {
      if (Math.abs(candidate.length - name.length) > maxDistance) {
        continue;
      }

      const distance = levenshtein(name, candidate);
      if (distance <= maxDistance) {
        if (!best || distance < best.distance) {
          best = { name: candidate, distance };
        }
      }
    }

    return best?.name ?? null;
  };

  const declare = (
    name: string,
    kind: Decl["kind"],
    loc: Loc,
    startIndex: number,
    endIndex: number
  ) => {
    const scope = scopeStack[scopeStack.length - 1];

    // do not overwrite (hoisting + TDZ)
    if (!scope.declared.has(name)) {
      scope.declared.set(name, {
        kind,
        loc,
        startIndex,
        endIndex,
      });
    }
  };

  const use = (name: string, loc: Loc) => {
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      const decl = scopeStack[i].declared.get(name);
      if (decl) {
        scopeStack[i].used.add(name);

        // TDZ check
        if (
          (decl.kind === "let" ||
            decl.kind === "const" ||
            decl.kind === "param") &&
          loc.line < decl.loc.line
        ) {
          errors.push({
            message: `'${name}' is used before declaration (TDZ)`,
            line: loc.line,
            column: loc.column,
            severity: "error",
          });
        }

        return;
      }
    }

    if (GLOBALS.has(name)) return;

    const suggestion = getSuggestion(name);
    const message = suggestion
      ? `'${name}' is not defined. Did you mean '${suggestion}'?`
      : `'${name}' is not defined`;

    errors.push({
      message,
      line: loc.line,
      column: loc.column,
      severity: "error",
    });
  };

  const levenshtein = (a: string, b: string) => {
    if (a === b) return 0;

    const aLen = a.length;
    const bLen = b.length;

    if (aLen === 0) return bLen;
    if (bLen === 0) return aLen;

    const row = new Array<number>(bLen + 1);
    for (let j = 0; j <= bLen; j++) {
      row[j] = j;
    }

    for (let i = 1; i <= aLen; i++) {
      let prevDiagonal = row[0];
      row[0] = i;

      for (let j = 1; j <= bLen; j++) {
        const temp = row[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        row[j] = Math.min(
          row[j] + 1,
          row[j - 1] + 1,
          prevDiagonal + cost
        );
        prevDiagonal = temp;
      }
    }

    return row[bLen];
  };

  /* ---------- HOIST DECLARATIONS ---------- */
  const hoistDeclarations = (path: any) => {
    path.traverse({
      VariableDeclarator(p: any) {
        if (p.node.id.type !== "Identifier") return;

        const kind =
          p.parent.kind === "var"
            ? "var"
            : p.parent.kind === "let"
            ? "let"
            : "const";

        declare(
          p.node.id.name,
          kind,
          p.node.loc.start,
          p.node.start,
          p.node.end
        );
      },
    });
  };

  /* =======================
     BABEL TRANSFORM
  ======================= */

  try {
    Babel.transform(code, {
      ast: true,
      code: false,
      sourceType: "module",

      plugins: [
        function () {
          return {
            visitor: {
              /* ---------- GLOBAL ---------- */
              Program: {
                enter(path: any) {
                  enterScope();
                  hoistDeclarations(path);
                },
                exit() {
                  exitScope();
                },
              },

              /* ---------- BLOCK ---------- */
              BlockStatement: {
                enter(path: any) {
                  enterScope();
                  hoistDeclarations(path);
                },
                exit() {
                  exitScope();
                },
              },

              /* ---------- FUNCTION ---------- */
              FunctionDeclaration: {
                enter(path: any) {
                  if (path.node.id) {
                    declare(
                      path.node.id.name,
                      "function",
                      path.node.loc.start,
                      path.node.start,
                      path.node.end
                    );
                  }

                  enterScope();
                  hoistDeclarations(path);

                  path.node.params.forEach((param: any) => {
                    if (param.type === "Identifier") {
                      declare(
                        param.name,
                        "param",
                        param.loc.start,
                        param.start,
                        param.end
                      );
                    }
                  });
                },
                exit() {
                  exitScope();
                },
              },

              /* ---------- ARROW ---------- */
              ArrowFunctionExpression: {
                enter(path: any) {
                  enterScope();
                  hoistDeclarations(path);

                  path.node.params.forEach((param: any) => {
                    if (param.type === "Identifier") {
                      declare(
                        param.name,
                        "param",
                        param.loc.start,
                        param.start,
                        param.end
                      );
                    }
                  });
                },
                exit() {
                  exitScope();
                },
              },

              /* ---------- IDENTIFIER ---------- */
              Identifier(path: any) {
                const parent = path.parent;

                if (
                  parent.type === "VariableDeclarator" &&
                  parent.id === path.node
                )
                  return;

                if (
                  parent.type === "FunctionDeclaration" &&
                  parent.id === path.node
                )
                  return;

                if (
                  parent.type === "FunctionDeclaration" &&
                  parent.params.includes(path.node)
                )
                  return;

                if (
                  parent.type === "ArrowFunctionExpression" &&
                  parent.params.includes(path.node)
                )
                  return;

                if (
                  parent.type === "MemberExpression" &&
                  parent.property === path.node &&
                  !parent.computed
                )
                  return;

                use(path.node.name, path.node.loc.start);
              },
            },
          };
        },
      ],
    });
  } catch (err: any) {
    errors.push({
      message: err.message,
      line: err.loc?.line ?? 1,
      column: err.loc?.column ?? 1,
      severity: "error",
      ruleId: "syntax",
    });
  }

  return errors;
}

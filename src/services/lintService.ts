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

  // 🔁 deduplikacja unused warnings
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

      // ⛔ nie zgłaszamy tej samej deklaracji 2×
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

  const declare = (
    name: string,
    kind: Decl["kind"],
    loc: Loc,
    startIndex: number,
    endIndex: number
  ) => {
    const scope = scopeStack[scopeStack.length - 1];

    // nie nadpisujemy (hoisting + TDZ)
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

        // 🔥 TDZ
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

    errors.push({
      message: `'${name}' is not defined`,
      line: loc.line,
      column: loc.column,
      severity: "error",
    });
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
      line: err.loc?.line ?? 0,
      column: err.loc?.column ?? 0,
      severity: "error",
    });
  }

  return errors;
}

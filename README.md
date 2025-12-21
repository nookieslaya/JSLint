# JSLint Studio

A lightweight JavaScript lint playground built with React, Vite, and Monaco Editor. It focuses on fast feedback, a dark IDE-style UI, and a small set of custom lint rules.

## Features
- Monaco editor with custom dark theme, squiggles, and line highlights.
- Custom lint rules: undefined identifiers, TDZ (use before declaration), and unused declarations.
- Debounced linting + manual "Lint" action.
- Issues panel with filters and search.
- Copy/Clear controls and autosave via localStorage.

## Getting started
```bash
npm install
npm run dev
```

Open the printed Vite URL (usually `http://localhost:5173`).

## Scripts
- `npm run dev` - start dev server
- `npm run build` - typecheck + production build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint

## How the linter works
The linter uses Babel to build an AST and then checks:
- **Undefined identifiers** (not declared in scope and not in the browser globals list)
- **TDZ** for `let`, `const`, and parameters (use before declaration)
- **Unused declarations** (with fix metadata)

Parser errors are reported as a single error entry.

## Project structure
- `src/app/App.tsx` - application shell, toolbar, and lint orchestration
- `src/components/editor/Editor.tsx` - Monaco editor setup and theming
- `src/components/errorslist/EditorList.tsx` - issues panel UI, filters, and search
- `src/services/lintService.ts` - lint engine and rules
- `src/types/lint.ts` - lint data types
- `src/index.css` - global theme and UI styling

## Notes
- This is not a full ESLint replacement; the rules are intentionally minimal.
- LocalStorage key: `jslint:code`.

## License
MIT

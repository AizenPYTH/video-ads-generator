import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // TypeScript already rejects `any`; this catches the implicit ones the
      // compiler lets through in JSX prop spreads.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
  {
    // Mirrored from backend/remotion/src by scripts/sync-video.mjs. It is
    // Remotion code, not app code: templates export a definition object
    // next to their component by design, and fast refresh does not matter
    // for a module that only ever renders inside a Player.
    files: ["src/video/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
      // The 3D engine drives three.js imperatively - textures marked dirty,
      // canvases painted, a camera repositioned - from effects and the frame
      // loop. The React Compiler's immutability model calls that a mutation
      // of a hook result; the app does not use the compiler, and the engine
      // is mirrored from the renderer, where these are the correct calls.
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
    },
  },
);

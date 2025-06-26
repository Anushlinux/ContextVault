import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "ContextVault",
    description:
      "Secure storage and verification of user context data on blockchain",
    permissions: ["storage", "activeTab", "clipboardRead", "clipboardWrite"],
    host_permissions: [
      "http://127.0.0.1:5050/*",
      "https://api.pinata.cloud/*",
      "https://*.ipfs.w3s.link/*",
      "https://chat.openai.com/*",
      "https://claude.ai/*",
      "https://gemini.google.com/*",
    ],
    content_scripts: [
      {
        matches: ["https://chat.openai.com/*"],
        js: ["entrypoints/chatgpt/content.ts"],
        run_at: "document_idle",
      },
      {
        matches: ["https://claude.ai/*"],
        js: ["entrypoints/claude/content.ts"],
        run_at: "document_idle",
      },
      {
        matches: ["https://gemini.google.com/*"],
        js: ["entrypoints/gemini/content.ts"],
        run_at: "document_idle",
      },
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
    extends: "wxt/tsconfig",
    compilerOptions: {
      strict: true,
      baseUrl: ".",
      paths: {
        "@/*": ["src/*"],
      },
    },
    include: ["src"],
  },
});

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
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'",
    },
  },
  // Environment variables are not supported directly in UserConfig
  // You can manage environment variables separately in your project setup
});

// extension/entrypoints/content/chatgpt.ts
export default defineContentScript({
  matches: ["https://chat.openai.com/*", "https://chatgpt.com/*"],
  main() {
    console.log("ContextVault: ChatGPT content script loaded");

    let cachedContext: any = null;
    let injectionAttempted = false;

    // Listen for context updates
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "context-updated") {
        cachedContext = null;
        injectionAttempted = false;
        console.log(
          "ContextVault: Context cache cleared, will retry injection"
        );
      }
    });

    // Get context from background
    async function getContext() {
      if (cachedContext) return cachedContext;

      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "get-context" }, (response) => {
          console.log("ContextVault: Context response:", response);
          cachedContext = response;
          resolve(response);
        });
      });
    }

    // Build context prompt
    function buildContextPrompt(context: any): string {
      if (!context) return "";

      let prompt = "[CONTEXT]\n";

      if (context.projectDetails?.name) {
        prompt += `Project: ${context.projectDetails.name}\n`;
      }

      if (context.projectDetails?.description) {
        prompt += `Description: ${context.projectDetails.description}\n`;
      }

      if (context.preferences?.language) {
        prompt += `Preferred Language: ${context.preferences.language}\n`;
      }

      if (context.preferences?.codingStyle) {
        prompt += `Coding Style: ${context.preferences.codingStyle}\n`;
      }

      prompt += "\n---\n\n";
      return prompt;
    }

    // Multiple selectors for different ChatGPT versions
    function findTextArea(): HTMLElement | null {
      const selectors = [
        'textarea[data-id="root"]', // Current ChatGPT
        'textarea[placeholder*="Message"]', // Alternative
        'div[contenteditable="true"]', // Rich text editor
        "textarea#prompt-textarea", // Older version
        "form textarea", // Generic form textarea
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          console.log(
            `ContextVault: Found textarea with selector: ${selector}`
          );
          return element;
        }
      }
      return null;
    }

    // Inject context with multiple methods
    async function injectContext(element: HTMLElement, forceInject = false) {
      if (!forceInject && element.dataset.contextInjected === "true") {
        console.log("ContextVault: Already injected, skipping");
        return;
      }

      // Check if element has content
      const currentValue = (element as any).value || element.textContent || "";
      if (!forceInject && currentValue.trim() !== "") {
        console.log(
          "ContextVault: Element not empty, skipping injection. Content:",
          currentValue.substring(0, 50)
        );
        return;
      }

      const context = await getContext();
      if (!context) {
        console.log("ContextVault: No context available for injection");
        return;
      }

      const contextPrompt = buildContextPrompt(context);
      console.log("ContextVault: Generated prompt:", contextPrompt);

      if (contextPrompt && contextPrompt.length > 20) {
        // Try multiple injection methods
        if (element.tagName === "TEXTAREA") {
          // For textarea elements
          (element as HTMLTextAreaElement).value = contextPrompt;
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (element.contentEditable === "true") {
          // For contenteditable divs
          element.textContent = contextPrompt;
          element.dispatchEvent(new Event("input", { bubbles: true }));
        }

        element.dataset.contextInjected = "true";
        injectionAttempted = true;
        console.log("ContextVault: ✅ Context injected successfully!");

        // Focus the element to make sure it's active
        element.focus();
      }
    }

    // Watch for textarea and set up injection
    function setupInjection() {
      const element = findTextArea();
      if (!element) {
        console.log("ContextVault: No textarea found yet, will retry...");
        return false;
      }

      if (element.dataset.contextListener === "true") {
        return true; // Already set up
      }

      console.log("ContextVault: Setting up injection on element:", element);
      element.dataset.contextListener = "true";

      // Multiple trigger events
      element.addEventListener("focus", () => {
        console.log("ContextVault: Element focused, attempting injection...");
        setTimeout(() => injectContext(element), 200);
      });

      element.addEventListener("click", () => {
        console.log("ContextVault: Element clicked, attempting injection...");
        setTimeout(() => injectContext(element), 200);
      });

      // Try immediate injection if element is empty
      const currentValue = (element as any).value || element.textContent || "";
      if (currentValue.trim() === "" && !injectionAttempted) {
        console.log("ContextVault: Attempting immediate injection...");
        setTimeout(() => injectContext(element), 1000);
      }

      return true;
    }

    // Observe DOM changes and retry setup
    function observeAndSetup() {
      let retryCount = 0;
      const maxRetries = 20;

      const trySetup = () => {
        if (setupInjection()) {
          console.log("ContextVault: Injection setup complete");
          return;
        }

        retryCount++;
        if (retryCount < maxRetries) {
          console.log(
            `ContextVault: Retry attempt ${retryCount}/${maxRetries}`
          );
          setTimeout(trySetup, 1000);
        } else {
          console.log("ContextVault: Max retries reached, setting up observer");

          // Fallback to mutation observer
          const observer = new MutationObserver(() => {
            setupInjection();
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true,
          });
        }
      };

      trySetup();
    }

    // Add manual injection button for testing
    function addDebugButton() {
      const button = document.createElement("button");
      button.textContent = "Inject Context (Debug)";
      button.style.position = "fixed";
      button.style.top = "10px";
      button.style.right = "10px";
      button.style.zIndex = "9999";
      button.style.backgroundColor = "#007bff";
      button.style.color = "white";
      button.style.border = "none";
      button.style.padding = "10px";
      button.style.borderRadius = "5px";
      button.style.cursor = "pointer";

      button.addEventListener("click", async () => {
        const element = findTextArea();
        if (element) {
          await injectContext(element, true); // Force inject
        } else {
          console.log("No textarea found for manual injection");
        }
      });

      document.body.appendChild(button);
    }

    // Start the process
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        observeAndSetup();
        addDebugButton(); // Remove this in production
      });
    } else {
      observeAndSetup();
      addDebugButton(); // Remove this in production
    }
  },
});

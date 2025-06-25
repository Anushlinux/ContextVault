// extension/entrypoints/content.ts
import { defineContentScript } from "#imports";
import { loadUserContext, type UserContext } from "../lib/contextManager";

// This is the required default export for WXT.
export default defineContentScript({
  // Tell WXT which websites this script should run on.
  // This is cleaner than checking window.location inside your code.
  matches: ["*://*.chatgpt.com/*", "*://*.claude.ai/*"],

  // WXT will run this main function when the page loads.
  main: async () => {
    console.log(
      "ContextVault content script loaded on:",
      window.location.hostname
    );

    const context = await loadUserContext();
    if (!context) {
      console.log("No user context found. Aborting injection.");
      return;
    }

    // Decide which injector to use based on the current site
    if (window.location.hostname.includes("chatgpt.com")) {
      injectContext(
        'textarea[data-id="root"]', // ChatGPT's selector
        generateContextPrompt(context)
      );
    } else if (window.location.hostname.includes("claude.ai")) {
      injectContext(
        'div[contenteditable="true"]', // Claude's selector
        generateContextPrompt(context)
      );
    }
  },
});

/**
 * A generic function to inject context into a target element.
 * @param selector The CSS selector for the text area or editable div.
 * @param prompt The context string to inject.
 */
function injectContext(selector: string, prompt: string) {
  const observer = new MutationObserver(() => {
    const textArea = document.querySelector(selector);

    if (textArea && !textArea.hasAttribute("data-context-injected")) {
      textArea.setAttribute("data-context-injected", "true");

      textArea.addEventListener("focus", () => {
        const currentContent =
          (textArea as HTMLTextAreaElement).value ?? textArea.textContent;
        if (currentContent === "") {
          if (textArea instanceof HTMLTextAreaElement) {
            textArea.value = prompt + "\n\n";
          } else if (textArea instanceof HTMLElement) {
            textArea.textContent = prompt + "\n\n";
          }
        }
      });
      // We found the element, we can stop observing to save resources.
      // Or keep it if the element might be removed and re-added later.
      // observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function generateContextPrompt(context: UserContext): string {
  // Return early if project details are missing to avoid an empty prompt
  if (!context.projectDetails.name)
    return "[CONTEXT VAULT] No project details set.";

  return `[CONTEXT] I'm working on ${context.projectDetails.name}: ${
    context.projectDetails.description
  }. Tech stack: ${context.projectDetails.techStack.join(
    ", "
  )}. My coding style: ${
    context.preferences.codingStyle
  }. Preferred language: ${context.preferences.language}.`;
}

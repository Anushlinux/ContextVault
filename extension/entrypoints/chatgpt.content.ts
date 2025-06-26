// extension/entrypoints/chatgpt.content.ts
export default defineContentScript({
  matches: ["*://chat.openai.com/*", "*://chatgpt.com/*"],
  main() {
    console.log("🔥 ContextVault: ChatGPT content script loaded!");

    // Show loading indicator
    const testDiv = document.createElement("div");
    testDiv.textContent = "ContextVault Active";
    testDiv.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: green;
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      z-index: 9999;
      font-size: 12px;
    `;

    setTimeout(() => {
      document.body.appendChild(testDiv);
      setTimeout(() => testDiv.remove(), 3000);
    }, 1000);

    // Listen for injection messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("🎯 Content script received message:", message);

      if (message.type === "inject-context") {
        injectContextToTextarea(message.context);
        sendResponse({ success: true });
      }
    });

    function buildContextPrompt(context: any): string {
      let prompt = "[CONTEXT]\n";

      if (context.projectDetails?.name) {
        prompt += `Project: ${context.projectDetails.name}\n`;
      }

      if (context.projectDetails?.description) {
        prompt += `Description: ${context.projectDetails.description}\n`;
      }

      if (context.preferences?.language) {
        prompt += `Language: ${context.preferences.language}\n`;
      }

      if (context.preferences?.codingStyle) {
        prompt += `Style: ${context.preferences.codingStyle}\n`;
      }

      prompt += "\n---\n\n";
      return prompt;
    }

    function findChatGPTTextarea(): HTMLElement | null {
      // Multiple selectors for different ChatGPT layouts
      const selectors = [
        'textarea[data-id="root"]',
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="Send a message"]',
        'div[contenteditable="true"][data-id="root"]',
        'div[contenteditable="true"]',
        "form textarea",
        "#prompt-textarea",
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          console.log(`✅ Found textarea: ${selector}`);
          return element;
        }
      }

      console.log("❌ No textarea found. Available elements:");
      console.log("Textareas:", document.querySelectorAll("textarea"));
      console.log(
        "Contenteditable:",
        document.querySelectorAll('[contenteditable="true"]')
      );
      return null;
    }

    function injectContextToTextarea(context: any) {
      console.log("🎯 Starting injection with context:", context);

      const textarea = findChatGPTTextarea();
      if (!textarea) {
        console.log("❌ No textarea found for injection");
        return;
      }

      const prompt = buildContextPrompt(context);
      console.log("📝 Generated prompt:", prompt);

      // Different injection methods for different element types
      if (textarea.tagName.toLowerCase() === "textarea") {
        console.log("📝 Injecting into TEXTAREA element");

        // Method 1: Direct value assignment
        (textarea as HTMLTextAreaElement).value = prompt;

        // Method 2: Trigger multiple events to ensure ChatGPT detects the change
        textarea.dispatchEvent(new Event("focus", { bubbles: true }));
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
        textarea.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
        textarea.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));

        // Method 3: Simulate typing (more aggressive)
        textarea.focus();
        setTimeout(() => {
          (textarea as HTMLTextAreaElement).value = prompt;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));

          // Trigger React's internal event system
          const descriptor = Object.getOwnPropertyDescriptor(
            HTMLTextAreaElement.prototype,
            "value"
          );
          if (descriptor && descriptor.set) {
            descriptor.set.call(textarea, prompt);
          }

          // Force React update
          textarea.dispatchEvent(
            new Event("input", { bubbles: true, cancelable: true })
          );
        }, 100);
      } else if (textarea.contentEditable === "true") {
        console.log("📝 Injecting into CONTENTEDITABLE element");

        // For contenteditable divs
        textarea.textContent = prompt;
        textarea.innerHTML = prompt.replace(/\n/g, "<br>");

        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("keyup", { bubbles: true }));
        textarea.focus();
      }

      console.log("✅ Injection completed");

      // Visual feedback
      const feedback = document.createElement("div");
      feedback.textContent = "✅ Context Injected!";
      feedback.style.cssText = `
        position: fixed;
        top: 50px;
        left: 10px;
        background: #4CAF50;
        color: white;
        padding: 10px 15px;
        border-radius: 4px;
        z-index: 9999;
        font-size: 14px;
        font-weight: bold;
      `;
      document.body.appendChild(feedback);
      setTimeout(() => feedback.remove(), 3000);
    }

    // Auto-injection on page load/focus
    function setupAutoInjection() {
      let hasInjected = false;

      const attemptAutoInject = () => {
        if (hasInjected) return;

        chrome.runtime.sendMessage({ type: "get-context" }, (context) => {
          if (context && !hasInjected) {
            const textarea = findChatGPTTextarea();
            if (textarea) {
              const currentValue =
                (textarea as any).value || textarea.textContent || "";
              if (currentValue.trim() === "") {
                console.log("🎯 Auto-injecting context on page load");
                injectContextToTextarea(context);
                hasInjected = true;
              }
            }
          }
        });
      };

      // Try auto-injection after page loads
      setTimeout(attemptAutoInject, 2000);

      // Also try when user clicks on textarea
      document.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (
          target.tagName.toLowerCase() === "textarea" ||
          target.contentEditable === "true"
        ) {
          setTimeout(attemptAutoInject, 500);
        }
      });
    }

    // Start auto-injection setup
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setupAutoInjection);
    } else {
      setupAutoInjection();
    }
  },
});

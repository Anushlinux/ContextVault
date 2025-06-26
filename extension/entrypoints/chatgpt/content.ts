import { ensureContext } from "../../content/common";

const selector = "form textarea";

observeAndInject();

function observeAndInject() {
  const o = new MutationObserver(() => inject());
  o.observe(document.body, { childList: true, subtree: true });
}

export async function inject() {
  const box = document.querySelector<HTMLTextAreaElement>(selector);
  if (!box || box.dataset.vaultInjected) return;

  box.dataset.vaultInjected = "1";
  box.addEventListener("focus", async () => {
    if (box.value.trim()) return;
    const ctx = await ensureContext();
    if (!ctx) return;

    const prompt = buildPrompt(ctx);
    box.value = `${prompt}\n\n`;
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function buildPrompt(ctx: any) {
  return (
    `[CONTEXT]\nProject: ${ctx.projectDetails?.name}\n` +
    `Description: ${ctx.projectDetails?.description}\n` +
    `Language: ${ctx.preferences?.language}`
  );
}

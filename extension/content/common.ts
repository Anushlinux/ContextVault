let cached: any = null;

export async function ensureContext() {
  if (cached) return cached;

  cached = await new Promise<any>((res) =>
    chrome.runtime.sendMessage({ type: "get-context" }, res)
  );
  return cached;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "context-updated") cached = null;
});

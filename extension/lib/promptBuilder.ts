// Builds a ChatGPT- / Gemini-friendly context block
// -----------------------------------------------
export function buildEnhancedPrompt(ctx: any): string {
  const lines: string[] = [];

  // Header
  lines.push("[CONTEXT]");
  lines.push(
    "Here's an up-to-date summary of the user’s project and preferences."
  );
  lines.push(""); // blank line

  /* ---- Project details ------------------------------------ */
  if (ctx.projectDetails) {
    const {
      name = "N/A",
      description = "N/A",
      techStack = [],
    } = ctx.projectDetails;
    lines.push(`• Project Name : **${name}**`);
    lines.push(`• Description : ${description}`);
    if (techStack.length) lines.push(`• Tech Stack  : ${techStack.join(", ")}`);
    lines.push("");
  }

  /* ---- User preferences ----------------------------------- */
  if (ctx.preferences) {
    const {
      language = "N/A",
      codingStyle = "N/A",
      frameworks = [],
    } = ctx.preferences;
    lines.push("• Preferences");
    lines.push(`    – Preferred Language : ${language}`);
    lines.push(`    – Coding Style       : ${codingStyle}`);
    if (frameworks.length)
      lines.push(`    – Frameworks        : ${frameworks.join(", ")}`);
    lines.push("");
  }

  /* ---- Recent conversations (last 3) ---------------------- */
  if (ctx.conversationHistory?.length) {
    const last3 = ctx.conversationHistory.slice(-3);
    lines.push(`• Recent Conversations (${last3.length})`);
    last3.forEach(({ platform = "Unknown", timestamp = "", context = "" }) => {
      const snippet =
        context.replace(/\s+/g, " ").slice(0, 100) +
        (context.length > 100 ? "…" : "");
      lines.push(`    – [${platform} @ ${timestamp}] ${snippet}`);
    });
    lines.push("");
  }

  lines.push(
    "Please use this context to generate precise and relevant answers."
  );

  const block = lines.join("\n");

  // Hard cap ≈ 4 000 characters (≈ 1 000 tokens)
  return block.length > 4000 ? block.slice(0, 3997) + "…" : block;
}

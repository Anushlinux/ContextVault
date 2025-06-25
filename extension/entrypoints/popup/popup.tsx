// extension/entrypoints/popup/Popup.tsx
import { useState, useEffect } from "react";
import {
  saveUserContext,
  loadUserContext,
  UserContext,
} from "../../lib/contextManager";

export default function Popup() {
  const [context, setContext] = useState<UserContext | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    loadUserContext().then((ctx) => {
      setContext(
        ctx || {
          preferences: { codingStyle: "", language: "", frameworks: [] },
          projectDetails: { name: "", description: "", techStack: [] },
          conversationHistory: [],
        }
      );
      setStatus(ctx ? "Context loaded" : "No context found");
    });
  }, []);

  const handleSave = async () => {
    if (!context) return;
    setSaving(true);
    try {
      const cid = await saveUserContext(context);
      setStatus(`Context saved: ${cid.slice(0, 8)}...`);
    } catch (error) {
      setStatus(
        `Save failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
    setSaving(false);
  };

  if (!context) return <div>Loading...</div>;

  return (
    <div style={{ padding: 16, width: 400 }}>
      <h2>ContextVault</h2>

      <div style={{ marginBottom: 16 }}>
        <h3>Project Details</h3>
        <input
          placeholder="Project name"
          value={context.projectDetails.name}
          onChange={(e) =>
            setContext({
              ...context,
              projectDetails: {
                ...context.projectDetails,
                name: e.target.value,
              },
            })
          }
        />
        <textarea
          placeholder="Project description"
          value={context.projectDetails.description}
          onChange={(e) =>
            setContext({
              ...context,
              projectDetails: {
                ...context.projectDetails,
                description: e.target.value,
              },
            })
          }
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <h3>Preferences</h3>
        <select
          value={context.preferences.language}
          onChange={(e) =>
            setContext({
              ...context,
              preferences: { ...context.preferences, language: e.target.value },
            })
          }
        >
          <option value="">Select language</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="rust">Rust</option>
        </select>
      </div>

      <button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Context"}
      </button>

      <p style={{ fontSize: 12, color: "#666" }}>{status}</p>
    </div>
  );
}

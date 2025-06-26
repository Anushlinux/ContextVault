// extension/entrypoints/popup/Popup.tsx
import { useState, useEffect } from "react";
import {
  saveUserContext,
  loadUserContext,
  UserContext,
} from "../../lib/contextManager";
import { guardedSave } from "../../lib/guard";
import { connectWallet } from "../../lib/auth";

export default function Popup() {
  const [context, setContext] = useState<UserContext | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Connecting to wallet...");
  const [debugStatus, setDebugStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"project" | "preferences">(
    "project"
  );
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const account = await connectWallet();
        setWalletAddress(account.address);
        const ctx = await loadUserContext();
        setContext(ctx || createEmptyContext());
        setStatus(ctx ? "Context loaded" : "No context found");
      } catch (error) {
        setStatus("🔑 Please connect wallet to continue");
        setContext(createEmptyContext());
      }
    };
    initialize();
  }, []);

  const createEmptyContext = (): UserContext => ({
    preferences: { codingStyle: "", language: "", frameworks: [] },
    projectDetails: { name: "", description: "", techStack: [] },
    conversationHistory: [],
  });

  const handleConnect = async () => {
    try {
      const account = await connectWallet();
      setWalletAddress(account.address);
      setStatus("Wallet connected!");
    } catch (error) {
      setStatus(
        `Connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleSave = async () => {
    if (!context) return;
    setSaving(true);
    setStatus("Awaiting signature...");
    try {
      const cid = await guardedSave(context);
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

  const handleDebugInject = async () => {
    setDebugStatus("Testing injection...");

    try {
      const currentContext = await loadUserContext();
      if (!currentContext) {
        setDebugStatus("❌ No context to inject");
        return;
      }

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab.id) {
        setDebugStatus("❌ No active tab");
        return;
      }

      if (
        !tab.url?.includes("chat.openai.com") &&
        !tab.url?.includes("chatgpt.com")
      ) {
        setDebugStatus("❌ Please open ChatGPT first");
        return;
      }

      chrome.tabs.sendMessage(
        tab.id,
        {
          type: "inject-context",
          context: currentContext,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            setDebugStatus(
              `❌ Content script not loaded: ${chrome.runtime.lastError.message}`
            );
          } else {
            setDebugStatus("✅ Injection attempted - check ChatGPT");
          }
        }
      );
    } catch (error) {
      setDebugStatus(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    setTimeout(() => setDebugStatus(""), 5000);
  };

  if (!context) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading ContextVault...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🔗</span>
          <h1 style={styles.title}>ContextVault</h1>
        </div>
        {walletAddress && (
          <div style={styles.statusBadge}>
            <span style={styles.statusDot}></span>
            <span style={styles.statusText}>
              {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
            </span>
          </div>
        )}
      </div>

      {!walletAddress ? (
        <div style={styles.connectWalletContainer}>
          <button onClick={handleConnect} style={styles.primaryButton}>
            🔑 Connect Starknet Wallet
          </button>
          <p style={styles.statusMessage}>{status}</p>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div style={styles.tabContainer}>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === "project" ? styles.activeTab : {}),
              }}
              onClick={() => setActiveTab("project")}
            >
              📁 Project
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === "preferences" ? styles.activeTab : {}),
              }}
              onClick={() => setActiveTab("preferences")}
            >
              ⚙️ Preferences
            </button>
          </div>

          {/* Content */}
          <div style={styles.content}>
            {activeTab === "project" && (
              <div style={styles.section}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Project Name</label>
                  <input
                    style={styles.input}
                    placeholder="Enter your project name..."
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
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Project Description</label>
                  <textarea
                    style={styles.textarea}
                    placeholder="Describe your project, its goals, and key requirements..."
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
                    rows={4}
                  />
                </div>
              </div>
            )}

            {activeTab === "preferences" && (
              <div style={styles.section}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Preferred Language</label>
                  <select
                    style={styles.select}
                    value={context.preferences.language}
                    onChange={(e) =>
                      setContext({
                        ...context,
                        preferences: {
                          ...context.preferences,
                          language: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="">Select language...</option>
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="rust">Rust</option>
                    <option value="go">Go</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Coding Style</label>
                  <input
                    style={styles.input}
                    placeholder="e.g., functional, clean architecture, TDD..."
                    value={context.preferences.codingStyle}
                    onChange={(e) =>
                      setContext({
                        ...context,
                        preferences: {
                          ...context.preferences,
                          codingStyle: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={styles.actionContainer}>
            <button
              style={{
                ...styles.primaryButton,
                ...(saving ? styles.savingButton : {}),
              }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span style={styles.buttonSpinner}></span>
                  Saving...
                </>
              ) : (
                <>💾 Save Context</>
              )}
            </button>

            <button style={styles.secondaryButton} onClick={handleDebugInject}>
              🎯 Test Injection
            </button>
          </div>

          {/* Status Messages */}
          <div style={styles.statusContainer}>
            {status && (
              <div
                style={{
                  ...styles.statusMessage,
                  ...(status.includes("saved")
                    ? styles.successMessage
                    : status.includes("failed")
                    ? styles.errorMessage
                    : styles.infoMessage),
                }}
              >
                {status}
              </div>
            )}

            {debugStatus && (
              <div
                style={{
                  ...styles.statusMessage,
                  ...(debugStatus.includes("✅")
                    ? styles.successMessage
                    : styles.errorMessage),
                }}
              >
                {debugStatus}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: "420px",
    minHeight: "500px",
    background: "#0d1117",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: "#f0f6fc",
    overflow: "hidden",
  },
  connectWalletContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    gap: "16px",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "500px",
    color: "#8b949e",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #21262d",
    borderTop: "3px solid #f0f6fc",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  },
  loadingText: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "500",
  },
  header: {
    padding: "20px 24px 16px",
    background: "#161b22",
    borderBottom: "1px solid #21262d",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoIcon: {
    fontSize: "24px",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "600",
    color: "#f0f6fc",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 12px",
    background: "#21262d",
    borderRadius: "12px",
    border: "1px solid #30363d",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#7c3aed",
    animation: "pulse 2s infinite",
  },
  statusText: {
    fontSize: "12px",
    color: "#8b949e",
    fontWeight: "500",
  },
  tabContainer: {
    display: "flex",
    background: "#161b22",
    padding: "4px",
    margin: "0 24px 20px",
    borderRadius: "8px",
    gap: "2px",
    border: "1px solid #21262d",
  },
  tab: {
    flex: 1,
    padding: "12px 16px",
    border: "none",
    borderRadius: "6px",
    background: "transparent",
    color: "#8b949e",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  activeTab: {
    background: "#21262d",
    color: "#f0f6fc",
    fontWeight: "600",
  },
  content: {
    padding: "0 24px",
    maxHeight: "280px",
    overflowY: "auto" as const,
  },
  section: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#f0f6fc",
    marginBottom: "4px",
  },
  input: {
    padding: "12px 16px",
    border: "1px solid #30363d",
    borderRadius: "6px",
    background: "#0d1117",
    fontSize: "14px",
    color: "#f0f6fc",
    outline: "none",
    transition: "border-color 0.2s ease",
  },
  textarea: {
    padding: "12px 16px",
    border: "1px solid #30363d",
    borderRadius: "6px",
    background: "#0d1117",
    fontSize: "14px",
    color: "#f0f6fc",
    outline: "none",
    resize: "none" as const,
    fontFamily: "inherit",
    transition: "border-color 0.2s ease",
  },
  select: {
    padding: "12px 16px",
    border: "1px solid #30363d",
    borderRadius: "6px",
    background: "#0d1117",
    fontSize: "14px",
    color: "#f0f6fc",
    outline: "none",
    cursor: "pointer",
    transition: "border-color 0.2s ease",
  },
  actionContainer: {
    padding: "24px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  primaryButton: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "6px",
    background: "#238636",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  savingButton: {
    background: "#6e7681",
    cursor: "not-allowed",
  },
  secondaryButton: {
    padding: "12px 20px",
    border: "1px solid #30363d",
    borderRadius: "6px",
    background: "transparent",
    color: "#f0f6fc",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  buttonSpinner: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  statusContainer: {
    padding: "0 24px 24px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  statusMessage: {
    padding: "12px 16px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    textAlign: "center" as const,
    border: "1px solid #30363d",
  },
  successMessage: {
    background: "#0d1117",
    color: "#56d364",
    borderColor: "#238636",
  },
  errorMessage: {
    background: "#0d1117",
    color: "#f85149",
    borderColor: "#da3633",
  },
  infoMessage: {
    background: "#0d1117",
    color: "#8b949e",
    borderColor: "#30363d",
  },
};

// CSS animations
const css = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

input:focus, textarea:focus, select:focus {
  border-color: #58a6ff !important;
}

button:hover:not(:disabled) {
  opacity: 0.8;
}
`;

// Inject CSS styles
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
}

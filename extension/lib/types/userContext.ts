/*------------------------------------------------------------------------------
  Strict, segregated schema for all ContextVault data
------------------------------------------------------------------------------*/

export interface ProjectDetails {
  name: string;
  description: string;
  techStack: string[];
  startDate?: string; // ISO yyyy-mm-dd
  endDate?: string; // ISO yyyy-mm-dd
  status?: "active" | "completed" | "on-hold";
}

export interface Preferences {
  language: string; // e.g. "typescript"
  codingStyle: string; // e.g. "clean architecture"
  frameworks: string[]; // ["React", "WXT"]
  editor?: string; // "VSCode", "Vim", …
  theme?: "light" | "dark" | "system";
}

export interface ConversationEntry {
  platform: string; // "ChatGPT", "Claude", …
  timestamp: number; // unix ms
  context: string; // one-line summary
}

export interface userContext {
  projectDetails: ProjectDetails;
  preferences: Preferences;
  conversationHistory: ConversationEntry[];
  notes?: string[]; // free-form list (TODOs, ideas)
}

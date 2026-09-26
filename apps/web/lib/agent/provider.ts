export type AgentId = "grok" | "pi";

export const DEFAULT_AGENT: AgentId = "grok";
export const AGENT_STORAGE_KEY = "emily:agent";
export const AGENT_RUN_STORAGE_PREFIX = "emily:agent-run:";

export function parseAgent(value: unknown): AgentId {
  return value === "pi" ? "pi" : DEFAULT_AGENT;
}

export function agentLabel(agent: AgentId): string {
  return agent === "pi" ? "Pi" : "Grok Bot";
}

export function readStoredAgent(): AgentId {
  if (typeof window === "undefined") return DEFAULT_AGENT;
  try {
    return parseAgent(localStorage.getItem(AGENT_STORAGE_KEY));
  } catch {
    return DEFAULT_AGENT;
  }
}

export function writeStoredAgent(agent: AgentId): void {
  try {
    localStorage.setItem(AGENT_STORAGE_KEY, agent);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function agentRunStorageKey(briefKey: string, agent: AgentId): string {
  return `${AGENT_RUN_STORAGE_PREFIX}${agent}:${briefKey}`;
}

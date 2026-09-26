export const AGENT_RUN_STORAGE_PREFIX = "emily:agent-run:";

export function agentRunStorageKey(briefKey: string): string {
  return `${AGENT_RUN_STORAGE_PREFIX}grok:${briefKey}`;
}

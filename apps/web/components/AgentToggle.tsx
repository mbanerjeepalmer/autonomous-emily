"use client";

import { useEffect, useState } from "react";
import {
  agentLabel,
  readStoredAgent,
  writeStoredAgent,
  type AgentId,
} from "@/lib/agent/provider";

export function AgentToggle({
  name,
  defaultAgent,
  value,
  onChange,
  align = "start",
  variant = "default",
}: {
  name?: string;
  defaultAgent?: AgentId;
  value?: AgentId;
  onChange?: (agent: AgentId) => void;
  align?: "start" | "center";
  variant?: "default" | "landing";
}) {
  const [internal, setInternal] = useState<AgentId>(value ?? defaultAgent ?? "grok");
  const agent = value ?? internal;

  useEffect(() => {
    if (value !== undefined || defaultAgent) return;
    setInternal(readStoredAgent());
  }, [defaultAgent, value]);

  function select(next: AgentId) {
    writeStoredAgent(next);
    if (onChange) onChange(next);
    else setInternal(next);
  }

  return (
    <div className={`agent-toggle ${align} ${variant}`}>
      {name ? <input type="hidden" name={name} value={agent} /> : null}
      <span className={`agent-toggle-label ${agent === "grok" ? "on" : ""}`}>{agentLabel("grok")}</span>
      <button
        type="button"
        role="switch"
        className="agent-switch"
        aria-checked={agent === "pi"}
        aria-label="Use Pi instead of Grok Bot"
        onClick={() => select(agent === "pi" ? "grok" : "pi")}
      />
      <span className={`agent-toggle-label ${agent === "pi" ? "on" : ""}`}>{agentLabel("pi")}</span>
    </div>
  );
}

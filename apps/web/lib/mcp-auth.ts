/**
 * Auth for the HTTP MCP endpoint (Grok Bot / Cursor connectors).
 * Expects Authorization: Bearer ${EMILY_MCP_SECRET}.
 */
export function authorizeMcp(request: Request): boolean {
  const secret = process.env.EMILY_MCP_SECRET;
  if (!secret) {
    return false;
  }
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

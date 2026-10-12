/** Safe to import in the browser: only public configuration belongs here. */
export function publicSupabaseConfig(url: string | undefined, key: string | undefined) {
  if (!url || !key || url.includes("your-project") || key.includes("your-publishable-key"))
    return null;
  try {
    const parsed = new URL(url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (
      (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/"
    )
      return null;
    // Elevated keys must never be accepted by a browser/session client.
    if (key.startsWith("sb_publishable_") && key.length > "sb_publishable_".length)
      return { url: parsed.origin, key };
    const payload = key.split(".");
    if (payload.length !== 3) return null;
    const claims = JSON.parse(atob(payload[1].replaceAll("-", "+").replaceAll("_", "/")));
    if (claims.role !== "anon") return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}

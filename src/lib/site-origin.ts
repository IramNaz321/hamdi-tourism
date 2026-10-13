export type OriginEnvironment = {
  [key: string]: string | undefined;
  NEXT_PUBLIC_SITE_URL?: string;
  CODESPACES?: string;
  CODESPACE_NAME?: string;
  GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN?: string;
};
/** Uses explicit configuration or platform environment, never visitor Host headers. */
export function configuredSiteOrigin(env: OriginEnvironment) {
  let preview: string | null = null;
  if (env.CODESPACES === "true" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(env.CODESPACE_NAME ?? "")) {
    const domain = env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? "app.github.dev";
    if (domain === "app.github.dev") preview = `https://${env.CODESPACE_NAME}-3000.${domain}`;
  }
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return preview;
  try {
    const url = new URL(raw);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && local))
    )
      return null;
    return local && preview ? preview : url.origin;
  } catch {
    return null;
  }
}

/** Proxy redirects must be absolute in Next.js 16. */
export function loginRedirectUrl(requestOrigin: string, env: OriginEnvironment) {
  const configured = configuredSiteOrigin(env);
  return new URL("/login", configured?.startsWith("https://") ? configured : requestOrigin);
}

export function isServerSupabaseKey(value: string | undefined) {
  const key = value?.trim();
  if (!key) return false;
  if (key.startsWith("sb_secret_") && key.length > "sb_secret_".length) return true;
  try {
    const parts = key.split(".");
    if (parts.length !== 3) return false;
    return (
      JSON.parse(atob(parts[1].replaceAll("-", "+").replaceAll("_", "/"))).role === "service_role"
    );
  } catch {
    return false;
  }
}

/** Forward each single-use token to Supabase Auth once; do not consume it locally first. */
export function authCaptcha(form: FormData, siteKey: string | undefined) {
  const value = form.get("captcha_token");
  if (siteKey && (typeof value !== "string" || value.length < 1 || value.length > 2048))
    return { error: "Complete the security check before continuing." } as const;
  return {
    options:
      typeof value === "string" && value.length > 0 && value.length <= 2048
        ? { captchaToken: value }
        : undefined,
  } as const;
}

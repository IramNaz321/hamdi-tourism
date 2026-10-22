/** Add languages here without coupling UI controls to a particular speech provider. */
export const conciergeLanguages = [
  { code: "en", label: "English", locale: "en-AE", direction: "ltr" },
  { code: "ar", label: "العربية", locale: "ar-AE", direction: "rtl" },
  { code: "ur", label: "اردو", locale: "ur-PK", direction: "rtl" },
  { code: "hi", label: "हिन्दी", locale: "hi-IN", direction: "ltr" },
] as const;
export function preferredConciergeLanguage(preferences: readonly string[]) {
  for (const preference of preferences) {
    const code = preference.toLowerCase().split(/[-_]/)[0];
    if (conciergeLanguages.some((language) => language.code === code)) return code;
  }
  return "en";
}
export function conciergeLocale(code: string) {
  return conciergeLanguages.find((language) => language.code === code) ?? conciergeLanguages[0];
}

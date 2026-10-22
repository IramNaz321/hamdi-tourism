/** Only trusted messages reach the UI; never render raw provider/configuration errors. */
export function conciergeErrorMessage(code: unknown, status: number, reason?: unknown) {
  if (code === "configuration_required" && reason === "disabled")
    return "Travel concierge is currently unavailable. AI assistance has not been enabled yet. Please contact our team or plan a transfer.";
  if (code === "origin_mismatch")
    return "This website address could not be verified. Please contact our team.";
  if (code === "grounding_unavailable")
    return "Our published business information is not available yet. Please contact our team for assistance.";
  if (code === "provider_unavailable")
    return "AI assistance is temporarily unavailable. Please use the published website information or contact our team; no price or availability can be confirmed here.";
  if (status === 429) return "Concierge limit reached. Please wait or contact our team.";
  if (status === 403) return "Complete the security check or sign in to continue.";
  return "Travel concierge is currently unavailable. Please contact our team.";
}

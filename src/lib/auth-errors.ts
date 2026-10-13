/** Map stable provider codes, never display raw errors, credentials or request details. */
export function authErrorMessage(error: { code?: string; status?: number } | null | undefined) {
  if (error?.code === "invalid_credentials")
    return "Email or password was not accepted. Check both, or use Forgot your password.";
  if (error?.code === "email_not_confirmed")
    return "Confirm your email using the invitation or confirmation link before signing in.";
  if (
    error?.status === 429 ||
    ["over_request_rate_limit", "over_email_send_rate_limit"].includes(error?.code ?? "")
  )
    return "Too many attempts. Wait a few minutes before trying again.";
  if (error?.status === 401 || error?.code === "bad_jwt")
    return "Sign-in could not be verified. Check your credentials; if this continues, contact the business owner.";
  return "Sign-in is temporarily unavailable. Please try again or contact the business owner.";
}

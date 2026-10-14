/** Reserved access must be revoked on returned errors and ambiguous transport failures. */
export async function deliverReservedInvitation(
  send: () => PromiseLike<{ error: unknown }>,
  revoke: () => PromiseLike<{ error: unknown }>,
): Promise<"sent" | "failed" | "cleanup_unconfirmed"> {
  try {
    const result = await send();
    if (!result.error) return "sent";
  } catch {
    // Delivery may have provisioned an account before the response was lost.
  }
  try {
    return (await revoke()).error ? "cleanup_unconfirmed" : "failed";
  } catch {
    return "cleanup_unconfirmed";
  }
}

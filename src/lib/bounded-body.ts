/** Bound streamed API bodies before allocation. Never log webhook bodies or prompts. */
export async function readLimitedBody(request: Pick<Request, "headers" | "body">, limit: number) {
  if (Number(request.headers.get("content-length") ?? 0) > limit)
    throw new Error("Payload too large");
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let result = "";
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new Error("Payload too large");
      }
      result += decoder.decode(value, { stream: true });
    }
    return result + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

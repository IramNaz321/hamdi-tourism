import sharp from "sharp";
export async function prepareImage(file: File): Promise<Buffer> {
  if (
    !file.size ||
    file.size > 4 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new Error("Choose a JPEG, PNG or WebP image up to 4 MB.");
  const input = Buffer.from(await file.arrayBuffer());
  const jpeg = input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff;
  const png = input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    input.subarray(0, 4).toString() === "RIFF" && input.subarray(8, 12).toString() === "WEBP";
  if (!(
    (file.type === "image/jpeg" && jpeg) ||
    (file.type === "image/png" && png) ||
    (file.type === "image/webp" && webp)
  ))
    throw new Error("The image type does not match its contents.");
  const processor = sharp(input, {
    limitInputPixels: 16000000,
    failOn: "error",
  });
  const metadata = await processor.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1)
    throw new Error("Choose a single JPEG, PNG or WebP image.");
  return processor
    .rotate()
    .resize({ width: 1600, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
}

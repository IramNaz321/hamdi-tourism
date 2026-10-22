"use client";
import { useActionState } from "react";
import { uploadMedia } from "@/app/admin/media-actions";
import { Button } from "@/components/ui/button";
export function MediaUpload({
  entity,
  id,
  version,
  imageUrl,
}: {
  entity: string;
  id: string;
  version: string;
  imageUrl?: string;
}) {
  const [state, action, pending] = useActionState(uploadMedia.bind(null, entity, id, version), {});
  return (
    <section className="panel p-6 mt-6">
      <h2 className="font-semibold mb-4">{entity === "logo" ? "Business logo" : "Public image"}</h2>
      {imageUrl && (
        <picture>
          <img
            src={imageUrl}
            alt="Current uploaded image"
            className="max-h-60 w-auto rounded-xl mb-5"
          />
        </picture>
      )}
      <form action={action}>
        <label className="field">
          Upload JPEG, PNG or WebP (up to 4 MB)
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required />
        </label>
        <p className="text-xs text-muted mt-3">
          Use imagery you own or have permission to publish. Files are resized and stored privately;
          published images are shared through temporary links.
        </p>
        {state.error && (
          <p className="notice error mt-4" role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="notice mt-4" role="status">
            {state.success}
          </p>
        )}
        <Button className="mt-5" disabled={pending}>
          {pending ? "Uploading…" : "Upload image"}
        </Button>
      </form>
    </section>
  );
}

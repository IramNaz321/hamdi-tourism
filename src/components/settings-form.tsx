"use client";
import { useActionState } from "react";
import { saveSettings } from "@/app/admin/settings/actions";
import { Button } from "@/components/ui/button";
export function SettingsForm({
  settings,
}: {
  settings: Record<string, string | number | boolean | null> | null;
}) {
  const [state, action, pending] = useActionState(saveSettings, {});
  const value = (name: string, fallback = "") => String(settings?.[name] ?? fallback);
  return (
    <form action={action} className="panel p-6 sm:p-8">
      {state.error && (
        <p role="alert" className="notice error mb-5">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="notice mb-5">
          {state.success}
        </p>
      )}
      <input type="hidden" name="updated_at" value={value("updated_at")} />
      <h2 className="text-xl font-semibold mb-6">Business information</h2>
      <div className="grid sm:grid-cols-2 gap-5">
        {[
          ["display_name", "Business display name", "text"],
          ["contact_email", "Contact email", "email"],
          ["phone", "Phone", "tel"],
          ["whatsapp", "WhatsApp number", "tel"],
        ].map(([name, label, type]) => (
          <label className="field" key={name}>
            {label}
            <input
              name={name}
              type={type}
              required={name === "display_name"}
              defaultValue={value(name)}
              maxLength={name === "contact_email" ? 254 : 200}
            />
          </label>
        ))}
        <label className="field">
          Currency
          <select name="currency">
            <option value="AED">AED · UAE Dirham</option>
          </select>
        </label>
        <label className="field">
          Font style
          <select name="font_family" defaultValue={value("font_family", "system")}>
            <option value="system">Modern sans-serif</option>
            <option value="serif">Classic serif</option>
          </select>
        </label>
        {[
          ["address", "Business address"],
          ["about_text", "About the business"],
          ["booking_policy", "Booking policy"],
          ["cancellation_policy", "Cancellation policy"],
        ].map(([name, label]) => (
          <label className="field sm:col-span-2" key={name}>
            {label}
            <textarea name={name} maxLength={4000} defaultValue={value(name)} />
          </label>
        ))}
        {[
          ["brand_color", "Accent color", "#C5A46D"],
          ["ink_color", "Text / dark color", "#111827"],
          ["canvas_color", "Page background", "#F8F6F1"],
        ].map(([name, label, fallback]) => (
          <label className="field" key={name}>
            {label}
            <input type="color" name={name} defaultValue={value(name, fallback)} />
          </label>
        ))}
        <label className="field">
          Minimum enquiry notice (hours)
          <input
            type="number"
            name="minimum_notice_hours"
            min={0}
            max={8760}
            required
            defaultValue={value("minimum_notice_hours", "0")}
          />
        </label>
        <label className="field">
          Assignment turnaround buffer (minutes)
          <input
            type="number"
            name="turnaround_minutes"
            min={0}
            max={1440}
            required
            defaultValue={value("turnaround_minutes", "0")}
          />
        </label>
      </div>
      <div className="space-y-4 my-7">
        <label className="flex gap-3 text-sm items-center">
          <input type="checkbox" name="published" defaultChecked={Boolean(settings?.published)} />
          Publish business information on the website
        </label>
        <label className="flex gap-3 text-sm items-center">
          <input
            type="checkbox"
            name="enquiries_enabled"
            defaultChecked={Boolean(settings?.enquiries_enabled)}
          />
          Enable public route quotes and transfer enquiries
        </label>
        <p className="text-xs text-muted">
          Only locations, vehicles and pricing rules you explicitly publish will be shown. Public
          enquiry submission also requires configured security checks and email contact information.
          Buffer changes apply when bookings are next saved.
        </p>
      </div>
      <Button disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
    </form>
  );
}

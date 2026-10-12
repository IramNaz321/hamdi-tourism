import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { entities, canWrite, dateTime, money } from "@/lib/entities";
import { RecordForm } from "@/components/record-form";
export default async function EditRecord({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  const definition = entities[entity];
  if (!Object.hasOwn(entities, entity) || !z.uuid().safeParse(id).success) notFound();
  const { supabase, member } = await requireStaff();
  const { data: record, error } = await supabase
    .from(entity)
    .select("*")
    .eq("organization_id", member.organization_id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Unable to load record.");
  if (!record) notFound();
  const related: Record<string, { id: string; name: string }> = {};
  for (const field of definition.fields.filter((field) => field.relation)) {
    if (!record[field.name]) continue;
    const { data, error } = await supabase
      .from(field.relation!)
      .select("id,name")
      .eq("organization_id", member.organization_id)
      .eq("id", record[field.name])
      .maybeSingle();
    if (error) throw new Error("Unable to load related record.");
    if (data) related[field.name] = data;
  }
  const editable = canWrite(member.role, entity) && !record.archived;
  return (
    <>
      <Link className="text-sm text-muted flex items-center gap-2 mb-6" href={`/admin/${entity}`}>
        <ArrowLeft size={16} />
        {definition.title}
      </Link>
      <h1 className="text-3xl font-semibold mb-3">
        {editable ? "Edit" : "View"} {definition.singular}
      </h1>
      <p className="text-sm text-muted mb-8">
        {record.reference ?? definition.description}
        {record.archived ? " · Archived" : ""}
      </p>
      {editable ? (
        <RecordForm entity={entity} record={record} related={related} />
      ) : (
        <dl className="panel p-8 grid sm:grid-cols-2 gap-6 max-w-4xl">
          {definition.fields.map((field) => (
            <div key={field.name}>
              <dt className="text-xs text-muted mb-2">{field.label}</dt>
              <dd className="text-sm whitespace-pre-wrap break-words">
                {related[field.name]?.name ??
                  (record[field.name] == null
                    ? "—"
                    : field.name === "pickup_at"
                      ? dateTime(record[field.name])
                      : field.name === "price_aed"
                        ? money(Number(record[field.name]))
                        : String(record[field.name]).replaceAll("_", " "))}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}

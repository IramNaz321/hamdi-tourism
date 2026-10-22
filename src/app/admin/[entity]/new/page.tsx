import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { entities, canWrite } from "@/lib/entities";
import { RecordForm } from "@/components/record-form";
export default async function NewRecord({ params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  const definition = entities[entity];
  if (!Object.hasOwn(entities, entity)) notFound();
  const { member } = await requireStaff();
  if (!canWrite(member.role, entity)) redirect(`/admin/${entity}`);
  return (
    <>
      <Link className="text-sm text-muted flex items-center gap-2 mb-6" href={`/admin/${entity}`}>
        <ArrowLeft size={16} />
        {definition.title}
      </Link>
      <h1 className="text-3xl font-semibold mb-3">Add {definition.singular}</h1>
      <p className="text-sm text-muted mb-8">Fields marked * are required.</p>
      <RecordForm entity={entity} related={{}} />
    </>
  );
}

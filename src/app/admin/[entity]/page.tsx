import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Inbox, ArrowRight } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { canWrite, entities, money, dateTime } from "@/lib/entities";
import { archiveRecord } from "@/app/admin/actions";
import { ArchiveButton } from "@/components/archive-button";
const messages: Record<string, string> = {
  saved: "Record saved.",
  archived: "Record archived. Its history has been preserved.",
  restored: "Record restored.",
  changed: "This record changed since you opened the page. Refresh and try again.",
  "archive-failed":
    "Unable to change this record. It may still be needed for an active booking, or its related records may be archived.",
};
export default async function Records({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<{
    page?: string;
    archived?: string;
    notice?: string;
    q?: string;
    status?: string;
    field?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { entity } = await params;
  const definition = entities[entity];
  if (!Object.hasOwn(entities, entity)) notFound();
  const query = await searchParams;
  const page = Math.min(100000, Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1));
  const archived = query.archived === "true";
  const { supabase, member } = await requireStaff();
  let request = supabase
    .from(entity)
    .select("*", { count: "exact" })
    .eq("organization_id", member.organization_id)
    .eq("archived", archived);
  const searchField =
    entity === "bookings"
      ? "reference"
      : entity === "customers" && ["name", "email", "phone"].includes(query.field ?? "")
        ? query.field!
        : entity === "vehicles" && query.field === "plate_number"
          ? "plate_number"
          : "name";
  if (query.q)
    request = request.ilike(searchField, `%${query.q.slice(0, 100).replace(/[\\%_]/g, "\\$&")}%`);
  const statuses = definition.fields.find((field) => field.name === "status")?.options ?? [];
  if (statuses.includes(query.status ?? "")) request = request.eq("status", query.status!);
  function validDay(value: string | undefined) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const day = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === value;
  }
  if (entity === "bookings" && validDay(query.from))
    request = request.gte("pickup_at", `${query.from}T00:00:00+04:00`);
  if (entity === "bookings" && validDay(query.to))
    request = request.lte("pickup_at", `${query.to}T23:59:59.999+04:00`);
  const { data, count, error } = await request
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 25, page * 25 - 1);
  const linkParams = new URLSearchParams();
  for (const key of ["q", "status", "field", "from", "to"] as const)
    if (query[key]) linkParams.set(key, query[key]!);
  function pageLink(targetPage: number, archive = archived) {
    const result = new URLSearchParams(linkParams);
    result.set("page", String(targetPage));
    result.set("archived", String(archive));
    return `/admin/${entity}?${result}`;
  }
  if (error) throw new Error("Unable to load records.");
  const rows = (data ?? []) as Record<string, string | number | boolean | null>[];
  const names: Record<string, string> = {};
  const relations = definition.fields.filter((field) => field.relation);
  for (const field of relations) {
    const ids = [...new Set(rows.map((row) => row[field.name]).filter(Boolean))] as string[];
    if (ids.length) {
      const result = await supabase
        .from(field.relation!)
        .select("id,name")
        .eq("organization_id", member.organization_id)
        .in("id", ids);
      if (result.error) throw new Error("Unable to load related records.");
      result.data?.forEach((row) => {
        names[row.id] = row.name;
      });
    }
  }
  const writable = canWrite(member.role, entity);
  const notice = query.notice && messages[query.notice];
  function cell(row: Record<string, string | number | boolean | null>, column: string) {
    const value = row[column];
    if (value === null || value === undefined || value === "")
      return <span className="text-muted">—</span>;
    if (column.endsWith("_id")) return names[String(value)] ?? "Unavailable record";
    if (column.endsWith("_aed")) return money(Number(value));
    if (column === "pickup_at") return dateTime(String(value));
    if (["status", "payment_status"].includes(column))
      return (
        <span className="badge" data-status={value}>
          {String(value).replaceAll("_", " ")}
        </span>
      );
    return String(value).replaceAll("_", " ");
  }
  return (
    <>
      <div className="flex flex-wrap justify-between gap-5 items-start mb-8">
        <div>
          <p className="eyebrow mb-3">OPERATIONS</p>
          <h1 className="text-3xl font-semibold tracking-tight">{definition.title}</h1>
          <p className="text-muted text-sm mt-3">{definition.description}</p>
        </div>
        {writable && (
          <Link href={`/admin/${entity}/new`} className="button">
            <Plus size={17} /> Add {definition.singular}
          </Link>
        )}
      </div>
      {notice && (
        <p
          role="status"
          className={`notice mb-6 ${["archive-failed", "changed"].includes(query.notice!) ? "error" : ""}`}
        >
          {notice}
        </p>
      )}
      <form className="panel p-5 flex flex-wrap gap-4 mb-6">
        <input type="hidden" name="archived" value={String(archived)} />
        <label className="field">
          {entity === "bookings" ? "Booking reference" : "Search"}
          <input name="q" defaultValue={query.q} maxLength={100} />
        </label>
        {entity === "customers" && (
          <label className="field">
            Search by
            <select name="field" defaultValue={query.field ?? "name"}>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
          </label>
        )}
        {entity === "vehicles" && (
          <label className="field">
            Search by
            <select name="field" defaultValue={query.field ?? "name"}>
              <option value="name">Make / model name</option>
              <option value="plate_number">Registration plate</option>
            </select>
          </label>
        )}
        {!!statuses.length && (
          <label className="field">
            Status
            <select name="status" defaultValue={query.status ?? ""}>
              <option value="">All</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        )}
        {entity === "bookings" && (
          <>
            <label className="field">
              Pickup from (UAE)
              <input type="date" name="from" defaultValue={query.from} />
            </label>
            <label className="field">
              Pickup through (UAE)
              <input type="date" name="to" defaultValue={query.to} />
            </label>
          </>
        )}
        <button className="button self-end">Search records</button>
        <Link className="button secondary self-end" href={`/admin/${entity}`}>
          Clear
        </Link>
      </form>
      <div className="flex gap-5 mb-5 text-sm">
        <Link
          href={pageLink(1, false)}
          className={!archived ? "font-semibold border-b-2 border-brand pb-2" : "text-muted pb-2"}
        >
          Active records
        </Link>
        <Link
          href={pageLink(1, true)}
          className={archived ? "font-semibold border-b-2 border-brand pb-2" : "text-muted pb-2"}
        >
          Archive
        </Link>
        <span className="text-xs text-muted ml-auto">{count ?? 0} records</span>
      </div>
      <section className="panel overflow-hidden">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <caption className="sr-only">
                {archived ? "Archived" : "Active"} {definition.title.toLowerCase()}
              </caption>
              <thead>
                <tr>
                  {definition.columns.map((column) => (
                    <th key={column} scope="col">
                      {column === "reference"
                        ? "Booking"
                        : (definition.fields.find((field) => field.name === column)?.label ??
                          column)}
                    </th>
                  ))}
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row.id)}>
                    {definition.columns.map((column) => (
                      <td key={column}>{cell(row, column)}</td>
                    ))}
                    <td>
                      <div className="flex items-center gap-4">
                        <Link className="text-xs font-semibold" href={`/admin/${entity}/${row.id}`}>
                          {writable && !archived ? "Edit" : "View"}
                        </Link>
                        {writable && (
                          <ArchiveButton
                            restore={archived}
                            action={archiveRecord.bind(
                              null,
                              entity,
                              String(row.id),
                              !archived,
                              String(row.updated_at),
                            )}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 px-6 text-center">
            <Inbox className="text-muted mx-auto mb-5" size={36} strokeWidth={1.2} />
            <h2 className="text-lg font-semibold">
              {page > 1
                ? "No records on this page"
                : archived
                  ? "Your archive is empty"
                  : `No ${definition.title.toLowerCase()} yet`}
            </h2>
            <p className="text-sm text-muted mt-3 mb-6">
              {archived
                ? "Archived records will appear here, with their history intact."
                : `Your ${definition.title.toLowerCase()} will appear here once added.`}
            </p>
            {writable && !archived && (
              <Link className="button secondary" href={`/admin/${entity}/new`}>
                Add {definition.singular} <ArrowRight size={15} />
              </Link>
            )}
          </div>
        )}
      </section>
      <div className="flex justify-between items-center text-xs text-muted mt-5">
        <span>
          Page {page} of {Math.max(1, Math.ceil((count ?? 0) / 25))}
        </span>
        <div className="flex gap-4">
          {page > 1 && <Link href={pageLink(page - 1)}>Previous</Link>}
          {page * 25 < (count ?? 0) && <Link href={pageLink(page + 1)}>Next</Link>}
        </div>
      </div>
    </>
  );
}

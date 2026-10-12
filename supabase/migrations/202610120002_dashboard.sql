begin;
-- Security INVOKER is intentional: normal membership RLS applies to every aggregated row.
create function public.dashboard_financials() returns table(paid_total numeric, outstanding_total numeric)
language sql stable security invoker set search_path = '' as $$
  select coalesce(sum(price_aed) filter (where payment_status = 'paid'), 0),
         coalesce(sum(price_aed) filter (where payment_status = 'unpaid' and status not in ('completed','cancelled') and not archived), 0)
  from public.bookings;
$$;
revoke all on function public.dashboard_financials() from public, anon;
grant execute on function public.dashboard_financials() to authenticated;
commit;

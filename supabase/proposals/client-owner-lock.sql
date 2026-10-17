-- REVIEW ONLY. Not a migration and not automatically executed.
-- Requires verified hosted catalog, client authority and explicit SQL approval first.
-- No account creation, role grants or data updates. Replaces the staff-access RPC guard.
begin;
create or replace function public.set_staff_access(target_user_id uuid, new_role text, new_active boolean)
returns void language plpgsql security definer set search_path='' as $$
declare org uuid; target_role text;
begin
 org := private.organization_id();
 perform 1 from public.organizations where id=org for update;
 if private.current_role() is distinct from 'owner' then raise exception 'Only the owner may manage staff' using errcode='42501'; end if;
 if new_role is null or new_role not in ('manager','dispatcher','viewer','driver') or new_active is null then raise exception 'Owner access is managed only through approved client onboarding' using errcode='42501'; end if;
 select role into target_role from public.staff_members where user_id=target_user_id and organization_id=org for update;
 if not found then raise exception 'Staff account is not in this organization' using errcode='42501'; end if;
 if target_role='owner' then raise exception 'Business owner access is protected' using errcode='42501'; end if;
 if (target_role='driver' or new_role='driver') and target_role is distinct from new_role then raise exception 'Driver role changes require verified driver account management' using errcode='42501'; end if;
 update public.staff_members set role=new_role,active=new_active where user_id=target_user_id and organization_id=org;
end; $$;
revoke all on function public.set_staff_access(uuid,text,boolean) from public,anon;
grant execute on function public.set_staff_access(uuid,text,boolean) to authenticated;
commit;

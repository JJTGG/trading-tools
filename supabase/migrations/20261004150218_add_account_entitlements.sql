create table public.account_entitlements (
    user_id uuid primary key references auth.users(id) on delete cascade,
    plan text not null default 'free',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint account_entitlements_plan_check
        check (plan in ('free', 'lite', 'pro'))
);

alter table public.account_entitlements enable row level security;

revoke all on table public.account_entitlements from anon, authenticated;
grant select on table public.account_entitlements to authenticated;

create policy "Users can view their own account entitlement"
on public.account_entitlements
for select
to authenticated
using ((select auth.uid()) = user_id);

insert into public.account_entitlements (
    user_id,
    plan
)
select
    p.id,
    'free'
from public.profiles p
on conflict (user_id) do nothing;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
    terms_version text;
    privacy_version text;
begin
    if coalesce(new.raw_user_meta_data ->> 'age_confirmed', '') <> 'true'
       or coalesce(new.raw_user_meta_data ->> 'terms_accepted', '') <> 'true'
       or coalesce(new.raw_user_meta_data ->> 'privacy_accepted', '') <> 'true'
       or coalesce(new.raw_user_meta_data ->> 'decision_support_acknowledged', '') <> 'true'
    then
        raise exception 'Account creation requires the required legal acknowledgements.';
    end if;

    terms_version := new.raw_user_meta_data ->> 'terms_version';
    privacy_version := new.raw_user_meta_data ->> 'privacy_version';

    if terms_version <> '2026-10-04'
       or privacy_version <> '2026-10-04'
    then
        raise exception 'Unsupported legal document version.';
    end if;

    insert into public.profiles (id, onboarding_completed)
    values (new.id, false)
    on conflict (id) do nothing;

    insert into public.account_acceptances (
        user_id,
        terms_version,
        privacy_version,
        age_confirmed,
        terms_accepted,
        privacy_accepted,
        decision_support_acknowledged
    )
    values (
        new.id,
        terms_version,
        privacy_version,
        true,
        true,
        true,
        true
    );

    insert into public.user_roles (
        user_id,
        role
    )
    values (
        new.id,
        'user'::public.app_role
    )
    on conflict (user_id, role) do nothing;

    insert into public.account_entitlements (
        user_id,
        plan
    )
    values (
        new.id,
        'free'
    )
    on conflict (user_id) do nothing;

    return new;
end;
$function$;
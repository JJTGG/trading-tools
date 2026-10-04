create table public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    plan text not null,
    provider text not null,
    provider_customer_id text,
    provider_subscription_id text,
    provider_plan_id text,
    status text not null default 'pending',
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancel_at_period_end boolean not null default false,
    started_at timestamptz,
    ended_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint subscriptions_plan_check
        check (
            plan in (
                'free',
                'lite',
                'pro',
                'pro_plus',
                'enterprise'
            )
        ),

    constraint subscriptions_provider_check
        check (
            char_length(trim(provider)) between 1 and 64
        ),

    constraint subscriptions_status_check
        check (
            status in (
                'pending',
                'active',
                'past_due',
                'cancelled',
                'expired',
                'failed'
            )
        )
);

create index subscriptions_user_updated_idx
    on public.subscriptions (user_id, updated_at desc);

create unique index subscriptions_provider_subscription_idx
    on public.subscriptions (
        provider,
        provider_subscription_id
    )
    where provider_subscription_id is not null;

alter table public.subscriptions enable row level security;

revoke all on table public.subscriptions from anon, authenticated;
grant select on table public.subscriptions to authenticated;

create policy "Users can view their own subscriptions"
on public.subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);


create table public.payment_transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    subscription_id uuid references public.subscriptions(id) on delete set null,
    provider text not null,
    provider_payment_id text,
    provider_invoice_id text,
    status text not null default 'pending',
    provider_status text,
    amount numeric not null,
    currency text not null,
    metadata jsonb not null default '{}'::jsonb,
    provider_payload jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint payment_transactions_provider_check
        check (
            char_length(trim(provider)) between 1 and 64
        ),

    constraint payment_transactions_status_check
        check (
            status in (
                'pending',
                'paid',
                'failed',
                'expired',
                'partial',
                'refunded'
            )
        ),

    constraint payment_transactions_amount_check
        check (
            amount > 0
        ),

    constraint payment_transactions_currency_check
        check (
            char_length(trim(currency)) between 1 and 16
        ),

    constraint payment_transactions_metadata_check
        check (
            jsonb_typeof(metadata) = 'object'
        ),

    constraint payment_transactions_payload_check
        check (
            provider_payload is null
            or jsonb_typeof(provider_payload) = 'object'
        )
);

create index payment_transactions_user_created_idx
    on public.payment_transactions (user_id, created_at desc);

create index payment_transactions_subscription_idx
    on public.payment_transactions (subscription_id, created_at desc);

create unique index payment_transactions_provider_payment_idx
    on public.payment_transactions (
        provider,
        provider_payment_id
    )
    where provider_payment_id is not null;

alter table public.payment_transactions enable row level security;

revoke all on table public.payment_transactions from anon, authenticated;

create policy "Payment transactions are server managed"
on public.payment_transactions
for select
to authenticated
using (false);
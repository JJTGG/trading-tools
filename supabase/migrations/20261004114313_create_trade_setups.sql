create table public.trade_setups (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    title text not null default 'Untitled setup',
    symbol text,
    timeframe text,
    direction text,
    entry_price numeric,
    stop_loss numeric,
    target_price numeric,
    account_balance numeric,
    risk_percent numeric,
    position_size numeric,
    exit_price numeric,
    fees numeric,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint trade_setups_title_length
        check (char_length(title) between 1 and 120),

    constraint trade_setups_symbol_length
        check (
            symbol is null
            or char_length(symbol) between 1 and 32
        ),

    constraint trade_setups_timeframe_length
        check (
            timeframe is null
            or char_length(timeframe) between 1 and 16
        ),

    constraint trade_setups_direction_check
        check (
            direction is null
            or direction in ('long', 'short')
        ),

    constraint trade_setups_entry_price_check
        check (
            entry_price is null
            or entry_price > 0
        ),

    constraint trade_setups_stop_loss_check
        check (
            stop_loss is null
            or stop_loss > 0
        ),

    constraint trade_setups_target_price_check
        check (
            target_price is null
            or target_price > 0
        ),

    constraint trade_setups_account_balance_check
        check (
            account_balance is null
            or account_balance > 0
        ),

    constraint trade_setups_risk_percent_check
        check (
            risk_percent is null
            or risk_percent >= 0
        ),

    constraint trade_setups_position_size_check
        check (
            position_size is null
            or position_size >= 0
        ),

    constraint trade_setups_exit_price_check
        check (
            exit_price is null
            or exit_price > 0
        ),

    constraint trade_setups_fees_check
        check (
            fees is null
            or fees >= 0
        )
);

create index trade_setups_user_updated_idx
    on public.trade_setups (user_id, updated_at desc);

alter table public.trade_setups enable row level security;

revoke all on table public.trade_setups from anon, authenticated;

grant select, insert, update, delete
    on table public.trade_setups
    to authenticated;

create policy "Users can view their own trade setups"
on public.trade_setups
for select
to authenticated
using (
    (select auth.uid()) = user_id
);

create policy "Users can create their own trade setups"
on public.trade_setups
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);

create policy "Users can update their own trade setups"
on public.trade_setups
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);

create policy "Users can delete their own trade setups"
on public.trade_setups
for delete
to authenticated
using (
    (select auth.uid()) = user_id
);
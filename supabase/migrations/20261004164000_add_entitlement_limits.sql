alter table public.account_entitlements
    drop constraint if exists account_entitlements_plan_check;

alter table public.account_entitlements
    add constraint account_entitlements_plan_check
        check (
            plan in (
                'free',
                'lite',
                'pro',
                'pro_plus',
                'enterprise'
            )
        );

create or replace function private.enforce_account_entitlement_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
    account_user_id uuid;
    account_plan text;
    current_count bigint;
    allowed_count bigint;
begin
    account_user_id := new.user_id;

    if account_user_id is null then
        return new;
    end if;

    if account_user_id <> (select auth.uid()) then
        return new;
    end if;

    if private.has_permission('system.full_control') then
        return new;
    end if;

    select coalesce(plan, 'free')
    into account_plan
    from public.account_entitlements
    where user_id = account_user_id;

    if account_plan is null then
        account_plan := 'free';
    end if;

    perform pg_advisory_xact_lock(
        hashtextextended(
            account_user_id::text,
            0
        )
    );

    case tg_table_name
        when 'trade_setups' then
            if account_plan = 'free' then
                allowed_count := 10;
            elsif account_plan = 'lite' then
                allowed_count := 100;
            else
                return new;
            end if;

            select count(*)
            into current_count
            from public.trade_setups
            where user_id = account_user_id;

            if current_count >= allowed_count then
                raise exception using
                    errcode = 'P0001',
                    message = 'Trade Setup limit reached for your current plan.',
                    detail = 'trade_setups';
            end if;

        when 'saved_calculations' then
            if account_plan = 'free' then
                allowed_count := 50;
            elsif account_plan = 'lite' then
                allowed_count := 500;
            else
                return new;
            end if;

            select count(*)
            into current_count
            from public.saved_calculations
            where user_id = account_user_id;

            if current_count >= allowed_count then
                raise exception using
                    errcode = 'P0001',
                    message = 'Saved Calculation limit reached for your current plan.',
                    detail = 'saved_calculations';
            end if;

        when 'watchlist_items' then
            if account_plan = 'free' then
                allowed_count := 10;
            elsif account_plan = 'lite' then
                allowed_count := 50;
            else
                return new;
            end if;

            select count(*)
            into current_count
            from public.watchlist_items
            where user_id = account_user_id;

            if current_count >= allowed_count then
                raise exception using
                    errcode = 'P0001',
                    message = 'Watchlist limit reached for your current plan.',
                    detail = 'watchlist_items';
            end if;
    end case;

    return new;
end;
$function$;

drop trigger if exists enforce_trade_setup_entitlement_limit
on public.trade_setups;

create trigger enforce_trade_setup_entitlement_limit
before insert on public.trade_setups
for each row
execute function private.enforce_account_entitlement_limit();

drop trigger if exists enforce_saved_calculation_entitlement_limit
on public.saved_calculations;

create trigger enforce_saved_calculation_entitlement_limit
before insert on public.saved_calculations
for each row
execute function private.enforce_account_entitlement_limit();

drop trigger if exists enforce_watchlist_entitlement_limit
on public.watchlist_items;

create trigger enforce_watchlist_entitlement_limit
before insert on public.watchlist_items
for each row
execute function private.enforce_account_entitlement_limit();
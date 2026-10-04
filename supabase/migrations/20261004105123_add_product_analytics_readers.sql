create or replace function public.get_product_analytics_summary()
returns table (
    total_events bigint,
    unique_users bigint,
    tool_opens bigint,
    calculations_completed bigint,
    latest_event_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        count(*)::bigint as total_events,
        count(distinct user_id)::bigint as unique_users,
        count(*) filter (
            where event_name = 'tool_opened'
        )::bigint as tool_opens,
        count(*) filter (
            where event_name = 'calculation_completed'
        )::bigint as calculations_completed,
        max(created_at) as latest_event_at
    from public.product_events
    where (select private.has_permission('analytics.view'));
$$;

revoke all on function public.get_product_analytics_summary() from public;
grant execute on function public.get_product_analytics_summary() to authenticated;

create or replace function public.get_product_analytics_tools()
returns table (
    page text,
    tool_opens bigint,
    calculations_completed bigint,
    unique_users bigint,
    last_activity_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        page,
        count(*) filter (
            where event_name = 'tool_opened'
        )::bigint as tool_opens,
        count(*) filter (
            where event_name = 'calculation_completed'
        )::bigint as calculations_completed,
        count(distinct user_id)::bigint as unique_users,
        max(created_at) as last_activity_at
    from public.product_events
    where (select private.has_permission('analytics.view'))
    group by page
    order by
        count(*) filter (
            where event_name = 'tool_opened'
        ) desc,
        count(distinct user_id) desc,
        page asc;
$$;

revoke all on function public.get_product_analytics_tools() from public;
grant execute on function public.get_product_analytics_tools() to authenticated;
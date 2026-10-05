create unique index if not exists
    subscriptions_one_open_per_user_idx
on public.subscriptions (
    user_id
)
where status in (
    'pending',
    'active',
    'past_due'
);
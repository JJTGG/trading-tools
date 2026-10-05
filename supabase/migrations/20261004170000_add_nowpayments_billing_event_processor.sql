create index if not exists
    subscriptions_provider_customer_idx
on public.subscriptions (
    provider,
    provider_customer_id
);

create or replace function public.apply_nowpayments_subscription_event(
    p_subscription_id uuid,
    p_provider_payment_id text,
    p_provider_status text,
    p_payment_status text,
    p_amount numeric,
    p_currency text,
    p_period_end timestamptz,
    p_provider_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_subscription public.subscriptions%rowtype;
    v_payment_status text :=
        lower(trim(coalesce(
            p_payment_status,
            ''
        )));
    v_transaction_status text;
    v_subscription_status text;
    v_period_start timestamptz;
    v_period_end timestamptz;
    v_payload jsonb :=
        coalesce(
            p_provider_payload,
            '{}'::jsonb
        );
begin
    if p_subscription_id is null then
        raise exception
            using errcode = '22023',
                  message =
                    'Billing subscription id is required.';
    end if;

    if jsonb_typeof(v_payload) <> 'object' then
        raise exception
            using errcode = '22023',
                  message =
                    'Billing provider payload must be a JSON object.';
    end if;

    select *
    into v_subscription
    from public.subscriptions
    where id = p_subscription_id
      and provider = 'nowpayments'
    for update;

    if not found then
        raise exception
            using errcode = 'P0002',
                  message =
                    'Billing subscription was not found.';
    end if;

    if v_payment_status in (
        'paid',
        'finished'
    ) then
        if nullif(
            trim(
                coalesce(
                    p_provider_payment_id,
                    ''
                )
            ),
            ''
        ) is null then
            raise exception
                using errcode = '22023',
                      message =
                        'Provider payment id is required for a paid billing event.';
        end if;

        if p_amount is null
            or p_amount <= 0 then
            raise exception
                using errcode = '22023',
                      message =
                        'A positive payment amount is required for a paid billing event.';
        end if;

        if nullif(
            trim(
                coalesce(
                    p_currency,
                    ''
                )
            ),
            ''
        ) is null then
            raise exception
                using errcode = '22023',
                      message =
                        'Payment currency is required for a paid billing event.';
        end if;
    end if;

    if v_payment_status in (
        'paid',
        'finished'
    ) then
        v_transaction_status :=
            'paid';

        v_subscription_status :=
            'active';

        v_period_start :=
            coalesce(
                v_subscription.current_period_end,
                now()
            );

        v_period_end :=
            coalesce(
                p_period_end,
                now() + interval '30 days'
            );

    elsif v_payment_status in (
        'partially_paid',
        'partial'
    ) then
        v_transaction_status :=
            'partial';

        v_subscription_status :=
            'past_due';

        v_period_start :=
            v_subscription.current_period_start;

        v_period_end :=
            v_subscription.current_period_end;

    elsif v_payment_status = 'expired' then
        v_transaction_status :=
            'expired';

        v_subscription_status :=
            'expired';

        v_period_start :=
            v_subscription.current_period_start;

        v_period_end :=
            v_subscription.current_period_end;

    elsif v_payment_status in (
        'failed',
        'error'
    ) then
        v_transaction_status :=
            'failed';

        v_subscription_status :=
            'failed';

        v_period_start :=
            v_subscription.current_period_start;

        v_period_end :=
            v_subscription.current_period_end;

    else
        v_transaction_status :=
            'pending';

        v_subscription_status :=
            'pending';

        v_period_start :=
            v_subscription.current_period_start;

        v_period_end :=
            v_subscription.current_period_end;
    end if;

    if nullif(
        trim(
            coalesce(
                p_provider_payment_id,
                ''
            )
        ),
        ''
    ) is not null
        and p_amount is not null
        and p_amount > 0
        and nullif(
            trim(
                coalesce(
                    p_currency,
                    ''
                )
            ),
            ''
        ) is not null then

        insert into public.payment_transactions (
            user_id,
            subscription_id,
            provider,
            provider_payment_id,
            status,
            provider_status,
            amount,
            currency,
            metadata,
            provider_payload
        )
        values (
            v_subscription.user_id,
            v_subscription.id,
            'nowpayments',
            trim(
                p_provider_payment_id
            ),
            v_transaction_status,
            nullif(
                trim(
                    coalesce(
                        p_provider_status,
                        ''
                    )
                ),
                ''
            ),
            p_amount,
            lower(
                trim(p_currency)
            ),
            jsonb_build_object(
                'plan',
                v_subscription.plan
            ),
            v_payload
        )
        on conflict (
            provider,
            provider_payment_id
        )
        do update
        set
            subscription_id =
                excluded.subscription_id,
            status =
                excluded.status,
            provider_status =
                excluded.provider_status,
            amount =
                excluded.amount,
            currency =
                excluded.currency,
            metadata =
                excluded.metadata,
            provider_payload =
                excluded.provider_payload,
            updated_at =
                now();
    end if;

    update public.subscriptions
    set
        status =
            v_subscription_status,
        current_period_start =
            v_period_start,
        current_period_end =
            v_period_end,
        started_at =
            case
                when v_subscription_status =
                    'active'
                    then coalesce(
                        started_at,
                        now()
                    )
                else started_at
            end,
        ended_at =
            case
                when v_subscription_status in (
                    'expired',
                    'cancelled',
                    'failed'
                )
                and (
                    v_period_end is null
                    or v_period_end <= now()
                )
                then coalesce(
                    ended_at,
                    now()
                )
                else ended_at
            end,
        updated_at =
            now()
    where id =
        v_subscription.id;

    if v_subscription_status =
        'active' then

        insert into public.account_entitlements (
            user_id,
            plan
        )
        values (
            v_subscription.user_id,
            v_subscription.plan
        )
        on conflict (
            user_id
        )
        do update
        set
            plan =
                excluded.plan,
            updated_at =
                now();

    elsif v_subscription_status in (
        'expired',
        'failed'
    )
    and (
        v_period_end is null
        or v_period_end <= now()
    ) then

        update public.account_entitlements
        set
            plan = 'free',
            updated_at = now()
        where user_id =
            v_subscription.user_id;
    end if;

    return jsonb_build_object(
        'subscription_id',
        v_subscription.id,
        'user_id',
        v_subscription.user_id,
        'plan',
        v_subscription.plan,
        'subscription_status',
        v_subscription_status,
        'transaction_status',
        v_transaction_status,
        'current_period_end',
        v_period_end
    );
end;
$$;

revoke all
on function public.apply_nowpayments_subscription_event(
    uuid,
    text,
    text,
    text,
    numeric,
    text,
    timestamptz,
    jsonb
)
from public, anon, authenticated;

grant execute
on function public.apply_nowpayments_subscription_event(
    uuid,
    text,
    text,
    text,
    numeric,
    text,
    timestamptz,
    jsonb
)
to service_role;
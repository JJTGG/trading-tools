alter table public.trade_setups
    add column decision text,
    add column decision_reason text,
    add column decided_at timestamptz;

alter table public.trade_setups
    add constraint trade_setups_decision_check
        check (
            decision is null
            or decision in ('take', 'skip', 'watch')
        ),
    add constraint trade_setups_decision_reason_length
        check (
            decision_reason is null
            or char_length(decision_reason) <= 5000
        );
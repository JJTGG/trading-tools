alter table public.trade_setups
    add column thesis text,
    add column entry_plan text,
    add column invalidation text,
    add column management_plan text;

alter table public.trade_setups
    add constraint trade_setups_thesis_length
        check (
            thesis is null
            or char_length(thesis) <= 5000
        ),
    add constraint trade_setups_entry_plan_length
        check (
            entry_plan is null
            or char_length(entry_plan) <= 5000
        ),
    add constraint trade_setups_invalidation_length
        check (
            invalidation is null
            or char_length(invalidation) <= 5000
        ),
    add constraint trade_setups_management_plan_length
        check (
            management_plan is null
            or char_length(management_plan) <= 5000
        );
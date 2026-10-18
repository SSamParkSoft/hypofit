-- Do not infer historical end dates from a mutable updated_at timestamp.
alter table public.application_sharing_consents
    add column application_ended_at timestamptz;

create function public.record_application_consent_end() returns trigger
language plpgsql as $$
begin
    if new.status is distinct from old.status then
        if new.status in ('rejected', 'canceled', 'no_show', 'completed') then
            update public.application_sharing_consents
            set application_ended_at = coalesce(application_ended_at, statement_timestamp())
            where application_id = new.id;
        else
            update public.application_sharing_consents
            set application_ended_at = null
            where application_id = new.id;
        end if;
    end if;
    return new;
end;
$$;

create trigger application_consent_end
after update of status on public.applications
for each row execute function public.record_application_consent_end();

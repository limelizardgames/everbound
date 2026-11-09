-- Ledgers stay append-only, but deleting a whole character (e.g. an account
-- deletion request) may remove its ledger rows via ON DELETE CASCADE.
create or replace function public.forbid_ledger_mutation()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.characters where id = old.character_id) then
    return old;  -- parent character already deleted: this is a cascade
  end if;
  raise exception '% is append-only; record a correction entry instead', tg_table_name;
end $$;

drop trigger if exists ledger_append_only on public.ledger_entries;
create trigger ledger_append_only before update or delete on public.ledger_entries
  for each row execute function public.forbid_ledger_mutation();
drop trigger if exists inventory_append_only on public.inventory_transactions;
create trigger inventory_append_only before update or delete on public.inventory_transactions
  for each row execute function public.forbid_ledger_mutation();

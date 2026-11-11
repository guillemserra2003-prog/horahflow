-- HorahFlow · Reenvío de recibos por correo y avisos por correo
create extension if not exists pg_cron;

-- Direcciones privadas de reenvío (una por buzón del usuario)
create table if not exists public.inbound_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  label text not null default 'Mi correo' check (char_length(label) between 1 and 40),
  created_at timestamptz not null default now(),
  last_received_at timestamptz,
  received_count int not null default 0,
  verify_code text,
  verify_link text,
  verify_at timestamptz
);
create index if not exists inbound_addresses_user on public.inbound_addresses(user_id, created_at);
alter table public.inbound_addresses enable row level security;
drop policy if exists "ver mis direcciones" on public.inbound_addresses;
create policy "ver mis direcciones" on public.inbound_addresses for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "renombrar mis direcciones" on public.inbound_addresses;
create policy "renombrar mis direcciones" on public.inbound_addresses for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "borrar mis direcciones" on public.inbound_addresses;
create policy "borrar mis direcciones" on public.inbound_addresses for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.inbound_addresses from authenticated, anon;
grant select, delete on public.inbound_addresses to authenticated;
grant update (label) on public.inbound_addresses to authenticated;

-- Recibos recibidos que aún no ha importado la app (se borran al importarlos, o a los 60 días)
create table if not exists public.inbound_emails (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  address_id uuid references public.inbound_addresses(id) on delete cascade,
  resend_id text not null unique,
  from_addr text not null default '',
  subject text not null default '',
  received_at timestamptz not null default now(),
  body text not null default '' check (char_length(body) <= 30000),
  created_at timestamptz not null default now()
);
create index if not exists inbound_emails_user on public.inbound_emails(user_id, received_at);
alter table public.inbound_emails enable row level security;
drop policy if exists "ver mis recibos entrantes" on public.inbound_emails;
create policy "ver mis recibos entrantes" on public.inbound_emails for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "borrar mis recibos entrantes" on public.inbound_emails;
create policy "borrar mis recibos entrantes" on public.inbound_emails for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.inbound_emails from authenticated, anon;
grant select, delete on public.inbound_emails to authenticated;

-- Registro de avisos enviados (para no repetir)
create table if not exists public.alert_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.alert_log enable row level security;
revoke all on public.alert_log from authenticated, anon;

-- Límite de direcciones según el plan
create or replace function public.plan_mailboxes(p text) returns int language sql immutable as $$
  select case p when 'business' then 25 when 'pro' then 5 else 1 end
$$;

create or replace function public.create_inbound_address(p_label text)
returns public.inbound_addresses
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  lim int; n int; tok text; r public.inbound_addresses;
  alphabet text := 'abcdefghijkmnpqrstuvwxyz23456789';
  b bytea; i int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select public.plan_mailboxes(coalesce(plan, 'free')) into lim from public.profiles where id = uid;
  lim := coalesce(lim, 1);
  select count(*) into n from public.inbound_addresses where user_id = uid;
  if n >= lim then raise exception 'mailbox_limit' using detail = lim::text; end if;
  loop
    b := extensions.gen_random_bytes(10); tok := '';
    for i in 0..9 loop tok := tok || substr(alphabet, (get_byte(b, i) % 32) + 1, 1); end loop;
    exit when not exists (select 1 from public.inbound_addresses where token = tok);
  end loop;
  insert into public.inbound_addresses(user_id, token, label)
  values (uid, tok, coalesce(nullif(left(trim(p_label), 40), ''), 'Mi correo'))
  returning * into r;
  return r;
end $$;
revoke all on function public.create_inbound_address(text) from public, anon;
grant execute on function public.create_inbound_address(text) to authenticated;

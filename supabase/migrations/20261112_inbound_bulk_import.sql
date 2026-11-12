-- Importación del historial: «Reenviar como archivo adjunto» manda muchos .eml en un solo correo
alter table public.inbound_addresses
  add column if not exists last_import_at timestamptz,
  add column if not exists last_import_count int;

create or replace function public.inbound_touch_n(a uuid, n int)
returns void language sql security definer set search_path to '' as $$
  update public.inbound_addresses
     set last_received_at = now(), received_count = received_count + greatest(n, 0),
         last_import_at = now(), last_import_count = n
   where id = a;
$$;
revoke all on function public.inbound_touch_n(uuid, int) from public, anon, authenticated;

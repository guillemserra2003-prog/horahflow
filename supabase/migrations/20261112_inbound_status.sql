-- Estado de conexión de cada dirección de reenvío
alter table public.inbound_addresses
  add column if not exists source_email text check (source_email is null or char_length(source_email) <= 254),
  add column if not exists last_seen_at timestamptz,   -- último correo reenviado de verdad (sea o no un cobro)
  add column if not exists confirmed_at timestamptz;   -- el usuario confirmó el reenvío, o ya llegó correo tras la verificación

-- El usuario marca su propia dirección como confirmada (sin poder tocar nada más)
create or replace function public.confirm_inbound_address(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.inbound_addresses set confirmed_at = now()
  where id = p_id and user_id = (select auth.uid());
$$;
revoke all on function public.confirm_inbound_address(uuid) from public, anon;
grant execute on function public.confirm_inbound_address(uuid) to authenticated;

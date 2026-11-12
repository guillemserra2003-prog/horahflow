-- Facturas en PDF: el correo se guarda al momento y el PDF espera aquí a que lo lea «pdf-worker».
-- Mientras tanto el recibo no se ve en la app (pdf_pending), para no importarlo sin importe.
alter table public.inbound_emails add column if not exists pdf_pending boolean not null default false;

create table if not exists public.inbound_pdfs (
  id bigint generated always as identity primary key,
  email_id bigint not null references public.inbound_emails(id) on delete cascade,
  filename text,
  data text not null,          -- PDF en base64
  tries int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists inbound_pdfs_email on public.inbound_pdfs(email_id);
alter table public.inbound_pdfs enable row level security;   -- sin políticas: solo el servidor
revoke all on public.inbound_pdfs from anon, authenticated;

drop policy if exists "ver mis recibos entrantes" on public.inbound_emails;
create policy "ver mis recibos entrantes" on public.inbound_emails for select to authenticated
  using (user_id = (select auth.uid()) and not pdf_pending);

-- Red de seguridad: cada 5 minutos se procesa lo que haya quedado en la cola
select cron.unschedule('horahflow-pdf') where exists (select 1 from cron.job where jobname = 'horahflow-pdf');
select cron.schedule('horahflow-pdf', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://jmqikuquouqvcmkimrdk.supabase.co/functions/v1/pdf-worker',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-key',(select value from private.config where key='CRON_KEY')),
    body := '{}'::jsonb, timeout_milliseconds := 60000)
  where exists (select 1 from public.inbound_pdfs)
$$);

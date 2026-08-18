-- Tabla para credenciales de admin (simple, una sola fila)
create table if not exists public.admin_credentials (
  id int primary key default 1,
  password_hash text not null,
  updated_at timestamptz default now()
);

-- Insertar password por defecto (gloria2026)
insert into public.admin_credentials (id, password_hash)
values (1, 'gloria2026')
on conflict (id) do nothing;

-- RLS
alter table public.admin_credentials enable row level security;

-- Policy: permitir lectura pública para login
create policy "Public read admin credentials" on public.admin_credentials
  for select using (true);

-- Policy: solo service role puede actualizar
create policy "Service role update admin credentials" on public.admin_credentials
  for update using (auth.role() = 'service_role');
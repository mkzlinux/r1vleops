-- R1VLE Ops schema. Apply to a dedicated Supabase project.
-- Public (anon) visitors can ONLY: read services, call create_order(), call track_order().
-- Everything else requires an authenticated user listed in public.admins.

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

create table public.services (
  id text primary key,
  department_id text not null check (department_id in ('security','intelligence','creative')),
  name text not null,
  summary text not null default '',
  price_usd numeric(12,2) not null check (price_usd >= 0),
  unit text not null check (unit in ('fixed','from','monthly')),
  delivery_days int not null default 7,
  includes text[] not null default '{}',
  sort int not null default 0
);

create table public.workers (
  id text primary key,
  kind text not null check (kind in ('ai','human')),
  name text not null,
  role text not null,
  department_id text not null check (department_id in ('security','intelligence','creative','hq')),
  email text not null default '',
  status text not null default 'invited' check (status in ('online','busy','idle','invited')),
  joined_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null unique,
  invoice_no text not null unique,
  created_at timestamptz not null default now(),
  department_id text not null,
  client jsonb not null,
  brief text not null default '' check (char_length(brief) <= 4000),
  lines jsonb not null,
  deposit_pct int not null default 50,
  stage text not null default 'awaiting_deposit'
    check (stage in ('awaiting_deposit','deposit_confirmed','in_progress','in_review','delivered','closed')),
  progress int not null default 0 check (progress between 0 and 100),
  assigned_worker_id text references public.workers (id) on delete set null
);

create table public.order_updates (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  at timestamptz not null default now(),
  stage text not null,
  progress int not null,
  note text not null default ''
);
create index order_updates_order_id_idx on public.order_updates (order_id, at);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_assigned_worker_idx on public.orders (assigned_worker_id);

alter table public.admins enable row level security;
alter table public.services enable row level security;
alter table public.workers enable row level security;
alter table public.orders enable row level security;
alter table public.order_updates enable row level security;

create policy "admins read self" on public.admins for select to authenticated using (user_id = (select auth.uid()));
create policy "services public read" on public.services for select to anon, authenticated using (true);
create policy "services admin write" on public.services for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "workers admin all" on public.workers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "orders admin all" on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "updates admin all" on public.order_updates for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Order as the JSON shape the app uses. include_contact=false hides client email/phone for public tracking.
create or replace function public.order_json(o public.orders, include_contact boolean)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', o.id, 'trackingCode', o.tracking_code, 'invoiceNo', o.invoice_no, 'createdAt', o.created_at,
    'departmentId', o.department_id,
    'client', case when include_contact then o.client
                   else jsonb_build_object('name', o.client->>'name', 'company', o.client->>'company', 'email', '', 'whatsapp', '') end,
    'brief', case when include_contact then o.brief else '' end,
    'lines', o.lines, 'depositPct', o.deposit_pct, 'stage', o.stage, 'progress', o.progress,
    'assignedWorkerId', case when include_contact then o.assigned_worker_id else null end,
    'updates', coalesce((select jsonb_agg(jsonb_build_object('at', u.at, 'stage', u.stage, 'progress', u.progress, 'note', u.note) order by u.at)
                         from public.order_updates u where u.order_id = o.id), '[]'::jsonb)
  );
$$;

create or replace function public.gen_tracking_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'R1V-';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, 1 + floor(random() * 32)::int, 1);
    if i = 4 then result := result || '-'; end if;
  end loop;
  return result;
end $$;

-- Public: place an order. Prices always come from the services table, never from the client.
create or replace function public.create_order(p_client jsonb, p_brief text, p_service_ids text[])
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_lines jsonb;
  v_dept text;
  v_year text := to_char(now(), 'YYYY');
  v_next int;
  v_invoice text;
  v_code text;
  v_order public.orders;
begin
  if p_client is null or char_length(coalesce(p_client->>'name','')) < 2 then raise exception 'Please enter your name.'; end if;
  if coalesce(p_client->>'email','') !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Please enter a valid email address.'; end if;
  if char_length(regexp_replace(coalesce(p_client->>'whatsapp',''), '\D', '', 'g')) < 9 then raise exception 'Please enter a WhatsApp number with country code.'; end if;
  if p_service_ids is null or cardinality(p_service_ids) = 0 or cardinality(p_service_ids) > 10 then raise exception 'Pick between 1 and 10 services.'; end if;
  if char_length(coalesce(p_brief,'')) > 4000 then raise exception 'Project brief is too long.'; end if;

  select jsonb_agg(jsonb_build_object('serviceId', s.id, 'name', s.name, 'qty', 1, 'rateUsd', s.price_usd) order by array_position(p_service_ids, s.id)),
         (array_agg(s.department_id order by array_position(p_service_ids, s.id)))[1]
    into v_lines, v_dept
    from public.services s where s.id = any (p_service_ids);
  if v_lines is null or jsonb_array_length(v_lines) <> cardinality(p_service_ids) then raise exception 'Unknown service selected.'; end if;

  perform pg_advisory_xact_lock(hashtext('r1vle_invoice_no'));
  select coalesce(max(substring(invoice_no from '\d+$')::int), 0) + 1 into v_next
    from public.orders where invoice_no like 'R1VLE-INV-' || v_year || '-%';
  v_invoice := 'R1VLE-INV-' || v_year || '-' || lpad(v_next::text, 3, '0');

  loop
    v_code := public.gen_tracking_code();
    exit when not exists (select 1 from public.orders where tracking_code = v_code);
  end loop;

  insert into public.orders (tracking_code, invoice_no, department_id, client, brief, lines)
  values (v_code, v_invoice, v_dept,
          jsonb_build_object('name', left(p_client->>'name', 120), 'company', left(coalesce(p_client->>'company',''), 120),
                             'email', left(p_client->>'email', 200), 'whatsapp', left(p_client->>'whatsapp', 40)),
          coalesce(p_brief,''), v_lines)
  returning * into v_order;

  insert into public.order_updates (order_id, stage, progress, note)
  values (v_order.id, 'awaiting_deposit', 0, 'Order received. Invoice ' || v_invoice || ' issued; work starts once the 50% deposit is confirmed.');

  return public.order_json(v_order, false);
end $$;

-- Public: look up an order by its tracking code. Returns null when not found; never exposes contact details.
create or replace function public.track_order(p_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.order_json(o, false) from public.orders o
  where o.tracking_code = upper(regexp_replace(coalesce(p_code,''), '\s', '', 'g'));
$$;

revoke execute on function public.order_json(public.orders, boolean) from public, anon;
revoke execute on function public.gen_tracking_code() from public, anon;
revoke execute on function public.create_order(jsonb, text, text[]) from public;
revoke execute on function public.track_order(text) from public;
grant execute on function public.create_order(jsonb, text, text[]) to anon, authenticated;
grant execute on function public.track_order(text) to anon, authenticated;
grant execute on function public.order_json(public.orders, boolean) to authenticated;

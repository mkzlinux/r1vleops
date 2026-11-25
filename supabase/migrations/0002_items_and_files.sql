-- Quantities per line (flyers, posters…) and client file attachments.

alter table public.orders add column attachments jsonb not null default '[]'::jsonb;

-- order_json now includes attachments (names only for public tracking).
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
    'attachments', o.attachments,
    'updates', coalesce((select jsonb_agg(jsonb_build_object('at', u.at, 'stage', u.stage, 'progress', u.progress, 'note', u.note) order by u.at)
                         from public.order_updates u where u.order_id = o.id), '[]'::jsonb)
  );
$$;

-- Replace create_order(service_ids) with create_order(items) carrying quantities.
drop function if exists public.create_order(jsonb, text, text[]);

create or replace function public.create_order(p_client jsonb, p_brief text, p_items jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_lines jsonb;
  v_dept text;
  v_count int;
  v_year text := to_char(now(), 'YYYY');
  v_next int;
  v_invoice text;
  v_code text;
  v_order public.orders;
begin
  if p_client is null or char_length(coalesce(p_client->>'name','')) < 2 then raise exception 'Please enter your name.'; end if;
  if coalesce(p_client->>'email','') !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Please enter a valid email address.'; end if;
  if char_length(regexp_replace(coalesce(p_client->>'whatsapp',''), '\D', '', 'g')) < 9 then raise exception 'Please enter a WhatsApp number with country code.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then raise exception 'Pick between 1 and 30 items.'; end if;
  if char_length(coalesce(p_brief,'')) > 4000 then raise exception 'Project brief is too long.'; end if;

  -- Prices always come from the services table; quantities are clamped per unit.
  select jsonb_agg(jsonb_build_object(
           'serviceId', s.id, 'name', s.name, 'rateUsd', s.price_usd,
           'qty', least(greatest((i.value->>'qty')::int, 1), case s.unit when 'each' then 50 when 'monthly' then 12 else 1 end)
         ) order by i.ordinality),
         (array_agg(s.department_id order by i.ordinality))[1],
         count(*)
    into v_lines, v_dept, v_count
    from jsonb_array_elements(p_items) with ordinality as i(value, ordinality)
    join public.services s on s.id = i.value->>'serviceId'
   where (i.value->>'qty') ~ '^[0-9]{1,3}$';
  if v_lines is null or v_count <> jsonb_array_length(p_items) then raise exception 'Unknown service or invalid quantity.'; end if;

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

-- Public: record uploaded files on an order, only within 2 hours of placing it and at most 10 files.
create or replace function public.attach_files(p_code text, p_attachments jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_order public.orders;
begin
  if jsonb_typeof(p_attachments) <> 'array' or jsonb_array_length(p_attachments) > 10 then raise exception 'Too many files.'; end if;
  select * into v_order from public.orders
   where tracking_code = upper(p_code) and created_at > now() - interval '2 hours' for update;
  if not found then raise exception 'Order not found or no longer accepting files.'; end if;
  if jsonb_array_length(v_order.attachments) + jsonb_array_length(p_attachments) > 10 then raise exception 'Too many files.'; end if;
  if exists (select 1 from jsonb_array_elements(p_attachments) a where (a->>'key') not like v_order.id::text || '/%') then
    raise exception 'Invalid file path.';
  end if;
  update public.orders set attachments = attachments || p_attachments where id = v_order.id returning * into v_order;
  return public.order_json(v_order, false);
end $$;

revoke execute on function public.create_order(jsonb, text, jsonb) from public;
revoke execute on function public.attach_files(text, jsonb) from public;
grant execute on function public.create_order(jsonb, text, jsonb) to anon, authenticated;
grant execute on function public.attach_files(text, jsonb) to anon, authenticated;

-- Private bucket for client files: 15 MB per file. Anyone may upload into the folder of an order
-- placed in the last 2 hours; only admins can read.
insert into storage.buckets (id, name, public, file_size_limit)
values ('order-files', 'order-files', false, 15728640)
on conflict (id) do nothing;

create policy "order files: upload to fresh order" on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'order-files'
    and exists (select 1 from public.orders o
                where o.id::text = (storage.foldername(name))[1]
                  and o.created_at > now() - interval '2 hours')
  );
create policy "order files: admins read" on storage.objects for select to authenticated
  using (bucket_id = 'order-files' and public.is_admin());

-- Regional price tiers (e.g. Zimbabwe flyers $20 / $17 each for 2+) and the region an order was quoted on.

alter table public.services add column regional jsonb not null default '{}'::jsonb;
alter table public.orders add column region text not null default 'intl' check (region in ('zw', 'intl'));

-- Unit price for a service in a region at a quantity: the highest tier whose minQty <= qty, else list price.
create or replace function public.unit_price(s public.services, p_region text, p_qty int)
returns numeric language sql immutable set search_path = '' as $$
  select coalesce(
    (select (t->>'priceUsd')::numeric
       from jsonb_array_elements(coalesce(s.regional -> p_region, '[]'::jsonb)) t
      where (t->>'minQty')::int <= p_qty
      order by (t->>'minQty')::int desc
      limit 1),
    s.price_usd);
$$;

drop function if exists public.create_order(jsonb, text, jsonb);

create or replace function public.create_order(p_client jsonb, p_brief text, p_items jsonb, p_region text)
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
  v_digits text := regexp_replace(coalesce(p_client->>'whatsapp',''), '\D', '', 'g');
begin
  if p_region not in ('zw', 'intl') then raise exception 'Unknown pricing region.'; end if;
  if p_client is null or char_length(coalesce(p_client->>'name','')) < 2 then raise exception 'Please enter your name.'; end if;
  if coalesce(p_client->>'email','') !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Please enter a valid email address.'; end if;
  if char_length(v_digits) < 9 then raise exception 'Please enter a WhatsApp number with country code.'; end if;
  if p_region = 'zw' and not (v_digits like '263%' or v_digits ~ '^07[0-9]{8}$') then
    raise exception 'Zimbabwe pricing needs a Zimbabwean (+263) WhatsApp number.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then raise exception 'Pick between 1 and 30 items.'; end if;
  if char_length(coalesce(p_brief,'')) > 4000 then raise exception 'Project brief is too long.'; end if;

  with picked as (
    select s, i.ordinality,
           least(greatest((i.value->>'qty')::int, 1), case s.unit when 'each' then 50 when 'monthly' then 12 else 1 end) as qty
      from jsonb_array_elements(p_items) with ordinality as i(value, ordinality)
      join public.services s on s.id = i.value->>'serviceId'
     where (i.value->>'qty') ~ '^[0-9]{1,3}$'
  )
  select jsonb_agg(jsonb_build_object('serviceId', (s).id, 'name', (s).name, 'qty', qty,
                                      'rateUsd', public.unit_price(s, p_region, qty)) order by ordinality),
         (array_agg((s).department_id order by ordinality))[1],
         count(*)
    into v_lines, v_dept, v_count
    from picked;
  if v_lines is null or v_count <> jsonb_array_length(p_items) then raise exception 'Unknown service or invalid quantity.'; end if;

  perform pg_advisory_xact_lock(hashtext('r1vle_invoice_no'));
  select coalesce(max(substring(invoice_no from '\d+$')::int), 0) + 1 into v_next
    from public.orders where invoice_no like 'R1VLE-INV-' || v_year || '-%';
  v_invoice := 'R1VLE-INV-' || v_year || '-' || lpad(v_next::text, 3, '0');

  loop
    v_code := public.gen_tracking_code();
    exit when not exists (select 1 from public.orders where tracking_code = v_code);
  end loop;

  insert into public.orders (tracking_code, invoice_no, department_id, client, brief, lines, region)
  values (v_code, v_invoice, v_dept,
          jsonb_build_object('name', left(p_client->>'name', 120), 'company', left(coalesce(p_client->>'company',''), 120),
                             'email', left(p_client->>'email', 200), 'whatsapp', left(p_client->>'whatsapp', 40)),
          coalesce(p_brief,''), v_lines, p_region)
  returning * into v_order;

  insert into public.order_updates (order_id, stage, progress, note)
  values (v_order.id, 'awaiting_deposit', 0, 'Order received. Invoice ' || v_invoice || ' issued; work starts once the 50% deposit is confirmed.');

  return public.order_json(v_order, false) || jsonb_build_object('region', v_order.region);
end $$;

revoke execute on function public.create_order(jsonb, text, jsonb, text) from public;
grant execute on function public.create_order(jsonb, text, jsonb, text) to anon, authenticated;

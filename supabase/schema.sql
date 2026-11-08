create extension if not exists pgcrypto;
create table if not exists public.artworks(id uuid primary key default gen_random_uuid(),slug text unique not null,title text not null,description text not null default '',image_path text not null,year integer,medium text,dimensions text,status text not null default 'exhibition' check(status in('exhibition','available','auction','sold','archived')),price_mxn numeric(12,2) check(price_mxn is null or price_mxn>=0),certificate_available boolean not null default false,published boolean not null default false,sort_order integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.inquiries(id uuid primary key default gen_random_uuid(),name text not null,email text not null,topic text not null,message text not null,artwork_id uuid references public.artworks(id) on delete set null,source text not null default 'website',status text not null default 'new' check(status in('new','contacted','qualified','closed','spam')),created_at timestamptz not null default now());
create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,display_alias text not null,email text,identity_verified boolean not null default false,deposit_verified boolean not null default false,suspended boolean not null default false,created_at timestamptz not null default now());
create table if not exists public.admin_users(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create table if not exists public.auctions(id uuid primary key default gen_random_uuid(),artwork_id uuid not null references public.artworks(id),status text not null default 'scheduled' check(status in('scheduled','live','ended','cancelled')),starts_at timestamptz not null,ends_at timestamptz not null,reserve_price_mxn numeric(12,2) not null check(reserve_price_mxn>0),minimum_increment_mxn numeric(12,2) not null default 100 check(minimum_increment_mxn>0),anti_sniping_window_seconds integer not null default 180 check(anti_sniping_window_seconds between 0 and 900),anti_sniping_extension_seconds integer not null default 180 check(anti_sniping_extension_seconds between 0 and 900),current_bid_mxn numeric(12,2),winner_user_id uuid references public.profiles(id),created_at timestamptz not null default now(),check(ends_at>starts_at));
create table if not exists public.auction_bids(id uuid primary key default gen_random_uuid(),auction_id uuid not null references public.auctions(id) on delete cascade,bidder_id uuid not null references public.profiles(id),amount_mxn numeric(12,2) not null check(amount_mxn>0),created_at timestamptz not null default now());
create index if not exists auction_bids_auction_time_idx on public.auction_bids(auction_id,created_at desc);
create index if not exists inquiries_created_idx on public.inquiries(created_at desc);
create index if not exists artworks_published_idx on public.artworks(published,status,sort_order);
alter table public.artworks enable row level security;alter table public.inquiries enable row level security;alter table public.profiles enable row level security;alter table public.admin_users enable row level security;alter table public.auctions enable row level security;alter table public.auction_bids enable row level security;
create or replace function public.is_morfo_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()); $$;
create policy "published artworks are public" on public.artworks for select using(published=true or public.is_morfo_admin());
create policy "admins manage artworks" on public.artworks for all using(public.is_morfo_admin()) with check(public.is_morfo_admin());
create policy "visitors create enquiries" on public.inquiries for insert with check(char_length(name) between 2 and 100 and char_length(email) between 5 and 160 and char_length(message) between 5 and 1500);
create policy "admins read enquiries" on public.inquiries for select using(public.is_morfo_admin());
create policy "admins update enquiries" on public.inquiries for update using(public.is_morfo_admin()) with check(public.is_morfo_admin());
create policy "users read own profile" on public.profiles for select using(id=auth.uid() or public.is_morfo_admin());
create policy "admins manage profiles" on public.profiles for all using(public.is_morfo_admin()) with check(public.is_morfo_admin());
create policy "public read open auctions" on public.auctions for select using(status in('scheduled','live') or public.is_morfo_admin());
create policy "admins manage auctions" on public.auctions for all using(public.is_morfo_admin()) with check(public.is_morfo_admin());
create policy "public sees bid amounts" on public.auction_bids for select using(true);
revoke insert,update,delete on public.auction_bids from anon,authenticated;
create or replace function public.place_bid(p_auction_id uuid,p_amount_mxn numeric) returns table(bid_id uuid,current_bid_mxn numeric,ends_at timestamptz) language plpgsql security definer set search_path=public as $$
declare a public.auctions%rowtype;p public.profiles%rowtype;v_bid_id uuid;v_now timestamptz:=now();
begin
if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
select * into p from public.profiles where id=auth.uid();
if not found or not p.identity_verified or not p.deposit_verified or p.suspended then raise exception 'BIDDER_NOT_VERIFIED';end if;
select * into a from public.auctions where id=p_auction_id for update;
if not found or a.status<>'live' or v_now<a.starts_at or v_now>=a.ends_at then raise exception 'AUCTION_NOT_OPEN';end if;
if p_amount_mxn<greatest(a.reserve_price_mxn,coalesce(a.current_bid_mxn,0)+a.minimum_increment_mxn) then raise exception 'BID_TOO_LOW';end if;
insert into public.auction_bids(auction_id,bidder_id,amount_mxn) values(a.id,auth.uid(),p_amount_mxn) returning id into v_bid_id;
update public.auctions set current_bid_mxn=p_amount_mxn,ends_at=case when a.ends_at-v_now<=make_interval(secs=>a.anti_sniping_window_seconds) then a.ends_at+make_interval(secs=>a.anti_sniping_extension_seconds) else a.ends_at end where id=a.id returning * into a;
return query select v_bid_id,a.current_bid_mxn,a.ends_at;
end;$$;
revoke all on function public.place_bid(uuid,numeric) from public;grant execute on function public.place_bid(uuid,numeric) to authenticated;
insert into public.artworks(slug,title,description,image_path,year,status,published,sort_order) values('el-testigo','El testigo','Pintura original de MORFO. Ficha técnica y disponibilidad pendientes de confirmación.','1ra pintura.jpg',2026,'exhibition',false,1) on conflict(slug) do nothing;


-- Public web permissions; RLS remains the authorization boundary.
grant usage on schema public to anon,authenticated;
grant select on public.artworks to anon,authenticated;
grant insert on public.inquiries to anon,authenticated;
grant select,update on public.inquiries to authenticated;
grant select,insert,update,delete on public.artworks to authenticated;
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant select,insert,update,delete on public.auctions to authenticated;
grant select on public.auction_bids to anon,authenticated;
grant execute on function public.is_morfo_admin() to authenticated;

-- Create a private bidder profile when a user registers by email OTP.
create or replace function public.handle_new_morfo_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.profiles(id,display_alias,email)
 values(new.id,coalesce(nullif(new.raw_user_meta_data->>'display_alias',''),split_part(coalesce(new.email,'coleccionista'),'@',1)),new.email)
 on conflict(id) do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_created_morfo on auth.users;
create trigger on_auth_user_created_morfo after insert on auth.users
for each row execute procedure public.handle_new_morfo_user();

-- Keep bidder identity private; public history contains amounts and timestamps only.
drop policy if exists "public sees bid amounts" on public.auction_bids;
create policy "bidders and admins see bids" on public.auction_bids for select
using(bidder_id=auth.uid() or public.is_morfo_admin());
create or replace view public.auction_bid_history with (security_invoker=true) as
select auction_id,amount_mxn,created_at from public.auction_bids;
grant select on public.auction_bid_history to anon,authenticated;


-- Public read-only bid history omits bidder identity.
create or replace view public.auction_bid_history as
select auction_id,amount_mxn,created_at from public.auction_bids;
grant select on public.auction_bid_history to anon,authenticated;

create or replace function public.close_auction(p_auction_id uuid)
returns uuid language plpgsql security definer set search_path=public
as $$
declare a public.auctions%rowtype;v_winner uuid;v_highest numeric;
begin
 if not public.is_morfo_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 select * into a from public.auctions where id=p_auction_id for update;
 if not found or a.status<>'live' then raise exception 'AUCTION_NOT_LIVE'; end if;
 if now()<a.ends_at then raise exception 'AUCTION_NOT_FINISHED'; end if;
 select bidder_id,amount_mxn into v_winner,v_highest from public.auction_bids where auction_id=a.id order by amount_mxn desc,created_at asc limit 1;
 if v_highest is null or v_highest<a.reserve_price_mxn then v_winner:=null; end if;
 update public.auctions set status='ended',winner_user_id=v_winner where id=a.id;
 return v_winner;
end; $$;
revoke all on function public.close_auction(uuid) from public;
grant execute on function public.close_auction(uuid) to authenticated;

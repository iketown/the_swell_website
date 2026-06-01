do $$
begin
  create type public.song_part_assignment_area as enum ('vocal', 'instrumental');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.song_part_assets (
  id uuid not null default extensions.uuid_generate_v4(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  song_id uuid not null,
  kind public.part_file_kind not null,
  title varchar(255) not null check (length(trim(title)) > 0),
  description text,
  storage_path varchar(1000) not null check (length(trim(storage_path)) > 0),
  mime_type varchar(120) not null,
  size_bytes bigint check (
    size_bytes is null
    or size_bytes > 0
  ),
  default_area public.song_part_assignment_area,
  order_index integer not null default 0 check (order_index >= 0),
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  created_by uuid references auth.users,
  updated_by uuid references auth.users,
  primary key (id),
  unique (account_id, id),
  unique (account_id, storage_path),
  foreign key (account_id, song_id) references public.songs (account_id, id) on delete cascade,
  check (
    (
      kind = 'guide_audio'
      and mime_type in ('audio/mpeg', 'audio/mp3')
    )
    or (
      kind = 'chart_pdf'
      and mime_type = 'application/pdf'
    )
  )
);

comment on table public.song_part_assets is 'Single-file song parts that can be assigned to one or more members';

create table if not exists public.song_part_assignments (
  id uuid not null default extensions.uuid_generate_v4(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  song_id uuid not null,
  asset_id uuid not null,
  member_id uuid not null,
  area public.song_part_assignment_area not null,
  order_index integer not null default 0 check (order_index >= 0),
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  created_by uuid references auth.users,
  updated_by uuid references auth.users,
  primary key (id),
  unique (account_id, id),
  unique (account_id, asset_id, member_id, area),
  foreign key (account_id, song_id) references public.songs (account_id, id) on delete cascade,
  foreign key (account_id, asset_id) references public.song_part_assets (account_id, id) on delete cascade,
  foreign key (account_id, member_id) references public.members (account_id, id) on delete cascade
);

comment on table public.song_part_assignments is 'Assignments of song part assets to members in vocal or instrumental columns';

revoke all on public.song_part_assets from anon, authenticated, service_role;
revoke all on public.song_part_assignments from anon, authenticated, service_role;
grant select, insert, update, delete on table public.song_part_assets to authenticated, service_role;
grant select, insert, update, delete on table public.song_part_assignments to authenticated, service_role;

create index if not exists ix_song_part_assets_song_area_order on public.song_part_assets (song_id, default_area, order_index);
create index if not exists ix_song_part_assignments_song_member_area_order on public.song_part_assignments (
  song_id,
  member_id,
  area,
  order_index
);
create index if not exists ix_song_part_assignments_asset on public.song_part_assignments (asset_id);

drop trigger if exists song_part_assets_set_timestamps on public.song_part_assets;
create trigger song_part_assets_set_timestamps
before insert or update on public.song_part_assets
for each row execute function public.trigger_set_timestamps();

drop trigger if exists song_part_assets_set_user_tracking on public.song_part_assets;
create trigger song_part_assets_set_user_tracking
before insert or update on public.song_part_assets
for each row execute function public.trigger_set_user_tracking();

drop trigger if exists song_part_assignments_set_timestamps on public.song_part_assignments;
create trigger song_part_assignments_set_timestamps
before insert or update on public.song_part_assignments
for each row execute function public.trigger_set_timestamps();

drop trigger if exists song_part_assignments_set_user_tracking on public.song_part_assignments;
create trigger song_part_assignments_set_user_tracking
before insert or update on public.song_part_assignments
for each row execute function public.trigger_set_user_tracking();

alter table public.song_part_assets enable row level security;
alter table public.song_part_assignments enable row level security;

create policy song_part_assets_read on public.song_part_assets for
select
  to authenticated using (
    public.has_role_on_account(account_id)
    or public.is_super_admin()
  );

create policy song_part_assets_owner_insert on public.song_part_assets for
insert
  to authenticated with check (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

create policy song_part_assets_owner_update on public.song_part_assets for
update
  to authenticated using (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  )
with
  check (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

create policy song_part_assets_owner_delete on public.song_part_assets for delete
  to authenticated using (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

create policy song_part_assignments_read on public.song_part_assignments for
select
  to authenticated using (
    public.has_role_on_account(account_id)
    or public.is_super_admin()
  );

create policy song_part_assignments_owner_insert on public.song_part_assignments for
insert
  to authenticated with check (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

create policy song_part_assignments_owner_update on public.song_part_assignments for
update
  to authenticated using (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  )
with
  check (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

create policy song_part_assignments_owner_delete on public.song_part_assignments for delete
  to authenticated using (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

insert into public.song_part_assets (
  account_id,
  song_id,
  kind,
  title,
  storage_path,
  mime_type,
  size_bytes,
  default_area,
  order_index,
  created_at,
  updated_at,
  created_by,
  updated_by
)
select
  song_files.account_id,
  song_files.song_id,
  song_files.kind,
  song_files.label,
  song_files.storage_path,
  song_files.mime_type,
  song_files.size_bytes,
  null::public.song_part_assignment_area,
  song_files.order_index,
  song_files.created_at,
  song_files.updated_at,
  song_files.created_by,
  song_files.updated_by
from public.song_files
on conflict (account_id, storage_path) do nothing;

insert into public.song_part_assets (
  account_id,
  song_id,
  kind,
  title,
  description,
  storage_path,
  mime_type,
  size_bytes,
  default_area,
  order_index,
  created_at,
  updated_at,
  created_by,
  updated_by
)
select
  part_files.account_id,
  parts.song_id,
  part_files.kind,
  part_files.label,
  parts.description,
  part_files.storage_path,
  part_files.mime_type,
  part_files.size_bytes,
  case
    when parts.type = 'instrumental' then 'instrumental'::public.song_part_assignment_area
    else 'vocal'::public.song_part_assignment_area
  end,
  part_files.order_index,
  part_files.created_at,
  part_files.updated_at,
  part_files.created_by,
  part_files.updated_by
from public.part_files
join public.parts on
  parts.account_id = part_files.account_id
  and parts.id = part_files.part_id
on conflict (account_id, storage_path) do nothing;

insert into public.song_part_assignments (
  account_id,
  song_id,
  asset_id,
  member_id,
  area,
  order_index,
  created_at,
  updated_at,
  created_by,
  updated_by
)
select
  part_files.account_id,
  parts.song_id,
  assets.id,
  parts.default_member_id,
  case
    when parts.type = 'instrumental' then 'instrumental'::public.song_part_assignment_area
    else 'vocal'::public.song_part_assignment_area
  end,
  part_files.order_index,
  part_files.created_at,
  part_files.updated_at,
  part_files.created_by,
  part_files.updated_by
from public.part_files
join public.parts on
  parts.account_id = part_files.account_id
  and parts.id = part_files.part_id
join public.song_part_assets assets on
  assets.account_id = part_files.account_id
  and assets.storage_path = part_files.storage_path
where parts.default_member_id is not null
on conflict (account_id, asset_id, member_id, area) do nothing;

/*
 * -------------------------------------------------------
 * Section: The Swell band OS
 * Members, songs, parts, and practice files.
 * -------------------------------------------------------
 */

create type public.member_status as enum(
  'candidate',
  'active',
  'inactive',
  'alumni'
);

create type public.member_type as enum(
  'performer',
  'crew'
);

create type public.instrument_slot as enum(
  'rhy_gtr',
  'lead_gtr',
  'keys',
  'bass',
  'drums'
);

create type public.vocal_slot as enum(
  'vocal_1',
  'vocal_2',
  'vocal_3',
  'vocal_4',
  'vocal_5'
);

create type public.part_type as enum(
  'vocal',
  'instrumental'
);

create type public.part_slot as enum(
  'vocal_1',
  'vocal_2',
  'vocal_3',
  'vocal_4',
  'vocal_5',
  'rhy_gtr',
  'lead_gtr',
  'keys',
  'bass',
  'drums'
);

create type public.song_status as enum(
  'active',
  'learning',
  'candidate',
  'retired'
);

create type public.part_file_kind as enum(
  'guide_audio',
  'chart_pdf'
);

create table if not exists
  public.members (
    id uuid not null default extensions.uuid_generate_v4(),
    account_id uuid not null references public.accounts (id) on delete cascade,
    user_id uuid references auth.users on delete set null,
    account_role varchar(50) references public.roles (name) not null default 'member',
    status public.member_status not null default 'candidate',
    display_name varchar(255) not null check (length(trim(display_name)) > 0),
    legal_name varchar(255),
    email varchar(320) not null check (position('@' in email) > 1),
    phone varchar(50),
    role_label varchar(255),
    bio varchar(5000),
    shirt_size varchar(50),
    suit_size varchar(50),
    shoe_size varchar(50),
    member_type public.member_type not null default 'performer',
    default_instrument public.instrument_slot,
    default_vocal_slot public.vocal_slot,
    instrument_capabilities public.instrument_slot[] not null default '{}'::public.instrument_slot[],
    vocal_capabilities public.vocal_slot[] not null default '{}'::public.vocal_slot[],
    capability_notes varchar(5000),
    photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array'),
    candidate_notes varchar(5000),
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    created_by uuid references auth.users,
    updated_by uuid references auth.users,
    primary key (id),
    unique (account_id, id),
    unique (account_id, user_id),
    check (
      default_instrument is null
      or default_instrument = any(instrument_capabilities)
    ),
    check (
      default_vocal_slot is null
      or default_vocal_slot = any(vocal_capabilities)
    )
  );

comment on table public.members is 'Band members and candidates for The Swell';
comment on column public.members.account_id is 'The MakerKit account/workspace this band member belongs to';
comment on column public.members.user_id is 'The linked Supabase auth user. Candidate rows can be null';
comment on column public.members.account_role is 'UI mirror of MakerKit account membership role. Account membership remains authoritative';
comment on column public.members.instrument_capabilities is 'Instrument slots this member can cover';
comment on column public.members.vocal_capabilities is 'Harmony slots this member can cover';

create table if not exists
  public.member_private_financial (
    member_id uuid not null,
    account_id uuid not null references public.accounts (id) on delete cascade,
    address jsonb,
    billing jsonb,
    tax jsonb,
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    created_by uuid references auth.users,
    updated_by uuid references auth.users,
    primary key (member_id),
    unique (account_id, member_id),
    foreign key (account_id, member_id) references public.members (account_id, id) on delete cascade,
    check (address is null or jsonb_typeof(address) = 'object'),
    check (billing is null or jsonb_typeof(billing) = 'object'),
    check (tax is null or jsonb_typeof(tax) = 'object')
  );

comment on table public.member_private_financial is 'Private financial/address/tax status for a band member';

create table if not exists
  public.songs (
    id uuid not null default extensions.uuid_generate_v4(),
    account_id uuid not null references public.accounts (id) on delete cascade,
    title varchar(255) not null check (length(trim(title)) > 0),
    original_artist varchar(255) default 'The Beach Boys',
    year_recorded integer check (
      year_recorded is null
      or year_recorded between 1900 and 2100
    ),
    song_key varchar(24),
    bpm integer check (
      bpm is null
      or bpm between 1 and 400
    ),
    status public.song_status not null default 'learning',
    duration_sec integer check (
      duration_sec is null
      or duration_sec > 0
    ),
    notes varchar(5000),
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    created_by uuid references auth.users,
    updated_by uuid references auth.users,
    primary key (id),
    unique (account_id, id)
  );

comment on table public.songs is 'The Swell song repertoire';

create table if not exists
  public.tags (
    id uuid not null default extensions.uuid_generate_v4(),
    account_id uuid not null references public.accounts (id) on delete cascade,
    display varchar(120) not null check (length(trim(display)) > 0),
    slug varchar(120) not null check (slug = lower(slug)) check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    color varchar(32) not null default 'teal' check (
      color in (
        'teal',
        'coral',
        'gold',
        'avocado',
        'hibiscus',
        'driftwood'
      )
    ),
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    created_by uuid references auth.users,
    updated_by uuid references auth.users,
    primary key (id),
    unique (account_id, id),
    unique (account_id, slug)
  );

comment on table public.tags is 'Flexible repertoire tags for songs, such as era, theme, or show section';

create table if not exists
  public.song_tags (
    account_id uuid not null references public.accounts (id) on delete cascade,
    song_id uuid not null,
    tag_id uuid not null,
    created_at timestamptz not null default current_timestamp,
    created_by uuid references auth.users,
    updated_by uuid references auth.users,
    primary key (account_id, song_id, tag_id),
    foreign key (account_id, song_id) references public.songs (account_id, id) on delete cascade,
    foreign key (account_id, tag_id) references public.tags (account_id, id) on delete cascade
  );

comment on table public.song_tags is 'Many-to-many assignment of tags to songs';

create table if not exists
  public.parts (
    id uuid not null default extensions.uuid_generate_v4(),
    account_id uuid not null references public.accounts (id) on delete cascade,
    song_id uuid not null,
    type public.part_type not null,
    slot public.part_slot not null,
    label varchar(255),
    is_lead boolean not null default false,
    default_member_id uuid,
    order_index integer not null default 0 check (order_index >= 0),
    notes varchar(5000),
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    created_by uuid references auth.users,
    updated_by uuid references auth.users,
    primary key (id),
    unique (account_id, id),
    foreign key (account_id, song_id) references public.songs (account_id, id) on delete cascade,
    foreign key (account_id, default_member_id) references public.members (account_id, id) on delete set null (default_member_id),
    check (
      (
        type = 'vocal'
        and slot in (
          'vocal_1',
          'vocal_2',
          'vocal_3',
          'vocal_4',
          'vocal_5'
        )
      )
      or (
        type = 'instrumental'
        and slot in (
          'rhy_gtr',
          'lead_gtr',
          'keys',
          'bass',
          'drums'
        )
      )
    )
  );

comment on table public.parts is 'Per-song vocal and instrumental parts, including default performer assignment';

create table if not exists
  public.part_files (
    id uuid not null default extensions.uuid_generate_v4(),
    account_id uuid not null references public.accounts (id) on delete cascade,
    part_id uuid not null,
    kind public.part_file_kind not null,
    label varchar(255) not null check (length(trim(label)) > 0),
    storage_path varchar(1000) not null check (length(trim(storage_path)) > 0),
    mime_type varchar(120) not null,
    size_bytes bigint check (
      size_bytes is null
      or size_bytes > 0
    ),
    order_index integer not null default 0 check (order_index >= 0),
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    created_by uuid references auth.users,
    updated_by uuid references auth.users,
    primary key (id),
    unique (account_id, id),
    unique (account_id, storage_path),
    foreign key (account_id, part_id) references public.parts (account_id, id) on delete cascade,
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

comment on table public.part_files is 'Guide MP3s and PDF charts attached to a part';

-- Grants
revoke all on public.members from anon, authenticated, service_role;
revoke all on public.member_private_financial from anon, authenticated, service_role;
revoke all on public.songs from anon, authenticated, service_role;
revoke all on public.tags from anon, authenticated, service_role;
revoke all on public.song_tags from anon, authenticated, service_role;
revoke all on public.parts from anon, authenticated, service_role;
revoke all on public.part_files from anon, authenticated, service_role;

grant select, insert, update, delete on table public.members to authenticated, service_role;
grant select, insert, update, delete on table public.member_private_financial to authenticated, service_role;
grant select, insert, update, delete on table public.songs to authenticated, service_role;
grant select, insert, update, delete on table public.tags to authenticated, service_role;
grant select, insert, delete on table public.song_tags to authenticated, service_role;
grant select, insert, update, delete on table public.parts to authenticated, service_role;
grant select, insert, update, delete on table public.part_files to authenticated, service_role;

-- Indexes
create index ix_members_account_status_display_name on public.members (account_id, status, display_name);
create index ix_members_account_user_id on public.members (account_id, user_id);
create index ix_members_instrument_capabilities on public.members using gin (instrument_capabilities);
create index ix_members_vocal_capabilities on public.members using gin (vocal_capabilities);

create index ix_songs_account_status_title on public.songs (account_id, status, title);
create index ix_tags_account_display on public.tags (account_id, display);
create index ix_song_tags_tag_song on public.song_tags (account_id, tag_id, song_id);
create index ix_song_tags_song_tag on public.song_tags (account_id, song_id, tag_id);

create index ix_parts_account_default_member_song_order on public.parts (
  account_id,
  default_member_id,
  song_id,
  order_index
);
create index ix_parts_song_order on public.parts (song_id, order_index);

create index ix_part_files_part_kind_order on public.part_files (part_id, kind, order_index);

-- Triggers
create trigger members_set_timestamps
before insert or update on public.members
for each row execute function public.trigger_set_timestamps();

create trigger members_set_user_tracking
before insert or update on public.members
for each row execute function public.trigger_set_user_tracking();

create trigger member_private_financial_set_timestamps
before insert or update on public.member_private_financial
for each row execute function public.trigger_set_timestamps();

create trigger member_private_financial_set_user_tracking
before insert or update on public.member_private_financial
for each row execute function public.trigger_set_user_tracking();

create trigger songs_set_timestamps
before insert or update on public.songs
for each row execute function public.trigger_set_timestamps();

create trigger songs_set_user_tracking
before insert or update on public.songs
for each row execute function public.trigger_set_user_tracking();

create trigger tags_set_timestamps
before insert or update on public.tags
for each row execute function public.trigger_set_timestamps();

create trigger tags_set_user_tracking
before insert or update on public.tags
for each row execute function public.trigger_set_user_tracking();

create trigger song_tags_set_user_tracking
before insert on public.song_tags
for each row execute function public.trigger_set_user_tracking();

create trigger parts_set_timestamps
before insert or update on public.parts
for each row execute function public.trigger_set_timestamps();

create trigger parts_set_user_tracking
before insert or update on public.parts
for each row execute function public.trigger_set_user_tracking();

create trigger part_files_set_timestamps
before insert or update on public.part_files
for each row execute function public.trigger_set_timestamps();

create trigger part_files_set_user_tracking
before insert or update on public.part_files
for each row execute function public.trigger_set_user_tracking();

create
or replace function kit.protect_member_owner_fields () returns trigger
set
  search_path = '' as $$
begin
    if current_user = 'authenticated'
      and not public.has_role_on_account(old.account_id, 'owner')
    then
      if new.account_id <> old.account_id
        or new.user_id is distinct from old.user_id
        or new.account_role <> old.account_role
        or new.status <> old.status
        or new.default_instrument is distinct from old.default_instrument
        or new.default_vocal_slot is distinct from old.default_vocal_slot
        or new.instrument_capabilities is distinct from old.instrument_capabilities
        or new.vocal_capabilities is distinct from old.vocal_capabilities
        or new.capability_notes is distinct from old.capability_notes
        or new.candidate_notes is distinct from old.candidate_notes
      then
        raise exception 'Only owners can update member-managed fields';
      end if;
    end if;

    return new;
end;
$$ language plpgsql;

create trigger protect_member_owner_fields before
update on public.members for each row
execute function kit.protect_member_owner_fields ();

-- RLS
alter table public.members enable row level security;
alter table public.member_private_financial enable row level security;
alter table public.songs enable row level security;
alter table public.tags enable row level security;
alter table public.song_tags enable row level security;
alter table public.parts enable row level security;
alter table public.part_files enable row level security;

create policy members_read on public.members for
select
  to authenticated using (
    public.has_role_on_account(account_id)
    or public.is_super_admin()
  );

create policy members_owner_insert on public.members for
insert
  to authenticated with check (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

create policy members_owner_update on public.members for
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

create policy members_owner_delete on public.members for delete
  to authenticated using (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

create policy members_self_update on public.members for
update
  to authenticated using (user_id = (select auth.uid()))
with
  check (user_id = (select auth.uid()));

create policy member_private_financial_read on public.member_private_financial for
select
  to authenticated using (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
    or exists (
      select
        1
      from
        public.members member_row
      where
        member_row.id = member_private_financial.member_id
        and member_row.account_id = member_private_financial.account_id
        and member_row.user_id = (select auth.uid())
    )
  );

create policy member_private_financial_write on public.member_private_financial for all
  to authenticated using (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
    or exists (
      select
        1
      from
        public.members member_row
      where
        member_row.id = member_private_financial.member_id
        and member_row.account_id = member_private_financial.account_id
        and member_row.user_id = (select auth.uid())
    )
  )
with
  check (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
    or exists (
      select
        1
      from
        public.members member_row
      where
        member_row.id = member_private_financial.member_id
        and member_row.account_id = member_private_financial.account_id
        and member_row.user_id = (select auth.uid())
    )
  );

create policy songs_read on public.songs for
select
  to authenticated using (
    public.has_role_on_account(account_id)
    or public.is_super_admin()
  );

create policy songs_owner_insert on public.songs for
insert
  to authenticated with check (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

create policy songs_owner_update on public.songs for
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

create policy songs_owner_delete on public.songs for delete
  to authenticated using (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

create policy tags_read on public.tags for
select
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'tags.read'::public.app_permissions)
    or public.is_super_admin()
  );

create policy tags_manage_insert on public.tags for
insert
  to authenticated with check (
    public.has_permission((select auth.uid()), account_id, 'tags.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy tags_manage_update on public.tags for
update
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'tags.manage'::public.app_permissions)
    or public.is_super_admin()
  )
with
  check (
    public.has_permission((select auth.uid()), account_id, 'tags.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy tags_manage_delete on public.tags for delete
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'tags.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy song_tags_read on public.song_tags for
select
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'tags.read'::public.app_permissions)
    or public.is_super_admin()
  );

create policy song_tags_manage_insert on public.song_tags for
insert
  to authenticated with check (
    public.has_permission((select auth.uid()), account_id, 'tags.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy song_tags_manage_delete on public.song_tags for delete
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'tags.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy parts_read on public.parts for
select
  to authenticated using (
    public.has_role_on_account(account_id)
    or public.is_super_admin()
  );

create policy parts_owner_insert on public.parts for
insert
  to authenticated with check (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

create policy parts_owner_update on public.parts for
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

create policy parts_owner_delete on public.parts for delete
  to authenticated using (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

create policy part_files_read on public.part_files for
select
  to authenticated using (
    public.has_role_on_account(account_id)
    or public.is_super_admin()
  );

create policy part_files_owner_insert on public.part_files for
insert
  to authenticated with check (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

create policy part_files_owner_update on public.part_files for
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

create policy part_files_owner_delete on public.part_files for delete
  to authenticated using (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

-- Storage bucket and policies
insert into
  storage.buckets (id, name, public)
values
  ('band_assets', 'band_assets', false)
on conflict (id) do update
set
  public = excluded.public;

create
or replace function kit.get_storage_object_account_id (name text) returns uuid
set
  search_path = '' as $$
declare
    folder_names text[];
begin
    folder_names := storage.foldername(name);

    if array_length(folder_names, 1) < 1 then
      return null;
    end if;

    return folder_names[1]::uuid;
exception
    when invalid_text_representation then
      return null;
end;
$$ language plpgsql;

grant execute on function kit.get_storage_object_account_id (text) to authenticated, service_role;

create policy band_assets_read on storage.objects for
select
  to authenticated using (
    bucket_id = 'band_assets'
    and (
      public.has_role_on_account(kit.get_storage_object_account_id(name))
      or public.is_super_admin()
    )
  );

create policy band_assets_owner_insert on storage.objects for
insert
  to authenticated with check (
    bucket_id = 'band_assets'
    and (
      public.has_role_on_account(kit.get_storage_object_account_id(name), 'owner')
      or public.is_super_admin()
    )
  );

create policy band_assets_owner_update on storage.objects for
update
  to authenticated using (
    bucket_id = 'band_assets'
    and (
      public.has_role_on_account(kit.get_storage_object_account_id(name), 'owner')
      or public.is_super_admin()
    )
  )
with
  check (
    bucket_id = 'band_assets'
    and (
      public.has_role_on_account(kit.get_storage_object_account_id(name), 'owner')
      or public.is_super_admin()
    )
  );

create policy band_assets_owner_delete on storage.objects for delete
  to authenticated using (
    bucket_id = 'band_assets'
    and (
      public.has_role_on_account(kit.get_storage_object_account_id(name), 'owner')
      or public.is_super_admin()
    )
  );

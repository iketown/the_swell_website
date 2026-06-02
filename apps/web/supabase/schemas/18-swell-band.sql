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
  'instrumental',
  'other'
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
  'drums',
  'other'
);

create type public.song_status as enum(
  'active',
  'learning',
  'candidate',
  'retired'
);

create type public.part_file_kind as enum(
  'guide_audio',
  'chart_pdf',
  'rich_text_note'
);

create type public.song_part_assignment_area as enum(
  'vocal',
  'instrumental',
  'shared'
);

create
or replace function kit.swell_slugify (value text) returns text
set
  search_path = '' as $$
  select nullif(
    regexp_replace(
      regexp_replace(replace(lower(trim(value)), '''', ''), '[^a-z0-9]+', '-', 'g'),
      '(^-|-$)',
      '',
      'g'
    ),
    ''
  );
$$ language sql immutable;

grant execute on function kit.swell_slugify (text) to authenticated, service_role;

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
    slug varchar(255) not null default '' check (slug = lower(slug)) check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
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
    popularity_rank integer check (
      popularity_rank is null
      or popularity_rank > 0
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
    unique (account_id, id),
    unique (account_id, slug)
  );

comment on table public.songs is 'The Swell song repertoire';
comment on column public.songs.slug is 'Stable URL slug used by /band/songs/[song-slug]';
comment on column public.songs.popularity_rank is 'Lower number means more popular in the reference import source';

create table if not exists
  public.albums (
    id uuid not null default extensions.uuid_generate_v4(),
    account_id uuid not null references public.accounts (id) on delete cascade,
    slug varchar(255) not null check (slug = lower(slug)) check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    title varchar(255) not null check (length(trim(title)) > 0),
    original_artist varchar(255) not null default 'The Beach Boys',
    released_on date,
    release_year integer generated always as (extract(year from released_on)::integer) stored,
    album_type varchar(50) not null default 'studio',
    studio boolean not null default true,
    cover_art_url varchar(1000),
    reference_url varchar(1000),
    notes varchar(5000),
    created_at timestamptz not null default current_timestamp,
    updated_at timestamptz not null default current_timestamp,
    created_by uuid references auth.users,
    updated_by uuid references auth.users,
    primary key (id),
    unique (account_id, id),
    unique (account_id, slug)
  );

comment on table public.albums is 'Canonical record/album reference pages for The Swell repertoire';
comment on column public.albums.slug is 'Stable URL slug used by /band/albums/[album-slug]';
comment on column public.albums.cover_art_url is 'External or storage URL for album artwork reference';

create table if not exists
  public.song_albums (
    account_id uuid not null references public.accounts (id) on delete cascade,
    song_id uuid not null,
    album_id uuid not null,
    order_index integer not null default 0 check (order_index >= 0),
    created_at timestamptz not null default current_timestamp,
    created_by uuid references auth.users,
    updated_by uuid references auth.users,
    primary key (account_id, song_id, album_id),
    foreign key (account_id, song_id) references public.songs (account_id, id) on delete cascade,
    foreign key (account_id, album_id) references public.albums (account_id, id) on delete cascade
  );

comment on table public.song_albums is 'Many-to-many relationship between songs and records/albums';

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
    description varchar(5000),
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
      or (
        type = 'other'
        and slot = 'other'
      )
    )
  );

comment on table public.parts is 'Per-song vocal and instrumental parts, including default performer assignment';
comment on column public.parts.description is 'Member-facing notes for learning or performing this part';

create table if not exists
  public.song_files (
    id uuid not null default extensions.uuid_generate_v4(),
    account_id uuid not null references public.accounts (id) on delete cascade,
    song_id uuid not null,
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
    foreign key (account_id, song_id) references public.songs (account_id, id) on delete cascade,
    check (
      (
        kind = 'guide_audio'
        and mime_type in ('audio/mpeg', 'audio/mp3')
        and storage_path is not null
        and content is null
      )
      or (
        kind = 'chart_pdf'
        and mime_type = 'application/pdf'
        and storage_path is not null
        and content is null
      )
    )
  );

comment on table public.song_files is 'Song-level uploaded MP3s and PDFs that can be attached to one or more parts';

create table if not exists
  public.song_part_assets (
    id uuid not null default extensions.uuid_generate_v4(),
    account_id uuid not null references public.accounts (id) on delete cascade,
    song_id uuid not null,
    kind public.part_file_kind not null,
    title varchar(255) not null check (length(trim(title)) > 0),
    description text,
    storage_path varchar(1000) check (
      storage_path is null
      or length(trim(storage_path)) > 0
    ),
    mime_type varchar(120),
    size_bytes bigint check (
      size_bytes is null
      or size_bytes > 0
    ),
    content jsonb check (
      content is null
      or jsonb_typeof(content) = 'object'
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
      or (
        kind = 'rich_text_note'
        and storage_path is null
        and mime_type is null
        and size_bytes is null
        and content is not null
      )
    )
  );

comment on table public.song_part_assets is 'Song part assets that can be assigned to one or more members, including uploaded files and rich text notes';
comment on column public.song_part_assets.content is 'Tiptap JSON content for rich text note assets';

create table if not exists
  public.song_part_assignments (
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
revoke all on public.albums from anon, authenticated, service_role;
revoke all on public.song_albums from anon, authenticated, service_role;
revoke all on public.tags from anon, authenticated, service_role;
revoke all on public.song_tags from anon, authenticated, service_role;
revoke all on public.parts from anon, authenticated, service_role;
revoke all on public.song_files from anon, authenticated, service_role;
revoke all on public.song_part_assets from anon, authenticated, service_role;
revoke all on public.song_part_assignments from anon, authenticated, service_role;
revoke all on public.part_files from anon, authenticated, service_role;

grant select, insert, update, delete on table public.members to authenticated, service_role;
grant select, insert, update, delete on table public.member_private_financial to authenticated, service_role;
grant select, insert, update, delete on table public.songs to authenticated, service_role;
grant select, insert, update, delete on table public.albums to authenticated, service_role;
grant select, insert, delete on table public.song_albums to authenticated, service_role;
grant select, insert, update, delete on table public.tags to authenticated, service_role;
grant select, insert, delete on table public.song_tags to authenticated, service_role;
grant select, insert, update, delete on table public.parts to authenticated, service_role;
grant select, insert, update, delete on table public.song_files to authenticated, service_role;
grant select, insert, update, delete on table public.song_part_assets to authenticated, service_role;
grant select, insert, update, delete on table public.song_part_assignments to authenticated, service_role;
grant select, insert, update, delete on table public.part_files to authenticated, service_role;

-- Indexes
create index ix_members_account_status_display_name on public.members (account_id, status, display_name);
create index ix_members_account_user_id on public.members (account_id, user_id);
create index ix_members_instrument_capabilities on public.members using gin (instrument_capabilities);
create index ix_members_vocal_capabilities on public.members using gin (vocal_capabilities);

create index ix_songs_account_status_title on public.songs (account_id, status, title);
create index ix_songs_account_slug on public.songs (account_id, slug);
create index ix_songs_account_popularity_rank on public.songs (account_id, popularity_rank);
create index ix_albums_account_title on public.albums (account_id, title);
create index ix_song_albums_album_song on public.song_albums (account_id, album_id, song_id);
create index ix_song_albums_song_album on public.song_albums (account_id, song_id, album_id);
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

create index ix_song_files_song_kind_order on public.song_files (song_id, kind, order_index);
create index ix_song_part_assets_song_area_order on public.song_part_assets (song_id, default_area, order_index);
create index ix_song_part_assignments_song_member_area_order on public.song_part_assignments (
  song_id,
  member_id,
  area,
  order_index
);
create index ix_song_part_assignments_asset on public.song_part_assignments (asset_id);
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

create
or replace function kit.set_song_slug () returns trigger
set
  search_path = '' as $$
begin
  if new.slug is null or length(trim(new.slug)) = 0 then
    new.slug := coalesce(kit.swell_slugify(new.title), left(new.id::text, 8));
  else
    new.slug := kit.swell_slugify(new.slug);
  end if;

  if new.slug is null then
    raise exception 'Song slug cannot be empty';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger songs_set_slug
before insert or update of title, slug on public.songs
for each row execute function kit.set_song_slug ();

create trigger albums_set_timestamps
before insert or update on public.albums
for each row execute function public.trigger_set_timestamps();

create trigger albums_set_user_tracking
before insert or update on public.albums
for each row execute function public.trigger_set_user_tracking();

create trigger song_albums_set_user_tracking
before insert on public.song_albums
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

create trigger song_files_set_timestamps
before insert or update on public.song_files
for each row execute function public.trigger_set_timestamps();

create trigger song_files_set_user_tracking
before insert or update on public.song_files
for each row execute function public.trigger_set_user_tracking();

create trigger song_part_assets_set_timestamps
before insert or update on public.song_part_assets
for each row execute function public.trigger_set_timestamps();

create trigger song_part_assets_set_user_tracking
before insert or update on public.song_part_assets
for each row execute function public.trigger_set_user_tracking();

create trigger song_part_assignments_set_timestamps
before insert or update on public.song_part_assignments
for each row execute function public.trigger_set_timestamps();

create trigger song_part_assignments_set_user_tracking
before insert or update on public.song_part_assignments
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
alter table public.albums enable row level security;
alter table public.song_albums enable row level security;
alter table public.tags enable row level security;
alter table public.song_tags enable row level security;
alter table public.parts enable row level security;
alter table public.song_files enable row level security;
alter table public.song_part_assets enable row level security;
alter table public.song_part_assignments enable row level security;
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

create policy albums_read on public.albums for
select
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'songs.read'::public.app_permissions)
    or public.is_super_admin()
  );

create policy albums_manage_insert on public.albums for
insert
  to authenticated with check (
    public.has_permission((select auth.uid()), account_id, 'songs.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy albums_manage_update on public.albums for
update
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'songs.manage'::public.app_permissions)
    or public.is_super_admin()
  )
with
  check (
    public.has_permission((select auth.uid()), account_id, 'songs.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy albums_manage_delete on public.albums for delete
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'songs.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy song_albums_read on public.song_albums for
select
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'songs.read'::public.app_permissions)
    or public.is_super_admin()
  );

create policy song_albums_manage_insert on public.song_albums for
insert
  to authenticated with check (
    public.has_permission((select auth.uid()), account_id, 'songs.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy song_albums_manage_delete on public.song_albums for delete
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'songs.manage'::public.app_permissions)
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

create policy song_files_read on public.song_files for
select
  to authenticated using (
    public.has_role_on_account(account_id)
    or public.is_super_admin()
  );

create policy song_files_owner_insert on public.song_files for
insert
  to authenticated with check (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

create policy song_files_owner_update on public.song_files for
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

create policy song_files_owner_delete on public.song_files for delete
  to authenticated using (
    public.has_role_on_account(account_id, 'owner')
    or public.is_super_admin()
  );

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

alter type public.app_permissions add value if not exists 'tags.read';
alter type public.app_permissions add value if not exists 'tags.manage';

commit;

insert into public.role_permissions (role, permission)
values
  ('owner', 'tags.read'),
  ('owner', 'tags.manage'),
  ('management', 'tags.read'),
  ('management', 'tags.manage'),
  ('performer', 'tags.read')
on conflict (role, permission) do nothing;

create table if not exists "public"."tags" (
  "id" uuid not null default extensions.uuid_generate_v4(),
  "account_id" uuid not null references public.accounts (id) on delete cascade,
  "display" varchar(120) not null,
  "slug" varchar(120) not null,
  "created_at" timestamp with time zone not null default current_timestamp,
  "updated_at" timestamp with time zone not null default current_timestamp,
  "created_by" uuid references auth.users(id),
  "updated_by" uuid references auth.users(id),
  primary key ("id"),
  unique ("account_id", "id"),
  unique ("account_id", "slug"),
  check (length(trim("display")) > 0),
  check ("slug" = lower("slug")),
  check ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists "public"."song_tags" (
  "account_id" uuid not null references public.accounts (id) on delete cascade,
  "song_id" uuid not null,
  "tag_id" uuid not null,
  "created_at" timestamp with time zone not null default current_timestamp,
  "created_by" uuid references auth.users(id),
  "updated_by" uuid references auth.users(id),
  primary key ("account_id", "song_id", "tag_id"),
  foreign key ("account_id", "song_id") references public.songs ("account_id", "id") on delete cascade,
  foreign key ("account_id", "tag_id") references public.tags ("account_id", "id") on delete cascade
);

comment on table public.tags is 'Flexible repertoire tags for songs, such as era, theme, or show section';
comment on table public.song_tags is 'Many-to-many assignment of tags to songs';

insert into public.tags ("account_id", "display", "slug")
select distinct
  "account_id",
  trim("era") as "display",
  lower(
    regexp_replace(
      regexp_replace(trim("era"), '[^a-zA-Z0-9]+', '-', 'g'),
      '(^-|-$)',
      '',
      'g'
    )
  ) as "slug"
from public.songs
where "era" is not null
  and length(trim("era")) > 0
on conflict ("account_id", "slug") do nothing;

insert into public.song_tags ("account_id", "song_id", "tag_id")
select
  songs."account_id",
  songs."id",
  tags."id"
from public.songs
join public.tags
  on tags."account_id" = songs."account_id"
  and tags."slug" = lower(
    regexp_replace(
      regexp_replace(trim(songs."era"), '[^a-zA-Z0-9]+', '-', 'g'),
      '(^-|-$)',
      '',
      'g'
    )
  )
where songs."era" is not null
  and length(trim(songs."era")) > 0
on conflict ("account_id", "song_id", "tag_id") do nothing;

alter table "public"."songs"
drop column if exists "era";

revoke all on public.tags from anon, authenticated, service_role;
revoke all on public.song_tags from anon, authenticated, service_role;

grant select, insert, update, delete on table public.tags to authenticated, service_role;
grant select, insert, delete on table public.song_tags to authenticated, service_role;

create index if not exists ix_tags_account_display on public.tags ("account_id", "display");
create index if not exists ix_song_tags_tag_song on public.song_tags ("account_id", "tag_id", "song_id");
create index if not exists ix_song_tags_song_tag on public.song_tags ("account_id", "song_id", "tag_id");

create trigger tags_set_timestamps
before insert or update on public.tags
for each row execute function public.trigger_set_timestamps();

create trigger tags_set_user_tracking
before insert or update on public.tags
for each row execute function public.trigger_set_user_tracking();

create trigger song_tags_set_user_tracking
before insert on public.song_tags
for each row execute function public.trigger_set_user_tracking();

alter table public.tags enable row level security;
alter table public.song_tags enable row level security;

create policy tags_read on public.tags for select
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'tags.read'::public.app_permissions)
    or public.is_super_admin()
  );

create policy tags_manage_insert on public.tags for insert
  to authenticated with check (
    public.has_permission((select auth.uid()), account_id, 'tags.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy tags_manage_update on public.tags for update
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'tags.manage'::public.app_permissions)
    or public.is_super_admin()
  )
  with check (
    public.has_permission((select auth.uid()), account_id, 'tags.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy tags_manage_delete on public.tags for delete
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'tags.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy song_tags_read on public.song_tags for select
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'tags.read'::public.app_permissions)
    or public.is_super_admin()
  );

create policy song_tags_manage_insert on public.song_tags for insert
  to authenticated with check (
    public.has_permission((select auth.uid()), account_id, 'tags.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy song_tags_manage_delete on public.song_tags for delete
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'tags.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create table if not exists public.song_files (
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
    )
    or (
      kind = 'chart_pdf'
      and mime_type = 'application/pdf'
    )
  )
);

comment on table public.song_files is 'Song-level uploaded MP3s and PDFs that can be attached to one or more parts';

revoke all on public.song_files from anon, authenticated, service_role;
grant select, insert, update, delete on table public.song_files to authenticated, service_role;

create index if not exists ix_song_files_song_kind_order on public.song_files (song_id, kind, order_index);

drop trigger if exists song_files_set_timestamps on public.song_files;
create trigger song_files_set_timestamps
before insert or update on public.song_files
for each row execute function public.trigger_set_timestamps();

drop trigger if exists song_files_set_user_tracking on public.song_files;
create trigger song_files_set_user_tracking
before insert or update on public.song_files
for each row execute function public.trigger_set_user_tracking();

alter table public.song_files enable row level security;

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

alter table public.song_part_assets
  alter column storage_path drop not null,
  alter column mime_type drop not null,
  add column if not exists content jsonb;

alter table public.song_part_assets
  drop constraint if exists song_part_assets_check,
  drop constraint if exists song_part_assets_storage_path_check,
  drop constraint if exists song_part_assets_content_check;

alter table public.song_part_assets
  add constraint song_part_assets_storage_path_check check (
    storage_path is null
    or length(trim(storage_path)) > 0
  ),
  add constraint song_part_assets_content_check check (
    content is null
    or jsonb_typeof(content) = 'object'
  ),
  add constraint song_part_assets_check check (
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
    or (
      kind = 'rich_text_note'
      and storage_path is null
      and mime_type is null
      and size_bytes is null
      and content is not null
    )
  );

comment on table public.song_part_assets is 'Song part assets that can be assigned to one or more members, including uploaded files and rich text notes';
comment on column public.song_part_assets.content is 'Tiptap JSON content for rich text note assets';

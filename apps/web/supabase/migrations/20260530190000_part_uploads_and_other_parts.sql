alter type public.part_type
add
  value if not exists 'other';

alter type public.part_slot
add
  value if not exists 'other';

alter table public.parts
add column if not exists description varchar(5000);

comment on column public.parts.description is 'Member-facing notes for learning or performing this part';

alter table public.parts
drop constraint if exists parts_check;

alter table public.parts
add constraint parts_check check (
  (
    type::text = 'vocal'
    and slot::text in (
      'vocal_1',
      'vocal_2',
      'vocal_3',
      'vocal_4',
      'vocal_5'
    )
  )
  or (
    type::text = 'instrumental'
    and slot::text in (
      'rhy_gtr',
      'lead_gtr',
      'keys',
      'bass',
      'drums'
    )
  )
  or (
    type::text = 'other'
    and slot::text = 'other'
  )
) not valid;

alter table public.parts
validate constraint parts_check;

update public.parts
set
  description = notes
where
  description is null
  and notes is not null;

delete from public.part_files
where
  (
    storage_path like '%/guide.mp3'
    and size_bytes in (1, 2048000)
  )
  or (
    storage_path like '%/chart.pdf'
    and size_bytes in (1, 512000)
  );

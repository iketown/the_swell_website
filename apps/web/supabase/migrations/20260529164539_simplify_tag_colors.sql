update public.tags
set color = case color
  when 'sky' then 'teal'
  when 'sand' then 'gold'
  else color
end;

alter table public.tags
drop constraint if exists tags_color_check;

alter table public.tags
add constraint tags_color_check
check (
  color in (
    'teal',
    'coral',
    'gold',
    'avocado',
    'hibiscus',
    'driftwood'
  )
);

alter table public.tags
add column if not exists color varchar(32) not null default 'teal';

alter table public.tags
drop constraint if exists tags_color_check;

alter table public.tags
add constraint tags_color_check
check (
  color in (
    'teal',
    'coral',
    'gold',
    'sky',
    'sand',
    'avocado',
    'hibiscus',
    'driftwood'
  )
);

update public.tags
set color = case slug
  when 'surf-songs' then 'sky'
  when 'car-songs' then 'coral'
  when 'early-songs' then 'gold'
  when 'pet-sounds' then 'teal'
  when 'summer-days' then 'sand'
  when 'smile-era' then 'hibiscus'
  else color
end;

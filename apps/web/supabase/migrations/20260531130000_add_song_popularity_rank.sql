alter table public.songs
add column if not exists popularity_rank integer;

alter table public.songs
drop constraint if exists songs_popularity_rank_check;

alter table public.songs
add constraint songs_popularity_rank_check check (
  popularity_rank is null
  or popularity_rank > 0
) not valid;

alter table public.songs
validate constraint songs_popularity_rank_check;

comment on column public.songs.popularity_rank is 'Lower number means more popular in the reference import source';

create index if not exists ix_songs_account_popularity_rank on public.songs (account_id, popularity_rank);

update public.songs
set
  popularity_rank = nullif(
    regexp_replace(notes, '^.*rank #([0-9]+).*$'::text, '\1'),
    notes
  )::integer
where
  popularity_rank is null
  and notes ~ 'rank #[0-9]+';

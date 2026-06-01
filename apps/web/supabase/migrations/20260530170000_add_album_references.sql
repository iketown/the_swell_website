/*
 * Add album reference data, song slugs, and Beach Boys reference seeding.
 */

create or replace function kit.swell_slugify(value text) returns text
set search_path = '' as $$
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

grant execute on function kit.swell_slugify(text) to authenticated, service_role;

alter table public.songs
add column if not exists slug varchar(255) default '';

with base as (
  select
    id,
    account_id,
    coalesce(kit.swell_slugify(title), left(id::text, 8)) as slug_base
  from public.songs
  where slug is null
    or length(trim(slug)) = 0
), numbered as (
  select
    id,
    case
      when row_number() over (partition by account_id, slug_base order by id) = 1 then slug_base
      else slug_base || '-' || row_number() over (partition by account_id, slug_base order by id)
    end as next_slug
  from base
)
update public.songs
set slug = numbered.next_slug
from numbered
where songs.id = numbered.id
  and (
    songs.slug is null
    or length(trim(songs.slug)) = 0
  );

alter table public.songs
alter column slug set not null;

alter table public.songs
alter column slug set default '';

alter table public.songs
add constraint songs_account_slug_unique unique (account_id, slug);

create or replace function kit.set_song_slug() returns trigger
set search_path = '' as $$
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

create or replace trigger songs_set_slug
before insert or update of title, slug on public.songs
for each row execute function kit.set_song_slug();

create table if not exists public.albums (
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

create table if not exists public.song_albums (
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

revoke all on public.albums from anon, authenticated, service_role;
revoke all on public.song_albums from anon, authenticated, service_role;

grant select, insert, update, delete on table public.albums to authenticated, service_role;
grant select, insert, delete on table public.song_albums to authenticated, service_role;

create index if not exists ix_songs_account_slug on public.songs (account_id, slug);
create index if not exists ix_albums_account_title on public.albums (account_id, title);
create index if not exists ix_song_albums_album_song on public.song_albums (account_id, album_id, song_id);
create index if not exists ix_song_albums_song_album on public.song_albums (account_id, song_id, album_id);

create trigger albums_set_timestamps
before insert or update on public.albums
for each row execute function public.trigger_set_timestamps();

create trigger albums_set_user_tracking
before insert or update on public.albums
for each row execute function public.trigger_set_user_tracking();

create trigger song_albums_set_user_tracking
before insert on public.song_albums
for each row execute function public.trigger_set_user_tracking();

alter table public.albums enable row level security;
alter table public.song_albums enable row level security;

create policy albums_read on public.albums for select
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'songs.read'::public.app_permissions)
    or public.is_super_admin()
  );

create policy albums_manage_insert on public.albums for insert
  to authenticated with check (
    public.has_permission((select auth.uid()), account_id, 'songs.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy albums_manage_update on public.albums for update
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'songs.manage'::public.app_permissions)
    or public.is_super_admin()
  )
  with check (
    public.has_permission((select auth.uid()), account_id, 'songs.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy albums_manage_delete on public.albums for delete
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'songs.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy song_albums_read on public.song_albums for select
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'songs.read'::public.app_permissions)
    or public.is_super_admin()
  );

create policy song_albums_manage_insert on public.song_albums for insert
  to authenticated with check (
    public.has_permission((select auth.uid()), account_id, 'songs.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create policy song_albums_manage_delete on public.song_albums for delete
  to authenticated using (
    public.has_permission((select auth.uid()), account_id, 'songs.manage'::public.app_permissions)
    or public.is_super_admin()
  );

create or replace function kit.seed_beach_boys_reference(target_account_id uuid) returns void
set search_path = '' as $$
declare
  seed jsonb := '{"meta":{"artist":"The Beach Boys","generatedAt":"2026-05-30","purpose":"Reference seed data for The Swell song import workflow.","popularitySource":"https://kworb.net/spotify/artist/3oDbviiivRWhXwIE8hxkVV_songs.html","albumScope":"Original Beach Boys studio albums released through 1980, including the 1964 Christmas album.","fieldNotes":["records contains album ids in this file, ready to map to a song_albums join table.","album.songs is derived from song.records and only lists the 60 reference songs present in this seed file, not every track on the album.","songKey and bpm are best-effort reference fields; null means verify before arranging or importing.","Later hits in the popularity list, such as Kokomo, keep records empty because their source releases are outside the through-1980 album scope."]},"albums":[{"id":"surfin-safari","title":"Surfin'' Safari","released":"1962-10-01","releaseYear":1962,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/c/c9/Surfin%27SafariCover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/Surfin%27_Safari","songs":["surfin-safari","409"]},{"id":"surfin-usa","title":"Surfin'' U.S.A.","released":"1963-03-25","releaseYear":1963,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/6/67/Surfin%27USACover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/Surfin%27_U.S.A._(album)","songs":["surfin-usa"]},{"id":"surfer-girl","title":"Surfer Girl","released":"1963-09-16","releaseYear":1963,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/7/74/SurferGirlCover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/Surfer_Girl_(album)","songs":["surfer-girl","in-my-room","little-deuce-coupe","catch-a-wave"]},{"id":"little-deuce-coupe","title":"Little Deuce Coupe","released":"1963-10-07","releaseYear":1963,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/6/65/LittleDeuceCover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/Little_Deuce_Coupe_(album)","songs":["little-deuce-coupe","409","be-true-to-your-school"]},{"id":"shut-down-volume-2","title":"Shut Down Volume 2","released":"1964-03-02","releaseYear":1964,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/7/7a/ShutDownVol2Cover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/Shut_Down_Volume_2","songs":["dont-worry-baby","fun-fun-fun","the-warmth-of-the-sun"]},{"id":"all-summer-long","title":"All Summer Long","released":"1964-07-13","releaseYear":1964,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/c/cf/AllSummerLongCover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/All_Summer_Long_(album)","songs":["i-get-around","all-summer-long","little-honda"]},{"id":"the-beach-boys-christmas-album","title":"The Beach Boys'' Christmas Album","released":"1964-11-09","releaseYear":1964,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/2/2b/BBXmasCover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/The_Beach_Boys%27_Christmas_Album","songs":["little-saint-nick","frosty-the-snowman","the-man-with-all-the-toys","merry-christmas-baby","we-three-kings-of-orient-are","santas-beard","santa-claus-is-comin-to-town"]},{"id":"the-beach-boys-today","title":"The Beach Boys Today!","released":"1965-03-08","releaseYear":1965,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/3/33/BeachBoysTodayCover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/The_Beach_Boys_Today!","songs":["help-me-rhonda","dance-dance-dance","do-you-wanna-dance"]},{"id":"summer-days-and-summer-nights","title":"Summer Days (And Summer Nights!!)","released":"1965-07-05","releaseYear":1965,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/0/0e/SummerDaysandSummerNights.album.cover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/Summer_Days_(And_Summer_Nights!!)","songs":["california-girls","help-me-rhonda","then-i-kissed-her","youre-so-good-to-me"]},{"id":"beach-boys-party","title":"Beach Boys'' Party!","released":"1965-11-08","releaseYear":1965,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/0/0c/BeachBoysParty.album.cover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/Beach_Boys%27_Party!","songs":["barbara-ann"]},{"id":"pet-sounds","title":"Pet Sounds","released":"1966-05-16","releaseYear":1966,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Pet_Sounds_%28color_corrected%29.jpg/330px-Pet_Sounds_%28color_corrected%29.jpg","referenceUrl":"https://en.wikipedia.org/wiki/Pet_Sounds","songs":["wouldnt-it-be-nice","god-only-knows","sloop-john-b","dont-talk-put-your-head-on-my-shoulder","caroline-no","lets-go-away-for-awhile","thats-not-me","you-still-believe-in-me","i-just-wasnt-made-for-these-times","i-know-theres-an-answer","im-waiting-for-the-day","pet-sounds","here-today"]},{"id":"smiley-smile","title":"Smiley Smile","released":"1967-09-18","releaseYear":1967,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/5/5d/Smileysmilebeachboys.png","referenceUrl":"https://en.wikipedia.org/wiki/Smiley_Smile","songs":["good-vibrations","heroes-and-villains"]},{"id":"wild-honey","title":"Wild Honey","released":"1967-12-18","releaseYear":1967,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/9/9f/Wild_honey_beach_boys.jpg","referenceUrl":"https://en.wikipedia.org/wiki/Wild_Honey_(album)","songs":["darlin","wild-honey"]},{"id":"friends","title":"Friends","released":"1968-06-24","releaseYear":1968,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/1/1f/BeachBoysFriends.jpg","referenceUrl":"https://en.wikipedia.org/wiki/Friends_(The_Beach_Boys_album)","songs":[]},{"id":"20-20","title":"20/20","released":"1969-02-10","releaseYear":1969,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/c/cd/2020Cover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/20/20_(The_Beach_Boys_album)","songs":["i-can-hear-music","do-it-again","our-prayer"]},{"id":"sunflower","title":"Sunflower","released":"1970-08-31","releaseYear":1970,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/0/0a/SunflowerCover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/Sunflower_(The_Beach_Boys_album)","songs":["forever","all-i-wanna-do"]},{"id":"surfs-up","title":"Surf''s Up","released":"1971-08-30","releaseYear":1971,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/c/ce/SurfsUpCover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/Surf%27s_Up_(album)","songs":["feel-flows","surfs-up","til-i-die","long-promised-road"]},{"id":"carl-and-the-passions-so-tough","title":"Carl and the Passions - \"So Tough\"","released":"1972-05-15","releaseYear":1972,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/b/b7/CarlPassionsSoToughCover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/Carl_and_the_Passions_%E2%80%93_%22So_Tough%22","songs":["here-she-comes"]},{"id":"holland","title":"Holland","released":"1973-01-08","releaseYear":1973,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/0/0e/HollandCover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/Holland_(The_Beach_Boys_album)","songs":["sail-on-sailor"]},{"id":"15-big-ones","title":"15 Big Ones","released":"1976-07-05","releaseYear":1976,"albumType":"studio","studio":true,"coverArt":"https://upload.wikimedia.org/wikipedia/en/0/00/15BigOnesCover.jpg","referenceUrl":"https://en.wikipedia.org/wiki/15_Big_Ones","songs":[]},{"id":"love-you","title":"The Beach Boys Love You","released":"1977-04-11","releaseYear":1977,"albumType":"studio","studio":true,"coverArt":null,"referenceUrl":"https://en.wikipedia.org/wiki/The_Beach_Boys_Love_You","songs":[]},{"id":"miu-album","title":"M.I.U. Album","released":"1978-09-25","releaseYear":1978,"albumType":"studio","studio":true,"coverArt":null,"referenceUrl":"https://en.wikipedia.org/wiki/M.I.U._Album","songs":[]},{"id":"la-light-album","title":"L.A. (Light Album)","released":"1979-03-16","releaseYear":1979,"albumType":"studio","studio":true,"coverArt":null,"referenceUrl":"https://en.wikipedia.org/wiki/L.A._(Light_Album)","songs":[]},{"id":"keepin-the-summer-alive","title":"Keepin'' the Summer Alive","released":"1980-03-24","releaseYear":1980,"albumType":"studio","studio":true,"coverArt":null,"referenceUrl":"https://en.wikipedia.org/wiki/Keepin%27_the_Summer_Alive","songs":[]}],"songs":[{"id":"wouldnt-it-be-nice","title":"Wouldn''t It Be Nice","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":"F major","bpm":125,"status":"candidate","records":["pet-sounds"],"tags":["pet-sounds","ballad","sunny-pop"],"popularity":{"rank":1,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"good-vibrations","title":"Good Vibrations","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":null,"bpm":133,"status":"candidate","records":["smiley-smile"],"tags":["psychedelic","single","smile-era"],"popularity":{"rank":2,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"surfin-usa","title":"Surfin'' U.S.A.","originalArtist":"The Beach Boys","yearRecorded":1963,"songKey":"E-flat major","bpm":158,"status":"candidate","records":["surfin-usa"],"tags":["surf","early-years","single"],"popularity":{"rank":3,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"kokomo","title":"Kokomo","originalArtist":"The Beach Boys","yearRecorded":1988,"songKey":null,"bpm":null,"status":"candidate","records":[],"tags":["late-period","single","island"],"popularity":{"rank":4,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"little-saint-nick","title":"Little Saint Nick","originalArtist":"The Beach Boys","yearRecorded":1963,"songKey":null,"bpm":null,"status":"candidate","records":["the-beach-boys-christmas-album"],"tags":["holiday","car-song","early-years"],"popularity":{"rank":5,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"god-only-knows","title":"God Only Knows","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":null,"bpm":null,"status":"candidate","records":["pet-sounds"],"tags":["pet-sounds","ballad","harmony"],"popularity":{"rank":6,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"i-get-around","title":"I Get Around","originalArtist":"The Beach Boys","yearRecorded":1964,"songKey":null,"bpm":144,"status":"candidate","records":["all-summer-long"],"tags":["car-song","early-years","single"],"popularity":{"rank":7,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"dont-worry-baby","title":"Don''t Worry Baby","originalArtist":"The Beach Boys","yearRecorded":1964,"songKey":null,"bpm":null,"status":"candidate","records":["shut-down-volume-2"],"tags":["ballad","car-song","early-years"],"popularity":{"rank":8,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"barbara-ann","title":"Barbara Ann","originalArtist":"The Beach Boys","yearRecorded":1965,"songKey":null,"bpm":78,"status":"candidate","records":["beach-boys-party"],"tags":["party","cover","single"],"popularity":{"rank":9,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"california-girls","title":"California Girls","originalArtist":"The Beach Boys","yearRecorded":1965,"songKey":null,"bpm":116,"status":"candidate","records":["summer-days-and-summer-nights"],"tags":["california","single","sunny-pop"],"popularity":{"rank":10,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"sloop-john-b","title":"Sloop John B","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":null,"bpm":125,"status":"candidate","records":["pet-sounds"],"tags":["pet-sounds","cover","folk"],"popularity":{"rank":11,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"california-dreamin","title":"California Dreamin''","originalArtist":"The Beach Boys","yearRecorded":1986,"songKey":null,"bpm":null,"status":"candidate","records":[],"tags":["late-period","cover","california"],"popularity":{"rank":12,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"fun-fun-fun","title":"Fun, Fun, Fun","originalArtist":"The Beach Boys","yearRecorded":1964,"songKey":null,"bpm":null,"status":"candidate","records":["shut-down-volume-2"],"tags":["car-song","single","early-years"],"popularity":{"rank":13,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"help-me-rhonda","title":"Help Me, Rhonda","originalArtist":"The Beach Boys","yearRecorded":1965,"songKey":null,"bpm":null,"status":"candidate","records":["the-beach-boys-today","summer-days-and-summer-nights"],"tags":["single","sunny-pop","early-years"],"popularity":{"rank":14,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"surfer-girl","title":"Surfer Girl","originalArtist":"The Beach Boys","yearRecorded":1963,"songKey":null,"bpm":105,"status":"candidate","records":["surfer-girl"],"tags":["surf","ballad","early-years"],"popularity":{"rank":15,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"darlin","title":"Darlin''","originalArtist":"The Beach Boys","yearRecorded":1967,"songKey":null,"bpm":null,"status":"candidate","records":["wild-honey"],"tags":["soul-pop","single","late-60s"],"popularity":{"rank":16,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"surfin-safari","title":"Surfin'' Safari","originalArtist":"The Beach Boys","yearRecorded":1962,"songKey":null,"bpm":null,"status":"candidate","records":["surfin-safari"],"tags":["surf","early-years","single"],"popularity":{"rank":17,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"in-my-room","title":"In My Room","originalArtist":"The Beach Boys","yearRecorded":1963,"songKey":null,"bpm":102,"status":"candidate","records":["surfer-girl"],"tags":["ballad","introspective","early-years"],"popularity":{"rank":18,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"little-deuce-coupe","title":"Little Deuce Coupe","originalArtist":"The Beach Boys","yearRecorded":1963,"songKey":null,"bpm":null,"status":"candidate","records":["surfer-girl","little-deuce-coupe"],"tags":["car-song","early-years","single"],"popularity":{"rank":19,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"i-can-hear-music","title":"I Can Hear Music","originalArtist":"The Beach Boys","yearRecorded":1969,"songKey":null,"bpm":128,"status":"candidate","records":["20-20"],"tags":["cover","single","late-60s"],"popularity":{"rank":20,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"heroes-and-villains","title":"Heroes and Villains","originalArtist":"The Beach Boys","yearRecorded":1967,"songKey":null,"bpm":116,"status":"candidate","records":["smiley-smile"],"tags":["smile-era","psychedelic","single"],"popularity":{"rank":21,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"frosty-the-snowman","title":"Frosty the Snowman","originalArtist":"The Beach Boys","yearRecorded":1964,"songKey":null,"bpm":null,"status":"candidate","records":["the-beach-boys-christmas-album"],"tags":["holiday","cover"],"popularity":{"rank":22,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"forever","title":"Forever","originalArtist":"The Beach Boys","yearRecorded":1970,"songKey":null,"bpm":null,"status":"candidate","records":["sunflower"],"tags":["ballad","dennis-wilson","70s"],"popularity":{"rank":23,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"all-i-wanna-do","title":"All I Wanna Do","originalArtist":"The Beach Boys","yearRecorded":1970,"songKey":null,"bpm":null,"status":"candidate","records":["sunflower"],"tags":["70s","dream-pop","deep-cut"],"popularity":{"rank":24,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"dont-talk-put-your-head-on-my-shoulder","title":"Don''t Talk (Put Your Head on My Shoulder)","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":null,"bpm":null,"status":"candidate","records":["pet-sounds"],"tags":["pet-sounds","ballad","harmony"],"popularity":{"rank":25,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"caroline-no","title":"Caroline, No","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":null,"bpm":null,"status":"candidate","records":["pet-sounds"],"tags":["pet-sounds","ballad","single"],"popularity":{"rank":26,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"lets-go-away-for-awhile","title":"Let''s Go Away for Awhile","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":null,"bpm":null,"status":"candidate","records":["pet-sounds"],"tags":["pet-sounds","instrumental"],"popularity":{"rank":27,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"do-it-again","title":"Do It Again","originalArtist":"The Beach Boys","yearRecorded":1968,"songKey":null,"bpm":null,"status":"candidate","records":["20-20"],"tags":["surf","nostalgia","single"],"popularity":{"rank":28,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"sail-on-sailor","title":"Sail On, Sailor","originalArtist":"The Beach Boys","yearRecorded":1973,"songKey":null,"bpm":null,"status":"candidate","records":["holland"],"tags":["70s","single","blondie-chaplin"],"popularity":{"rank":29,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"then-i-kissed-her","title":"Then I Kissed Her","originalArtist":"The Beach Boys","yearRecorded":1965,"songKey":null,"bpm":null,"status":"candidate","records":["summer-days-and-summer-nights"],"tags":["cover","sunny-pop","single"],"popularity":{"rank":30,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"thats-not-me","title":"That''s Not Me","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":null,"bpm":null,"status":"candidate","records":["pet-sounds"],"tags":["pet-sounds","introspective"],"popularity":{"rank":31,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"the-man-with-all-the-toys","title":"The Man with All the Toys","originalArtist":"The Beach Boys","yearRecorded":1964,"songKey":null,"bpm":null,"status":"candidate","records":["the-beach-boys-christmas-album"],"tags":["holiday","single"],"popularity":{"rank":32,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"the-warmth-of-the-sun","title":"The Warmth of the Sun","originalArtist":"The Beach Boys","yearRecorded":1964,"songKey":null,"bpm":null,"status":"candidate","records":["shut-down-volume-2"],"tags":["ballad","harmony","early-years"],"popularity":{"rank":33,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"you-still-believe-in-me","title":"You Still Believe in Me","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":null,"bpm":null,"status":"candidate","records":["pet-sounds"],"tags":["pet-sounds","ballad","harmony"],"popularity":{"rank":34,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"i-just-wasnt-made-for-these-times","title":"I Just Wasn''t Made for These Times","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":null,"bpm":null,"status":"candidate","records":["pet-sounds"],"tags":["pet-sounds","introspective","psychedelic"],"popularity":{"rank":35,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"feel-flows","title":"Feel Flows","originalArtist":"The Beach Boys","yearRecorded":1971,"songKey":null,"bpm":null,"status":"candidate","records":["surfs-up"],"tags":["70s","carl-wilson","psychedelic"],"popularity":{"rank":36,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"all-summer-long","title":"All Summer Long","originalArtist":"The Beach Boys","yearRecorded":1964,"songKey":null,"bpm":null,"status":"candidate","records":["all-summer-long"],"tags":["summer","early-years","sunny-pop"],"popularity":{"rank":37,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"i-know-theres-an-answer","title":"I Know There''s an Answer","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":null,"bpm":null,"status":"candidate","records":["pet-sounds"],"tags":["pet-sounds","psychedelic"],"popularity":{"rank":38,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"409","title":"409","originalArtist":"The Beach Boys","yearRecorded":1962,"songKey":null,"bpm":null,"status":"candidate","records":["surfin-safari","little-deuce-coupe"],"tags":["car-song","early-years"],"popularity":{"rank":39,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"dance-dance-dance","title":"Dance, Dance, Dance","originalArtist":"The Beach Boys","yearRecorded":1964,"songKey":null,"bpm":null,"status":"candidate","records":["the-beach-boys-today"],"tags":["dance","early-years","single"],"popularity":{"rank":40,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"catch-a-wave","title":"Catch a Wave","originalArtist":"The Beach Boys","yearRecorded":1963,"songKey":null,"bpm":null,"status":"candidate","records":["surfer-girl"],"tags":["surf","early-years"],"popularity":{"rank":41,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"im-waiting-for-the-day","title":"I''m Waiting for the Day","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":null,"bpm":null,"status":"candidate","records":["pet-sounds"],"tags":["pet-sounds","ballad"],"popularity":{"rank":42,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"youre-so-good-to-me","title":"You''re So Good to Me","originalArtist":"The Beach Boys","yearRecorded":1965,"songKey":null,"bpm":null,"status":"candidate","records":["summer-days-and-summer-nights"],"tags":["sunny-pop","single"],"popularity":{"rank":43,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"little-honda","title":"Little Honda","originalArtist":"The Beach Boys","yearRecorded":1964,"songKey":null,"bpm":null,"status":"candidate","records":["all-summer-long"],"tags":["car-song","early-years"],"popularity":{"rank":44,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"getcha-back","title":"Getcha Back","originalArtist":"The Beach Boys","yearRecorded":1985,"songKey":null,"bpm":null,"status":"candidate","records":[],"tags":["late-period","single"],"popularity":{"rank":45,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"here-she-comes","title":"Here She Comes","originalArtist":"The Beach Boys","yearRecorded":1972,"songKey":null,"bpm":null,"status":"candidate","records":["carl-and-the-passions-so-tough"],"tags":["70s","blondie-chaplin"],"popularity":{"rank":46,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"merry-christmas-baby","title":"Merry Christmas, Baby","originalArtist":"The Beach Boys","yearRecorded":1964,"songKey":null,"bpm":null,"status":"candidate","records":["the-beach-boys-christmas-album"],"tags":["holiday","cover"],"popularity":{"rank":47,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"pet-sounds","title":"Pet Sounds","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":null,"bpm":null,"status":"candidate","records":["pet-sounds"],"tags":["pet-sounds","instrumental"],"popularity":{"rank":48,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"we-three-kings-of-orient-are","title":"We Three Kings of Orient Are","originalArtist":"The Beach Boys","yearRecorded":1964,"songKey":null,"bpm":null,"status":"candidate","records":["the-beach-boys-christmas-album"],"tags":["holiday","cover"],"popularity":{"rank":49,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"wild-honey","title":"Wild Honey","originalArtist":"The Beach Boys","yearRecorded":1967,"songKey":null,"bpm":null,"status":"candidate","records":["wild-honey"],"tags":["soul-pop","single","late-60s"],"popularity":{"rank":50,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"here-today","title":"Here Today","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":null,"bpm":null,"status":"candidate","records":["pet-sounds"],"tags":["pet-sounds","sunny-pop"],"popularity":{"rank":51,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"surfs-up","title":"Surf''s Up","originalArtist":"The Beach Boys","yearRecorded":1971,"songKey":null,"bpm":null,"status":"candidate","records":["surfs-up"],"tags":["70s","smile-era","art-pop"],"popularity":{"rank":52,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"til-i-die","title":"''Til I Die","originalArtist":"The Beach Boys","yearRecorded":1971,"songKey":null,"bpm":null,"status":"candidate","records":["surfs-up"],"tags":["70s","introspective","deep-cut"],"popularity":{"rank":53,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"santas-beard","title":"Santa''s Beard","originalArtist":"The Beach Boys","yearRecorded":1964,"songKey":null,"bpm":null,"status":"candidate","records":["the-beach-boys-christmas-album"],"tags":["holiday","original"],"popularity":{"rank":54,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"hang-on-to-your-ego","title":"Hang On to Your Ego","originalArtist":"The Beach Boys","yearRecorded":1966,"songKey":null,"bpm":null,"status":"candidate","records":[],"tags":["pet-sounds","outtake","psychedelic"],"popularity":{"rank":55,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"long-promised-road","title":"Long Promised Road","originalArtist":"The Beach Boys","yearRecorded":1971,"songKey":null,"bpm":null,"status":"candidate","records":["surfs-up"],"tags":["70s","carl-wilson","single"],"popularity":{"rank":56,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"santa-claus-is-comin-to-town","title":"Santa Claus Is Comin'' to Town","originalArtist":"The Beach Boys","yearRecorded":1964,"songKey":null,"bpm":null,"status":"candidate","records":["the-beach-boys-christmas-album"],"tags":["holiday","cover"],"popularity":{"rank":57,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"do-you-wanna-dance","title":"Do You Wanna Dance?","originalArtist":"The Beach Boys","yearRecorded":1965,"songKey":null,"bpm":null,"status":"candidate","records":["the-beach-boys-today"],"tags":["cover","single","dance"],"popularity":{"rank":58,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"our-prayer","title":"Our Prayer","originalArtist":"The Beach Boys","yearRecorded":1969,"songKey":null,"bpm":null,"status":"candidate","records":["20-20"],"tags":["smile-era","harmony","a-cappella"],"popularity":{"rank":59,"source":"Kworb Spotify Top Songs for The Beach Boys"}},{"id":"be-true-to-your-school","title":"Be True to Your School","originalArtist":"The Beach Boys","yearRecorded":1963,"songKey":null,"bpm":null,"status":"candidate","records":["little-deuce-coupe"],"tags":["early-years","single"],"popularity":{"rank":60,"source":"Kworb Spotify Top Songs for The Beach Boys"}}]}'::jsonb;
begin
  if target_account_id is null then
    raise exception 'target_account_id is required';
  end if;

  insert into public.albums (
    account_id,
    slug,
    title,
    original_artist,
    released_on,
    album_type,
    studio,
    cover_art_url,
    reference_url,
    notes
  )
  select
    target_account_id,
    album.value ->> 'id',
    album.value ->> 'title',
    seed -> 'meta' ->> 'artist',
    nullif(album.value ->> 'released', '')::date,
    coalesce(album.value ->> 'albumType', 'studio'),
    coalesce((album.value ->> 'studio')::boolean, true),
    nullif(album.value ->> 'coverArt', ''),
    nullif(album.value ->> 'referenceUrl', ''),
    'Seeded from beachboyssongs.json'
  from jsonb_array_elements(seed -> 'albums') as album(value)
  on conflict (account_id, slug) do update set
    title = excluded.title,
    original_artist = excluded.original_artist,
    released_on = excluded.released_on,
    album_type = excluded.album_type,
    studio = excluded.studio,
    cover_art_url = excluded.cover_art_url,
    reference_url = excluded.reference_url,
    notes = excluded.notes;

  insert into public.tags (account_id, display, slug, color)
  select distinct
    target_account_id,
    initcap(replace(tag_slug.value, '-', ' ')),
    tag_slug.value,
    case tag_slug.value
      when 'surf' then 'teal'
      when 'california' then 'teal'
      when 'island' then 'teal'
      when 'pet-sounds' then 'hibiscus'
      when 'smile-era' then 'hibiscus'
      when 'psychedelic' then 'hibiscus'
      when 'car-song' then 'coral'
      when 'single' then 'coral'
      when 'holiday' then 'gold'
      when 'summer' then 'gold'
      when 'sunny-pop' then 'gold'
      when 'ballad' then 'driftwood'
      when 'harmony' then 'avocado'
      else 'avocado'
    end
  from jsonb_array_elements(seed -> 'songs') as song(value)
  cross join jsonb_array_elements_text(song.value -> 'tags') as tag_slug(value)
  on conflict (account_id, slug) do update set
    display = excluded.display,
    color = excluded.color;

  insert into public.songs (
    account_id,
    slug,
    title,
    original_artist,
    year_recorded,
    song_key,
    bpm,
    status,
    notes
  )
  select
    target_account_id,
    song.value ->> 'id',
    song.value ->> 'title',
    coalesce(song.value ->> 'originalArtist', seed -> 'meta' ->> 'artist'),
    nullif(song.value ->> 'yearRecorded', '')::integer,
    nullif(song.value ->> 'songKey', ''),
    nullif(song.value ->> 'bpm', '')::integer,
    coalesce(nullif(song.value ->> 'status', ''), 'candidate')::public.song_status,
    'Beach Boys reference rank #' || (song.value -> 'popularity' ->> 'rank')
  from jsonb_array_elements(seed -> 'songs') as song(value)
  on conflict (account_id, slug) do update set
    title = excluded.title,
    original_artist = excluded.original_artist,
    year_recorded = excluded.year_recorded,
    song_key = excluded.song_key,
    bpm = excluded.bpm,
    status = excluded.status,
    notes = excluded.notes;

  insert into public.song_tags (account_id, song_id, tag_id)
  select distinct
    target_account_id,
    songs.id,
    tags.id
  from jsonb_array_elements(seed -> 'songs') as song(value)
  cross join jsonb_array_elements_text(song.value -> 'tags') as tag_slug(value)
  join public.songs songs
    on songs.account_id = target_account_id
    and songs.slug = song.value ->> 'id'
  join public.tags tags
    on tags.account_id = target_account_id
    and tags.slug = tag_slug.value
  on conflict (account_id, song_id, tag_id) do nothing;

  insert into public.song_albums (account_id, song_id, album_id, order_index)
  select distinct
    target_account_id,
    songs.id,
    albums.id,
    coalesce(album_position.ordinality, 0)::integer
  from jsonb_array_elements(seed -> 'songs') as song(value)
  cross join jsonb_array_elements_text(song.value -> 'records') with ordinality as album_position(slug, ordinality)
  join public.songs songs
    on songs.account_id = target_account_id
    and songs.slug = song.value ->> 'id'
  join public.albums albums
    on albums.account_id = target_account_id
    and albums.slug = album_position.slug
  on conflict (account_id, song_id, album_id) do update set
    order_index = excluded.order_index;
end;
$$ language plpgsql;

grant execute on function kit.seed_beach_boys_reference(uuid) to authenticated, service_role;

select kit.seed_beach_boys_reference(id)
from public.accounts
where is_personal_account = false
  and slug = 'the-swell';

BEGIN;

select no_plan();

select tests.create_supabase_user('swell_owner', 'swell-owner@test.local');
select tests.create_supabase_user('swell_member', 'swell-member@test.local');
select tests.create_supabase_user('swell_outsider', 'swell-outsider@test.local');

set local role postgres;

insert into public.accounts (
  id,
  primary_owner_user_id,
  name,
  slug,
  is_personal_account
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  tests.get_supabase_uid('swell_owner'),
  'The Swell Test',
  'the-swell-test',
  false
);

insert into public.accounts_memberships (
  user_id,
  account_id,
  account_role
)
values
  (
    tests.get_supabase_uid('swell_owner'),
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'owner'
  ),
  (
    tests.get_supabase_uid('swell_member'),
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'performer'
  );

insert into public.members (
  id,
  account_id,
  user_id,
  account_role,
  status,
  display_name,
  email,
  member_type,
  default_instrument,
  default_vocal_slot,
  instrument_capabilities,
  vocal_capabilities
)
values
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    tests.get_supabase_uid('swell_owner'),
    'owner',
    'active',
    'Owner',
    'swell-owner@test.local',
    'performer',
    'bass',
    'vocal_1',
    array['bass', 'rhy_gtr']::public.instrument_slot[],
    array['vocal_1']::public.vocal_slot[]
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    tests.get_supabase_uid('swell_member'),
    'performer',
    'active',
    'Member',
    'swell-member@test.local',
    'performer',
    'lead_gtr',
    'vocal_2',
    array['lead_gtr', 'rhy_gtr']::public.instrument_slot[],
    array['vocal_2']::public.vocal_slot[]
  );

insert into public.member_private_financial (
  account_id,
  member_id,
  address,
  billing,
  tax
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '{"city": "Austin", "state": "TX"}'::jsonb,
    '{"method": "check"}'::jsonb,
    '{"w9OnFile": true}'::jsonb
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '{"city": "Los Angeles", "state": "CA"}'::jsonb,
    '{"method": "ACH", "reference": "last4"}'::jsonb,
    '{"w9OnFile": false}'::jsonb
  );

insert into public.songs (
  id,
  account_id,
  title,
  status
)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Test Song',
  'learning'
);

insert into public.albums (
  id,
  account_id,
  slug,
  title,
  released_on,
  cover_art_url
)
values (
  'adadadad-adad-4ada-8ada-adadadadadad',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'test-record',
  'Test Record',
  '1966-05-16',
  'https://example.com/test-record.jpg'
);

insert into public.tags (
  id,
  account_id,
  display,
  slug
)
values (
  'abababab-abab-4aba-8aba-abababababab',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Pet Sounds',
  'pet-sounds'
);

insert into public.song_tags (
  account_id,
  song_id,
  tag_id
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'abababab-abab-4aba-8aba-abababababab'
);

insert into public.song_albums (
  account_id,
  song_id,
  album_id,
  order_index
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'adadadad-adad-4ada-8ada-adadadadadad',
  1
);

insert into public.parts (
  id,
  account_id,
  song_id,
  type,
  slot,
  label,
  default_member_id,
  order_index
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'instrumental',
  'lead_gtr',
  'Lead guitar',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  10
);

insert into public.part_files (
  id,
  account_id,
  part_id,
  kind,
  label,
  storage_path,
  mime_type,
  size_bytes
)
values (
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'guide_audio',
  'Lead guitar guide',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/parts/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/guide.mp3',
  'audio/mpeg',
  1024
);

insert into public.song_files (
  id,
  account_id,
  song_id,
  kind,
  label,
  storage_path,
  mime_type,
  size_bytes
)
values (
  '12121212-1212-4121-8121-121212121212',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'chart_pdf',
  'Shared chart',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/songs/dddddddd-dddd-4ddd-8ddd-dddddddddddd/shared-chart.pdf',
  'application/pdf',
  2048
);

insert into public.song_part_assets (
  id,
  account_id,
  song_id,
  kind,
  title,
  description,
  storage_path,
  mime_type,
  size_bytes,
  default_area
)
values (
  '34343434-3434-4343-8343-343434343434',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'chart_pdf',
  'Shared chart',
  'Reference chart for the standard arrangement',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/songs/dddddddd-dddd-4ddd-8ddd-dddddddddddd/shared-chart.pdf',
  'application/pdf',
  2048,
  null
);

insert into public.song_part_assignments (
  id,
  account_id,
  song_id,
  asset_id,
  member_id,
  area
)
values (
  '45454545-4545-4454-8454-454545454545',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '34343434-3434-4343-8343-343434343434',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'instrumental'
);

select tests.rls_enabled('public', 'members');
select tests.rls_enabled('public', 'member_private_financial');
select tests.rls_enabled('public', 'songs');
select tests.rls_enabled('public', 'albums');
select tests.rls_enabled('public', 'song_albums');
select tests.rls_enabled('public', 'tags');
select tests.rls_enabled('public', 'song_tags');
select tests.rls_enabled('public', 'parts');
select tests.rls_enabled('public', 'song_files');
select tests.rls_enabled('public', 'song_part_assets');
select tests.rls_enabled('public', 'song_part_assignments');
select tests.rls_enabled('public', 'part_files');

select makerkit.authenticate_as('swell_owner');

select isnt_empty(
  $$ select * from public.members where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Owner can read band members'
);

select lives_ok(
  $$ insert into public.songs (account_id, title, status)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Owner Inserted Song', 'candidate') $$,
  'Owner can insert songs'
);

select isnt_empty(
  $$ select * from public.songs
     where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
       and slug = 'owner-inserted-song' $$,
  'Song slug is generated from title'
);

select lives_ok(
  $$ insert into public.albums (account_id, slug, title, released_on)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'owner-inserted-record', 'Owner Inserted Record', '1967-09-18') $$,
  'Owner can insert albums'
);

select lives_ok(
  $$ insert into public.song_albums (account_id, song_id, album_id)
     select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', songs.id, albums.id
     from public.songs
     cross join public.albums
     where songs.account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
       and songs.slug = 'owner-inserted-song'
       and albums.account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
       and albums.slug = 'owner-inserted-record' $$,
  'Owner can link songs to albums'
);

select lives_ok(
  $$ insert into public.tags (account_id, display, slug)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Surf Songs', 'surf-songs') $$,
  'Owner can insert tags'
);

select lives_ok(
  $$ insert into public.song_files (account_id, song_id, kind, label, storage_path, mime_type, size_bytes)
     values (
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
       'guide_audio',
       'Owner guide',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/songs/dddddddd-dddd-4ddd-8ddd-dddddddddddd/owner-guide.mp3',
       'audio/mpeg',
       1024
     ) $$,
  'Owner can insert song-level files'
);

select lives_ok(
  $$ insert into public.song_part_assets (account_id, song_id, kind, title, storage_path, mime_type, size_bytes, default_area)
     values (
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
       'guide_audio',
       'Owner guide asset',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/songs/dddddddd-dddd-4ddd-8ddd-dddddddddddd/owner-guide-asset.mp3',
       'audio/mpeg',
       1024,
       'vocal'
     ) $$,
  'Owner can insert song part assets'
);

select lives_ok(
  $$ insert into public.song_part_assignments (account_id, song_id, asset_id, member_id, area)
     select
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
       song_part_assets.id,
       'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
       'vocal'::public.song_part_assignment_area
     from public.song_part_assets
     where song_part_assets.storage_path = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/songs/dddddddd-dddd-4ddd-8ddd-dddddddddddd/owner-guide-asset.mp3' $$,
  'Owner can assign song part assets'
);

select lives_ok(
  $$ insert into public.song_tags (account_id, song_id, tag_id)
     values (
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
       'abababab-abab-4aba-8aba-abababababab'
     )
     on conflict do nothing $$,
  'Owner can assign tags to songs'
);

select lives_ok(
  $$ update public.members
     set default_instrument = 'rhy_gtr'
     where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' $$,
  'Owner can update member-managed performance fields'
);

set local role postgres;

insert into public.members (
  id,
  account_id,
  account_role,
  status,
  display_name,
  email,
  member_type,
  instrument_capabilities,
  vocal_capabilities
)
values (
  '99999999-9999-4999-8999-999999999999',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'member',
  'candidate',
  'Assigned Candidate',
  'assigned-candidate@test.local',
  'performer',
  '{}'::public.instrument_slot[],
  '{}'::public.vocal_slot[]
);

update public.parts
set default_member_id = '99999999-9999-4999-8999-999999999999'
where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

select makerkit.authenticate_as('swell_owner');

select lives_ok(
  $$ delete from public.members
     where id = '99999999-9999-4999-8999-999999999999' $$,
  'Owner can delete a member assigned to parts'
);

select row_eq(
  $$ select account_id, default_member_id
     from public.parts
     where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' $$,
  row('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, null::uuid),
  'Deleting a member unassigns parts without clearing the account'
);

set local role postgres;

update public.parts
set default_member_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

select makerkit.authenticate_as('swell_member');

select isnt_empty(
  $$ select * from public.songs where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Member can read songs in their band account'
);

select isnt_empty(
  $$ select * from public.albums where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Member can read albums in their band account'
);

select isnt_empty(
  $$ select * from public.song_albums where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Member can read song album links'
);

select isnt_empty(
  $$ select * from public.tags where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Member can read song tags in their band account'
);

select isnt_empty(
  $$ select * from public.song_tags where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Member can read song tag assignments'
);

select isnt_empty(
  $$ select * from public.parts where default_member_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' $$,
  'Member can read assigned parts'
);

select isnt_empty(
  $$ select * from public.part_files where part_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' $$,
  'Member can read files for assigned parts'
);

select isnt_empty(
  $$ select * from public.song_files where song_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' $$,
  'Member can read song-level files'
);

select isnt_empty(
  $$ select * from public.song_part_assets where song_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' $$,
  'Member can read song part assets'
);

select isnt_empty(
  $$ select * from public.song_part_assignments where member_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' $$,
  'Member can read song part assignments'
);

select throws_ok(
  $$ insert into public.songs (account_id, title, status)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Member Inserted Song', 'candidate') $$,
  'new row violates row-level security policy for table "songs"',
  'Member cannot insert songs'
);

select throws_ok(
  $$ insert into public.albums (account_id, slug, title)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'member-record', 'Member Record') $$,
  'new row violates row-level security policy for table "albums"',
  'Member cannot insert albums'
);

select throws_ok(
  $$ insert into public.tags (account_id, display, slug)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Member Tag', 'member-tag') $$,
  'new row violates row-level security policy for table "tags"',
  'Member cannot insert tags'
);

select throws_ok(
  $$ insert into public.song_files (account_id, song_id, kind, label, storage_path, mime_type)
     values (
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
       'chart_pdf',
       'Member file',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/songs/dddddddd-dddd-4ddd-8ddd-dddddddddddd/member-file.pdf',
       'application/pdf'
     ) $$,
  'new row violates row-level security policy for table "song_files"',
  'Member cannot insert song-level files'
);

select throws_ok(
  $$ insert into public.song_part_assets (account_id, song_id, kind, title, storage_path, mime_type)
     values (
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
       'chart_pdf',
       'Member asset',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/songs/dddddddd-dddd-4ddd-8ddd-dddddddddddd/member-asset.pdf',
       'application/pdf'
     ) $$,
  'new row violates row-level security policy for table "song_part_assets"',
  'Member cannot insert song part assets'
);

select throws_ok(
  $$ insert into public.song_part_assignments (account_id, song_id, asset_id, member_id, area)
     values (
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
       '34343434-3434-4343-8343-343434343434',
       'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
       'vocal'
     ) $$,
  'new row violates row-level security policy for table "song_part_assignments"',
  'Member cannot insert song part assignments'
);

select lives_ok(
  $$ delete from public.song_tags
     where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Member delete attempt against tag assignments does not error'
);

select isnt_empty(
  $$ select * from public.song_tags
     where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
       and song_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
       and tag_id = 'abababab-abab-4aba-8aba-abababababab' $$,
  'Member cannot remove tag assignments'
);

select lives_ok(
  $$ update public.members
     set bio = 'Learning the lead guitar book.'
     where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' $$,
  'Member can update safe self profile fields'
);

select throws_ok(
  $$ update public.members
     set status = 'inactive'
     where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' $$,
  'Only owners can update member-managed fields',
  'Member cannot update owner-managed fields'
);

select is_empty(
  $$ select * from public.member_private_financial
     where member_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' $$,
  'Member cannot read another member private financial row'
);

select isnt_empty(
  $$ select * from public.member_private_financial
     where member_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' $$,
  'Member can read their own private financial row'
);

select makerkit.authenticate_as('swell_outsider');

select is_empty(
  $$ select * from public.songs where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Outsider cannot read songs'
);

select is_empty(
  $$ select * from public.albums where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Outsider cannot read albums'
);

select is_empty(
  $$ select * from public.song_albums where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Outsider cannot read song album links'
);

select is_empty(
  $$ select * from public.tags where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Outsider cannot read tags'
);

select is_empty(
  $$ select * from public.members where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Outsider cannot read members'
);

select is_empty(
  $$ select * from public.song_files where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Outsider cannot read song-level files'
);

select is_empty(
  $$ select * from public.song_part_assets where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Outsider cannot read song part assets'
);

select is_empty(
  $$ select * from public.song_part_assignments where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Outsider cannot read song part assignments'
);

select throws_ok(
  $$ insert into public.songs (account_id, title, status)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Outsider Inserted Song', 'candidate') $$,
  'new row violates row-level security policy for table "songs"',
  'Outsider cannot insert songs'
);

select makerkit.authenticate_as('swell_member');

select throws_ok(
  $$ insert into storage.objects ("bucket_id", "metadata", "name", "owner", "owner_id", "version")
     values (
       'band_assets',
       '{"mimetype": "audio/mpeg"}',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/parts/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/member-upload.mp3',
       tests.get_supabase_uid('swell_member'),
       tests.get_supabase_uid('swell_member'),
       1
     ) $$,
  'new row violates row-level security policy for table "objects"',
  'Member cannot upload band assets'
);

select makerkit.authenticate_as('swell_owner');

select lives_ok(
  $$ insert into storage.objects ("bucket_id", "metadata", "name", "owner", "owner_id", "version")
     values (
       'band_assets',
       '{"mimetype": "audio/mpeg"}',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/parts/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/owner-upload.mp3',
       tests.get_supabase_uid('swell_owner'),
       tests.get_supabase_uid('swell_owner'),
       1
     ) $$,
  'Owner can upload band assets'
);

select makerkit.authenticate_as('swell_member');

select isnt_empty(
  $$ select * from storage.objects
     where bucket_id = 'band_assets'
       and name = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/parts/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee/owner-upload.mp3' $$,
  'Member can read band assets for their account'
);

select
  *
from
  finish();

rollback;

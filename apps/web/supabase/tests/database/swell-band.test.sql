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
    'member'
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
    'member',
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

select tests.rls_enabled('public', 'members');
select tests.rls_enabled('public', 'member_private_financial');
select tests.rls_enabled('public', 'songs');
select tests.rls_enabled('public', 'parts');
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
  $$ select * from public.parts where default_member_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' $$,
  'Member can read assigned parts'
);

select isnt_empty(
  $$ select * from public.part_files where part_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' $$,
  'Member can read files for assigned parts'
);

select throws_ok(
  $$ insert into public.songs (account_id, title, status)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Member Inserted Song', 'candidate') $$,
  'new row violates row-level security policy for table "songs"',
  'Member cannot insert songs'
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
  $$ select * from public.members where account_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'Outsider cannot read members'
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

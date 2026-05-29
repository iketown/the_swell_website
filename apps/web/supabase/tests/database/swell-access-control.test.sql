BEGIN;

select no_plan();

select tests.create_supabase_user('swell_access_owner', 'swell-access-owner@test.local');
select tests.create_supabase_user('swell_access_management', 'swell-access-management@test.local');
select tests.create_supabase_user('swell_access_performer', 'swell-access-performer@test.local');
select tests.create_supabase_user('swell_access_crew', 'swell-access-crew@test.local');
select tests.create_supabase_user('swell_access_press', 'swell-access-press@test.local');
select tests.create_supabase_user('swell_access_guest', 'swell-access-guest@test.local');

set local role service_role;
select public.create_team_account(
  'Access Test',
  tests.get_supabase_uid('swell_access_owner'),
  'access-test'
);

set local role postgres;

insert into public.accounts_memberships (
  user_id,
  account_id,
  account_role
)
values
  (
    tests.get_supabase_uid('swell_access_management'),
    makerkit.get_account_id_by_slug('access-test'),
    'management'
  ),
  (
    tests.get_supabase_uid('swell_access_performer'),
    makerkit.get_account_id_by_slug('access-test'),
    'performer'
  ),
  (
    tests.get_supabase_uid('swell_access_crew'),
    makerkit.get_account_id_by_slug('access-test'),
    'crew'
  ),
  (
    tests.get_supabase_uid('swell_access_press'),
    makerkit.get_account_id_by_slug('access-test'),
    'press'
  ),
  (
    tests.get_supabase_uid('swell_access_guest'),
    makerkit.get_account_id_by_slug('access-test'),
    'guest'
  );

select isnt_empty(
  $$ select 1 from public.roles where name in ('management', 'performer', 'crew', 'press', 'guest') $$,
  'The Swell fixed access roles are seeded'
);

select isnt_empty(
  $$ select 1 from public.role_permissions where role = 'owner' and permission = 'access.manage' $$,
  'Owners can manage Swell access'
);

select makerkit.authenticate_as('swell_access_management');

select row_eq(
  $$ select public.has_permission(
    auth.uid(),
    makerkit.get_account_id_by_slug('access-test'),
    'access.manage'::public.app_permissions
  ) $$,
  row(true::boolean),
  'Management can manage access'
);

select row_eq(
  $$ select public.has_permission(
    auth.uid(),
    makerkit.get_account_id_by_slug('access-test'),
    'songs.manage'::public.app_permissions
  ) $$,
  row(true::boolean),
  'Management can manage songs'
);

select row_eq(
  $$ select public.has_permission(
    auth.uid(),
    makerkit.get_account_id_by_slug('access-test'),
    'tags.manage'::public.app_permissions
  ) $$,
  row(true::boolean),
  'Management can manage tags'
);

select makerkit.authenticate_as('swell_access_performer');

select row_eq(
  $$ select public.has_permission(
    auth.uid(),
    makerkit.get_account_id_by_slug('access-test'),
    'songs.read'::public.app_permissions
  ) $$,
  row(true::boolean),
  'Performers can read songs'
);

select row_eq(
  $$ select public.has_permission(
    auth.uid(),
    makerkit.get_account_id_by_slug('access-test'),
    'parts.read'::public.app_permissions
  ) $$,
  row(true::boolean),
  'Performers can read parts'
);

select row_eq(
  $$ select public.has_permission(
    auth.uid(),
    makerkit.get_account_id_by_slug('access-test'),
    'tags.read'::public.app_permissions
  ) $$,
  row(true::boolean),
  'Performers can read tags'
);

select row_eq(
  $$ select public.has_permission(
    auth.uid(),
    makerkit.get_account_id_by_slug('access-test'),
    'songs.manage'::public.app_permissions
  ) $$,
  row(false::boolean),
  'Performers cannot manage songs by default'
);

select makerkit.authenticate_as('swell_access_crew');

select row_eq(
  $$ select public.has_permission(
    auth.uid(),
    makerkit.get_account_id_by_slug('access-test'),
    'logistics.read'::public.app_permissions
  ) $$,
  row(true::boolean),
  'Crew can read logistics'
);

select row_eq(
  $$ select public.has_permission(
    auth.uid(),
    makerkit.get_account_id_by_slug('access-test'),
    'songs.read'::public.app_permissions
  ) $$,
  row(false::boolean),
  'Crew cannot read songs by default'
);

select makerkit.authenticate_as('swell_access_press');

select row_eq(
  $$ select public.has_permission(
    auth.uid(),
    makerkit.get_account_id_by_slug('access-test'),
    'press.read'::public.app_permissions
  ) $$,
  row(true::boolean),
  'Press can read press materials'
);

select row_eq(
  $$ select public.has_permission(
    auth.uid(),
    makerkit.get_account_id_by_slug('access-test'),
    'parts.read'::public.app_permissions
  ) $$,
  row(false::boolean),
  'Press cannot read parts by default'
);

select makerkit.authenticate_as('swell_access_guest');

select row_eq(
  $$ select public.has_permission(
    auth.uid(),
    makerkit.get_account_id_by_slug('access-test'),
    'songs.read'::public.app_permissions
  ) $$,
  row(false::boolean),
  'Guests start with no song access'
);

select row_eq(
  $$ select public.has_permission(
    auth.uid(),
    makerkit.get_account_id_by_slug('access-test'),
    'tags.read'::public.app_permissions
  ) $$,
  row(false::boolean),
  'Guests start with no tag access'
);

select * from finish();

rollback;

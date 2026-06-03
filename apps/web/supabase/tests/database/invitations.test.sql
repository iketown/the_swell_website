BEGIN;

select no_plan();

-- test

select makerkit.set_identifier('test', 'test@makerkit.dev');
select makerkit.set_identifier('member', 'member@makerkit.dev');
select makerkit.set_identifier('custom', 'custom@makerkit.dev');
select makerkit.set_identifier('owner', 'owner@makerkit.dev');

select makerkit.authenticate_as('test');

select throws_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite1@makerkit.dev', auth.uid(),  makerkit.get_account_id_by_slug('makerkit'), 'member', gen_random_uuid()); $$,
    'new row violates row-level security policy for table "invitations"',
    'direct inserts should be blocked'
);

-- direct inserts are blocked even for duplicates
select throws_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite1@makerkit.dev', auth.uid(), makerkit.get_account_id_by_slug('makerkit'), 'member', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"',
    'direct inserts should be blocked'
);

select makerkit.authenticate_as('member');

-- direct inserts are blocked regardless of role
select throws_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite2@makerkit.dev', auth.uid(), makerkit.get_account_id_by_slug('makerkit'), 'owner', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"'
);

-- direct inserts are blocked regardless of role
select throws_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite2@makerkit.dev', auth.uid(), makerkit.get_account_id_by_slug('makerkit'), 'member', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"',
    'direct inserts should be blocked'
);

-- direct inserts should not create invitations
select is_empty(
    $$ select * from public.invitations where account_id = makerkit.get_account_id_by_slug('makerkit') $$,
    'invitations should not be listed when inserts are blocked'
);

select makerkit.authenticate_as('owner');

-- direct inserts are blocked regardless of role
select throws_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite3@makerkit.dev', auth.uid(), makerkit.get_account_id_by_slug('makerkit'), 'member', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"',
    'direct inserts should be blocked'
);

-- authenticate_as the custom role
select makerkit.authenticate_as('custom');

-- direct inserts are blocked regardless of role
select throws_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite3@makerkit.dev', auth.uid(), makerkit.get_account_id_by_slug('makerkit'), 'custom-role', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"'
);

set local role postgres;

-- adding permissions should not bypass direct insert restrictions
insert into public.role_permissions (role, permission) values ('custom-role', 'invites.manage');

-- authenticate_as the custom role
select makerkit.authenticate_as('custom');

select throws_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite4@makerkit.dev', auth.uid(), makerkit.get_account_id_by_slug('makerkit'), 'custom-role', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"',
    'direct inserts should be blocked'
);

-- NOTE: we assert the privilege rather than invoking the function. Calling
-- the function on a role without EXECUTE triggers a segfault inside a
-- Postgres extension hook (supautils/pgaudit) on the bundled Postgres
-- version, which we cannot patch here. Privilege assertion covers the
-- same intent (authenticated must not be able to execute the function).
select ok(
    not has_function_privilege(
        'authenticated',
        'public.add_invitations_to_account(text, public.invitation[], uuid)',
        'execute'
    ),
    'authenticated users cannot call add_invitations_to_account'
);

-- Foreigners should not be able to create invitations

select tests.create_supabase_user('user');

select makerkit.authenticate_as('user');

-- direct inserts are blocked regardless of membership
select throws_ok(
    $$ insert into public.invitations (email, invited_by, account_id, role, invite_token) values ('invite4@makerkit.dev', auth.uid(), makerkit.get_account_id_by_slug('makerkit'), 'member', gen_random_uuid()) $$,
    'new row violates row-level security policy for table "invitations"'
);

-- see note above: assert privilege instead of invoking the function.
select ok(
    not has_function_privilege(
        'authenticated',
        'public.add_invitations_to_account(text, public.invitation[], uuid)',
        'execute'
    ),
    'foreigner authenticated users cannot call add_invitations_to_account'
);

select is_empty($$
    select * from public.invitations where account_id = makerkit.get_account_id_by_slug('makerkit') $$,
    'no invitations should be listed'
);

select tests.create_supabase_user('invitee_link', 'invitee-link@makerkit.dev');

set local role postgres;

insert into public.members (
    account_id,
    status,
    display_name,
    email,
    member_type,
    instrument_capabilities,
    vocal_capabilities
)
values (
    makerkit.get_account_id_by_slug('makerkit'),
    'candidate',
    'Invitee Link',
    'invitee-link@makerkit.dev',
    'performer',
    '{}'::public.instrument_slot[],
    '{}'::public.vocal_slot[]
);

insert into public.invitations (
    email,
    invited_by,
    account_id,
    role,
    invite_token
)
values (
    'invitee-link@makerkit.dev',
    tests.get_supabase_uid('owner'),
    makerkit.get_account_id_by_slug('makerkit'),
    'performer',
    'invitee-link-token'
);

set local role service_role;

select is(
    public.accept_invitation('invitee-link-token', tests.get_supabase_uid('invitee_link')),
    makerkit.get_account_id_by_slug('makerkit'),
    'accepting an invitation returns the target account id'
);

set local role postgres;

select row_eq(
    $$ select user_id, account_role, status
       from public.members
       where account_id = makerkit.get_account_id_by_slug('makerkit')
         and email = 'invitee-link@makerkit.dev' $$,
    row(tests.get_supabase_uid('invitee_link'), 'performer'::varchar(50), 'active'::public.member_status),
    'accepting an invitation links the matching band member row'
);

select isnt_empty(
    $$ select 1
       from public.accounts_memberships
       where account_id = makerkit.get_account_id_by_slug('makerkit')
         and user_id = tests.get_supabase_uid('invitee_link')
         and account_role = 'performer' $$,
    'accepting an invitation creates the account membership'
);

select * from finish();

rollback;

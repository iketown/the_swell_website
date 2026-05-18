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

select * from finish();

rollback;

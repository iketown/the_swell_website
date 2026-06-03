-- Link accepted account invitations to matching band member rows.

create
or replace function public.accept_invitation (token text, user_id uuid) returns uuid
set
  search_path = '' as $$
declare
    target_account_id uuid;
    target_role varchar(50);
    target_email varchar(255);
begin
    select
        account_id,
        role,
        email into target_account_id,
        target_role,
        target_email
    from
        public.invitations
    where
        invite_token = token
        and expires_at > now();

    if not found then
        raise exception 'Invalid or expired invitation token';
    end if;

    insert into public.accounts_memberships(
        user_id,
        account_id,
        account_role)
    values (
        accept_invitation.user_id,
        target_account_id,
        target_role);

    update public.members as band_member
    set
        user_id = accept_invitation.user_id,
        account_role = target_role,
        status = case
            when band_member.status = 'candidate' then 'active'::public.member_status
            else band_member.status
        end
    where
        band_member.account_id = target_account_id
        and lower(band_member.email) = lower(target_email)
        and (
            band_member.user_id is null
            or band_member.user_id = accept_invitation.user_id
        );

    delete from public.invitations
    where invite_token = token;

    return target_account_id;
end;

$$ language plpgsql;

grant
execute on function public.accept_invitation (text, uuid) to service_role;

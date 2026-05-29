/*
 * -------------------------------------------------------
 * Section: Roles Seed
 * We create the roles and role permissions seed data
 * -------------------------------------------------------
 */

-- Seed the roles table with default roles 'owner' and 'member'
insert into public.roles(
    name,
    hierarchy_level)
values (
           'owner',
           1);

insert into public.roles(
    name,
    hierarchy_level)
values (
           'member',
           2);

insert into public.roles(
    name,
    hierarchy_level)
values
  ('management', 10),
  ('performer', 20),
  ('crew', 30),
  ('press', 40),
  ('guest', 50);

-- We seed the role_permissions table with the default roles and permissions
insert into public.role_permissions(
    role,
    permission)
values (
           'owner',
           'roles.manage'),
       (
           'owner',
           'billing.manage'),
       (
           'owner',
           'settings.manage'),
       (
           'owner',
           'members.manage'),
       (
           'owner',
           'invites.manage'),
       (
           'member',
           'settings.manage'),
       (
           'member',
           'invites.manage'),
       (
           'owner',
           'access.manage'),
       (
           'owner',
           'band.members.read'),
       (
           'owner',
           'band.members.manage'),
       (
           'owner',
           'songs.read'),
       (
           'owner',
           'songs.manage'),
       (
           'owner',
           'tags.read'),
       (
           'owner',
           'tags.manage'),
       (
           'owner',
           'parts.read'),
       (
           'owner',
           'parts.manage'),
       (
           'owner',
           'calendar.read'),
       (
           'owner',
           'calendar.manage'),
       (
           'owner',
           'logistics.read'),
       (
           'owner',
           'logistics.manage'),
       (
           'owner',
           'press.read'),
       (
           'owner',
           'press.manage'),
       (
           'management',
           'roles.manage'),
       (
           'management',
           'settings.manage'),
       (
           'management',
           'members.manage'),
       (
           'management',
           'invites.manage'),
       (
           'management',
           'access.manage'),
       (
           'management',
           'band.members.read'),
       (
           'management',
           'band.members.manage'),
       (
           'management',
           'songs.read'),
       (
           'management',
           'songs.manage'),
       (
           'management',
           'tags.read'),
       (
           'management',
           'tags.manage'),
       (
           'management',
           'parts.read'),
       (
           'management',
           'parts.manage'),
       (
           'management',
           'calendar.read'),
       (
           'management',
           'calendar.manage'),
       (
           'management',
           'logistics.read'),
       (
           'management',
           'logistics.manage'),
       (
           'management',
           'press.read'),
       (
           'management',
           'press.manage'),
       (
           'performer',
           'songs.read'),
       (
           'performer',
           'tags.read'),
       (
           'performer',
           'parts.read'),
       (
           'performer',
           'calendar.read'),
       (
           'crew',
           'calendar.read'),
       (
           'crew',
           'logistics.read'),
       (
           'press',
           'press.read');

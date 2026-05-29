alter type public.app_permissions add value if not exists 'access.manage';
alter type public.app_permissions add value if not exists 'band.members.read';
alter type public.app_permissions add value if not exists 'band.members.manage';
alter type public.app_permissions add value if not exists 'songs.read';
alter type public.app_permissions add value if not exists 'songs.manage';
alter type public.app_permissions add value if not exists 'parts.read';
alter type public.app_permissions add value if not exists 'parts.manage';
alter type public.app_permissions add value if not exists 'calendar.read';
alter type public.app_permissions add value if not exists 'calendar.manage';
alter type public.app_permissions add value if not exists 'logistics.read';
alter type public.app_permissions add value if not exists 'logistics.manage';
alter type public.app_permissions add value if not exists 'press.read';
alter type public.app_permissions add value if not exists 'press.manage';

commit;

insert into public.roles (name, hierarchy_level)
values
  ('management', 10),
  ('performer', 20),
  ('crew', 30),
  ('press', 40),
  ('guest', 50)
on conflict (name) do update
set hierarchy_level = excluded.hierarchy_level;

insert into public.role_permissions (role, permission)
values
  ('owner', 'access.manage'),
  ('owner', 'band.members.read'),
  ('owner', 'band.members.manage'),
  ('owner', 'songs.read'),
  ('owner', 'songs.manage'),
  ('owner', 'parts.read'),
  ('owner', 'parts.manage'),
  ('owner', 'calendar.read'),
  ('owner', 'calendar.manage'),
  ('owner', 'logistics.read'),
  ('owner', 'logistics.manage'),
  ('owner', 'press.read'),
  ('owner', 'press.manage'),
  ('management', 'roles.manage'),
  ('management', 'settings.manage'),
  ('management', 'members.manage'),
  ('management', 'invites.manage'),
  ('management', 'access.manage'),
  ('management', 'band.members.read'),
  ('management', 'band.members.manage'),
  ('management', 'songs.read'),
  ('management', 'songs.manage'),
  ('management', 'parts.read'),
  ('management', 'parts.manage'),
  ('management', 'calendar.read'),
  ('management', 'calendar.manage'),
  ('management', 'logistics.read'),
  ('management', 'logistics.manage'),
  ('management', 'press.read'),
  ('management', 'press.manage'),
  ('performer', 'songs.read'),
  ('performer', 'parts.read'),
  ('performer', 'calendar.read'),
  ('crew', 'calendar.read'),
  ('crew', 'logistics.read'),
  ('press', 'press.read')
on conflict (role, permission) do nothing;

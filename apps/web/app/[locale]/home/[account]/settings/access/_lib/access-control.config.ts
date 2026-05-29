import type { Database } from '~/lib/database.types';

export type AppPermission = Database['public']['Enums']['app_permissions'];

export const swellAccessRoles = [
  {
    key: 'management',
    label: 'Management',
    description: 'Owners, managers, and people trusted to run the band OS.',
  },
  {
    key: 'performer',
    label: 'Performer',
    description: 'Band members learning songs, parts, and the calendar.',
  },
  {
    key: 'crew',
    label: 'Crew',
    description: 'Production, stage, transport, and logistics support.',
  },
  {
    key: 'press',
    label: 'Press',
    description: 'People who need press kit and public-facing materials.',
  },
  {
    key: 'guest',
    label: 'Guest',
    description: 'Temporary low-access collaborators.',
  },
] as const;

export type SwellAccessRole = (typeof swellAccessRoles)[number]['key'];

export const swellPermissionGroups = [
  {
    label: 'Access',
    permissions: [
      {
        key: 'access.manage',
        label: 'Manage access',
        description: 'Can change this role-permission matrix.',
      },
    ],
  },
  {
    label: 'Members',
    permissions: [
      {
        key: 'band.members.read',
        label: 'View members',
        description: 'Can view the band directory and member context.',
      },
      {
        key: 'band.members.manage',
        label: 'Manage members',
        description: 'Can edit roster/member records inside the band module.',
      },
    ],
  },
  {
    label: 'Songs',
    permissions: [
      {
        key: 'songs.read',
        label: 'View songs',
        description: 'Can view the song list and song details.',
      },
      {
        key: 'songs.manage',
        label: 'Manage songs',
        description: 'Can create and edit songs.',
      },
      {
        key: 'tags.read',
        label: 'View tags',
        description: 'Can view and filter repertoire tags.',
      },
      {
        key: 'tags.manage',
        label: 'Manage tags',
        description: 'Can create, delete, and assign repertoire tags.',
      },
    ],
  },
  {
    label: 'Parts',
    permissions: [
      {
        key: 'parts.read',
        label: 'View parts',
        description: 'Can view assigned parts and rehearsal files.',
      },
      {
        key: 'parts.manage',
        label: 'Manage parts',
        description: 'Can create and edit song parts and files.',
      },
    ],
  },
  {
    label: 'Calendar',
    permissions: [
      {
        key: 'calendar.read',
        label: 'View calendar',
        description: 'Can view rehearsals, holds, shows, and calls.',
      },
      {
        key: 'calendar.manage',
        label: 'Manage calendar',
        description: 'Can create and edit calendar entries.',
      },
    ],
  },
  {
    label: 'Logistics',
    permissions: [
      {
        key: 'logistics.read',
        label: 'View logistics',
        description: 'Can view crew, travel, venue, and production notes.',
      },
      {
        key: 'logistics.manage',
        label: 'Manage logistics',
        description: 'Can create and edit logistics records.',
      },
    ],
  },
  {
    label: 'Press',
    permissions: [
      {
        key: 'press.read',
        label: 'View press kit',
        description: 'Can view approved press materials.',
      },
      {
        key: 'press.manage',
        label: 'Manage press kit',
        description: 'Can create and edit press materials.',
      },
    ],
  },
] as const satisfies ReadonlyArray<{
  label: string;
  permissions: ReadonlyArray<{
    key: AppPermission;
    label: string;
    description: string;
  }>;
}>;

export const swellAccessRoleKeys = swellAccessRoles.map((role) => role.key);

export const swellAccessPermissionKeys = swellPermissionGroups.flatMap(
  (group) => group.permissions.map((permission) => permission.key),
);

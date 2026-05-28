import 'server-only';

import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';
import { Database } from '~/lib/database.types';

type MemberRow = Database['public']['Tables']['members']['Row'];
type SongRow = Database['public']['Tables']['songs']['Row'];
type PartRow = Database['public']['Tables']['parts']['Row'];
type PartFileRow = Database['public']['Tables']['part_files']['Row'];

export type BandAdminData = Awaited<ReturnType<typeof loadBandAdminData>>;

export const loadBandAdminData = cache(async (accountSlug: string) => {
  const client = getSupabaseServerClient();
  const workspace = await loadTeamWorkspace(accountSlug);
  const accountId = workspace.account.id;

  const [membersResult, songsResult, partsResult, filesResult] =
    await Promise.all([
      client
        .from('members')
        .select('*')
        .eq('account_id', accountId)
        .order('status', { ascending: true })
        .order('display_name', { ascending: true }),
      client
        .from('songs')
        .select('*')
        .eq('account_id', accountId)
        .order('status', { ascending: true })
        .order('title', { ascending: true }),
      client
        .from('parts')
        .select('*')
        .eq('account_id', accountId)
        .order('order_index', { ascending: true }),
      client
        .from('part_files')
        .select('*')
        .eq('account_id', accountId)
        .order('order_index', { ascending: true }),
    ]);

  if (membersResult.error) {
    throw membersResult.error;
  }

  if (songsResult.error) {
    throw songsResult.error;
  }

  if (partsResult.error) {
    throw partsResult.error;
  }

  if (filesResult.error) {
    throw filesResult.error;
  }

  const members = membersResult.data satisfies MemberRow[];
  const songs = songsResult.data satisfies SongRow[];
  const parts = partsResult.data satisfies PartRow[];
  const files = filesResult.data satisfies PartFileRow[];

  const memberById = new Map(members.map((member) => [member.id, member]));
  const songById = new Map(songs.map((song) => [song.id, song]));
  const filesByPartId = new Map<string, PartFileRow[]>();

  for (const file of files) {
    const existing = filesByPartId.get(file.part_id) ?? [];
    filesByPartId.set(file.part_id, [...existing, file]);
  }

  return {
    workspace,
    canManageBand: workspace.account.permissions.includes('members.manage'),
    members,
    songs,
    parts,
    files,
    memberById,
    songById,
    filesByPartId,
  };
});

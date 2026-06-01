import 'server-only';
import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';
import { Database } from '~/lib/database.types';

type MemberRow = Database['public']['Tables']['members']['Row'];
type SongRow = Database['public']['Tables']['songs']['Row'];
type AlbumRow = Database['public']['Tables']['albums']['Row'];
type SongAlbumRow = Database['public']['Tables']['song_albums']['Row'];
type TagRow = Database['public']['Tables']['tags']['Row'];
type SongTagRow = Database['public']['Tables']['song_tags']['Row'];
type PartRow = Database['public']['Tables']['parts']['Row'];
type SongFileRow = Database['public']['Tables']['song_files']['Row'];
type SongPartAssetRow =
  Database['public']['Tables']['song_part_assets']['Row'];
type SongPartAssignmentRow =
  Database['public']['Tables']['song_part_assignments']['Row'];
type PartFileRow = Database['public']['Tables']['part_files']['Row'];

export type BandAdminData = Awaited<ReturnType<typeof loadBandAdminData>>;

export const loadBandAdminData = cache(async (accountSlug: string) => {
  const client = getSupabaseServerClient();
  const workspace = await loadTeamWorkspace(accountSlug);
  const accountId = workspace.account.id;

  const [
    membersResult,
    songsResult,
    albumsResult,
    songAlbumsResult,
    tagsResult,
    songTagsResult,
    partsResult,
    songFilesResult,
    songPartAssetsResult,
    songPartAssignmentsResult,
    filesResult,
  ] = await Promise.all([
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
      .from('albums')
      .select('*')
      .eq('account_id', accountId)
      .order('released_on', { ascending: true })
      .order('title', { ascending: true }),
    client
      .from('song_albums')
      .select('*')
      .eq('account_id', accountId)
      .order('order_index', { ascending: true }),
    client
      .from('tags')
      .select('*')
      .eq('account_id', accountId)
      .order('display', { ascending: true }),
    client.from('song_tags').select('*').eq('account_id', accountId),
    client
      .from('parts')
      .select('*')
      .eq('account_id', accountId)
      .order('order_index', { ascending: true }),
    client
      .from('song_files')
      .select('*')
      .eq('account_id', accountId)
      .order('order_index', { ascending: true }),
    client
      .from('song_part_assets')
      .select('*')
      .eq('account_id', accountId)
      .order('order_index', { ascending: true }),
    client
      .from('song_part_assignments')
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

  if (albumsResult.error) {
    throw albumsResult.error;
  }

  if (songAlbumsResult.error) {
    throw songAlbumsResult.error;
  }

  if (tagsResult.error) {
    throw tagsResult.error;
  }

  if (songTagsResult.error) {
    throw songTagsResult.error;
  }

  if (partsResult.error) {
    throw partsResult.error;
  }

  if (songFilesResult.error) {
    throw songFilesResult.error;
  }

  if (songPartAssetsResult.error) {
    throw songPartAssetsResult.error;
  }

  if (songPartAssignmentsResult.error) {
    throw songPartAssignmentsResult.error;
  }

  if (filesResult.error) {
    throw filesResult.error;
  }

  const members = membersResult.data satisfies MemberRow[];
  const songs = songsResult.data satisfies SongRow[];
  const albums = albumsResult.data satisfies AlbumRow[];
  const songAlbums = songAlbumsResult.data satisfies SongAlbumRow[];
  const tags = tagsResult.data satisfies TagRow[];
  const songTags = songTagsResult.data satisfies SongTagRow[];
  const parts = partsResult.data satisfies PartRow[];
  const songFiles = songFilesResult.data satisfies SongFileRow[];
  const songPartAssets =
    songPartAssetsResult.data satisfies SongPartAssetRow[];
  const songPartAssignments =
    songPartAssignmentsResult.data satisfies SongPartAssignmentRow[];
  const files = filesResult.data satisfies PartFileRow[];

  const memberById = new Map(members.map((member) => [member.id, member]));
  const songById = new Map(songs.map((song) => [song.id, song]));
  const songBySlug = new Map(songs.map((song) => [song.slug, song]));
  const albumById = new Map(albums.map((album) => [album.id, album]));
  const albumBySlug = new Map(albums.map((album) => [album.slug, album]));
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const albumsBySongId = new Map<string, AlbumRow[]>();
  const songsByAlbumId = new Map<string, SongRow[]>();
  const tagsBySongId = new Map<string, TagRow[]>();
  const songFilesBySongId = new Map<string, SongFileRow[]>();
  const songPartAssetsBySongId = new Map<string, SongPartAssetRow[]>();
  const songPartAssignmentsBySongId = new Map<
    string,
    SongPartAssignmentRow[]
  >();
  const filesByPartId = new Map<string, PartFileRow[]>();

  for (const songAlbum of songAlbums) {
    const song = songById.get(songAlbum.song_id);
    const album = albumById.get(songAlbum.album_id);

    if (!song || !album) {
      continue;
    }

    const existingAlbums = albumsBySongId.get(song.id) ?? [];
    albumsBySongId.set(song.id, [...existingAlbums, album]);

    const existingSongs = songsByAlbumId.get(album.id) ?? [];
    songsByAlbumId.set(album.id, [...existingSongs, song]);
  }

  for (const songTag of songTags) {
    const tag = tagById.get(songTag.tag_id);

    if (!tag) {
      continue;
    }

    const existing = tagsBySongId.get(songTag.song_id) ?? [];
    tagsBySongId.set(songTag.song_id, [...existing, tag]);
  }

  for (const file of files) {
    const existing = filesByPartId.get(file.part_id) ?? [];
    filesByPartId.set(file.part_id, [...existing, file]);
  }

  for (const file of songFiles) {
    const existing = songFilesBySongId.get(file.song_id) ?? [];
    songFilesBySongId.set(file.song_id, [...existing, file]);
  }

  for (const asset of songPartAssets) {
    const existing = songPartAssetsBySongId.get(asset.song_id) ?? [];
    songPartAssetsBySongId.set(asset.song_id, [...existing, asset]);
  }

  for (const assignment of songPartAssignments) {
    const existing = songPartAssignmentsBySongId.get(assignment.song_id) ?? [];
    songPartAssignmentsBySongId.set(assignment.song_id, [
      ...existing,
      assignment,
    ]);
  }

  return {
    workspace,
    canManageBand: workspace.account.permissions.includes('members.manage'),
    canManageTags: workspace.account.permissions.includes('tags.manage'),
    members,
    songs,
    albums,
    songAlbums,
    tags,
    songTags,
    parts,
    songFiles,
    songPartAssets,
    songPartAssignments,
    files,
    memberById,
    songById,
    songBySlug,
    albumById,
    albumBySlug,
    tagById,
    albumsBySongId,
    songsByAlbumId,
    tagsBySongId,
    songFilesBySongId,
    songPartAssetsBySongId,
    songPartAssignmentsBySongId,
    filesByPartId,
  };
});

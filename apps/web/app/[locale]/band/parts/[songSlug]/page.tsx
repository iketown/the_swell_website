import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';

import { TeamAccountLayoutPageHeader } from '~/home/[account]/_components/team-account-layout-page-header';
import { loadBandAdminData } from '~/home/[account]/band/_lib/server/band-admin.loader';

import { loadSwellWorkspace } from '../../_lib/server/swell-workspace.loader';
import type { PartNoteContent } from '../_components/part-note-rich-text';
import { SongFileUploadForm } from './parts/_components/song-file-upload-form';
import { SongPartAssignmentGrid } from './parts/_components/song-part-assignment-grid';

interface SongPartsPageProps {
  params: Promise<{ songSlug: string }>;
}

export async function generateMetadata({ params }: SongPartsPageProps) {
  const { songSlug } = await params;

  return {
    title: `${songSlug} parts`,
  };
}

export default async function SongPartsPage({ params }: SongPartsPageProps) {
  const { songSlug } = await params;
  const workspace = await loadSwellWorkspace();
  const data = await loadBandAdminData(workspace.account.slug);
  const song = data.songBySlug.get(songSlug);

  if (!song) {
    notFound();
  }

  const canManageBand = data.canManageBand;
  const currentMember = data.members.find(
    (member) => member.user_id === workspace.user.id,
  );
  const members = data.members
    .filter(
      (member) =>
        member.status === 'active' && member.member_type === 'performer',
    )
    .filter((member) => canManageBand || member.id === currentMember?.id);
  const allAssets = data.songPartAssetsBySongId.get(song.id) ?? [];
  const allAssignments = (
    data.songPartAssignmentsBySongId.get(song.id) ?? []
  ).filter(isIndividualSongPartAssignment);
  const assignments = allAssignments.filter(
    (assignment) => canManageBand || assignment.member_id === currentMember?.id,
  );
  const visibleAssetIds = new Set(assignments.map((assignment) => assignment.asset_id));
  const assets = allAssets.filter(
    (asset) =>
      canManageBand ||
      asset.default_area === 'shared' ||
      visibleAssetIds.has(asset.id),
  );
  const signedAssetUrlById = await getSignedAssetUrlById(assets);
  const signedAssets = assets.map((asset) => ({
    ...asset,
    content: asset.content as PartNoteContent | null,
    signedUrl: signedAssetUrlById.get(asset.id) ?? null,
  }));

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={workspace.account.slug}
        title={`${song.title} parts`}
        description={<AppBreadcrumbs />}
      />

      <div className="flex w-full max-w-6xl flex-col gap-6 pb-32">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            nativeButton={false}
            render={<Link href="/band/parts" />}
            variant="ghost"
          >
            <ArrowLeft data-icon="inline-start" />
            Parts
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Arrangement</CardTitle>
            <CardDescription>
              Assign MP3s and PDFs for {song.title} by member.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SongPartAssignmentGrid
              accountSlug={workspace.account.slug}
              assignments={assignments}
              assets={signedAssets}
              canManageBand={canManageBand}
              members={members}
              songId={song.id}
              songTitle={song.title}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Files for {song.title}</CardTitle>
            <CardDescription>
              Upload shared MP3s and PDFs for this song.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-w-xl">
            <SongFileUploadForm
              accountSlug={workspace.account.slug}
              songId={song.id}
            />
          </CardContent>
        </Card>
      </div>
    </PageBody>
  );
}

async function getSignedAssetUrlById<
  Asset extends { id: string; storage_path: string | null },
>(assets: Asset[]) {
  const client = getSupabaseServerClient();
  const entries = await Promise.all(
    assets.filter(hasStoragePath).map(async (asset) => {
      const { data } = await client.storage
        .from('band_assets')
        .createSignedUrl(asset.storage_path, 60 * 60);

      return [asset.id, data?.signedUrl ?? null] as const;
    }),
  );

  return new Map(entries);
}

function hasStoragePath<Asset extends { storage_path: string | null }>(
  asset: Asset,
): asset is Asset & { storage_path: string } {
  return Boolean(asset.storage_path);
}

function isIndividualSongPartAssignment<
  Assignment extends { area: string },
>(
  assignment: Assignment,
): assignment is Assignment & { area: 'instrumental' | 'vocal' } {
  return assignment.area === 'instrumental' || assignment.area === 'vocal';
}

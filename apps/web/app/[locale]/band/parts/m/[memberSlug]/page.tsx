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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { TeamAccountLayoutPageHeader } from '~/home/[account]/_components/team-account-layout-page-header';
import { loadBandAdminData } from '~/home/[account]/band/_lib/server/band-admin.loader';

import { loadSwellWorkspace } from '../../../_lib/server/swell-workspace.loader';
import type { PartNoteContent } from '../../_components/part-note-rich-text';
import { MemberPartFileBadges } from './_components/member-part-file-badges';

interface MemberPartsPageProps {
  params: Promise<{ memberSlug: string }>;
}

export async function generateMetadata({ params }: MemberPartsPageProps) {
  const { memberSlug } = await params;

  return {
    title: `${memberSlug} parts`,
  };
}

export default async function MemberPartsPage({
  params,
}: MemberPartsPageProps) {
  const { memberSlug: requestedMemberSlug } = await params;
  const workspace = await loadSwellWorkspace();
  const data = await loadBandAdminData(workspace.account.slug);
  const member = data.members.find(
    (candidate) => memberSlug(candidate.display_name) === requestedMemberSlug,
  );

  if (!member) {
    notFound();
  }

  if (!data.canManageBand && member.user_id !== workspace.user.id) {
    notFound();
  }

  const assetById = new Map(
    data.songPartAssets.map((asset) => [asset.id, asset]),
  );
  const memberAssignments = data.songPartAssignments.filter(
    (assignment) =>
      assignment.member_id === member.id &&
      isIndividualSongPartAssignment(assignment),
  );
  const sharedAssignments = data.songPartAssets
    .filter((asset) => asset.default_area === 'shared')
    .map((asset) => ({
      area: 'shared' as const,
      asset_id: asset.id,
      song_id: asset.song_id,
    }));
  const assignments = [...sharedAssignments, ...memberAssignments];
  const rows = [...groupAssignmentsBySong(assignments, assetById, data.songById)]
    .sort((a, b) => a.song.title.localeCompare(b.song.title));
  const signedAssetUrlById = await getSignedAssetUrlById(
    rows.flatMap((row) =>
      row.assignments.map((assignment) => assignment.asset),
    ),
  );

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={workspace.account.slug}
        title={`${member.display_name} parts`}
        description={<AppBreadcrumbs />}
      />

      <div className="flex w-full max-w-6xl flex-col gap-6 pb-32">
        <div>
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
            <CardTitle>{member.display_name}</CardTitle>
            <CardDescription>
              All assigned song files grouped by song.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-72">Song</TableHead>
                  <TableHead>Parts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length > 0 ? (
                  rows.map(({ assignments: songAssignments, song }) => (
                    <TableRow key={song.id}>
                      <TableCell className="align-top">
                        <Link
                          className="font-medium hover:underline"
                          href={`/band/parts/${song.slug}`}
                        >
                          {song.title}
                        </Link>
                        <div className="text-muted-foreground text-xs">
                          {song.original_artist ?? 'The Beach Boys'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <MemberPartFileBadges
                          files={songAssignments.map(({ area, asset }) => ({
                            area,
                            content: asset.content as PartNoteContent | null,
                            description: asset.description,
                            id: asset.id,
                            kind: asset.kind,
                            signedUrl: signedAssetUrlById.get(asset.id) ?? null,
                            title: asset.title,
                          }))}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      className="text-muted-foreground text-sm"
                      colSpan={2}
                    >
                      No song files are assigned to {member.display_name} yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageBody>
  );
}

function groupAssignmentsBySong<
  Assignment extends {
    area: 'shared' | 'vocal' | 'instrumental';
    asset_id: string;
    song_id: string;
  },
  Asset extends {
    content: unknown;
    description: string | null;
    id: string;
    kind: 'chart_pdf' | 'guide_audio' | 'rich_text_note';
    storage_path: string | null;
    title: string;
  },
  Song extends {
    id: string;
    original_artist: string | null;
    slug: string;
    title: string;
  },
>(
  assignments: Assignment[],
  assetById: Map<string, Asset>,
  songById: Map<string, Song>,
) {
  const rows = new Map<
    string,
    {
      assignments: Array<{ area: Assignment['area']; asset: Asset }>;
      song: Song;
    }
  >();

  for (const assignment of assignments) {
    const asset = assetById.get(assignment.asset_id);
    const song = songById.get(assignment.song_id);

    if (!asset || !song) {
      continue;
    }

    const existing = rows.get(song.id) ?? {
      assignments: [],
      song,
    };

    rows.set(song.id, {
      ...existing,
      assignments: [
        ...existing.assignments,
        {
          area: assignment.area,
          asset,
        },
      ],
    });
  }

  return rows.values();
}

function memberSlug(displayName: string) {
  return displayName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isIndividualSongPartAssignment<
  Assignment extends { area: string },
>(
  assignment: Assignment,
): assignment is Assignment & { area: 'instrumental' | 'vocal' } {
  return assignment.area === 'instrumental' || assignment.area === 'vocal';
}

async function getSignedAssetUrlById<
  Asset extends { id: string; storage_path: string | null },
>(assets: Asset[]) {
  const client = getSupabaseServerClient();
  const uniqueAssets = [
    ...new Map(assets.filter(hasStoragePath).map((asset) => [asset.id, asset]))
      .values(),
  ];
  const entries = await Promise.all(
    uniqueAssets.map(async (asset) => {
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

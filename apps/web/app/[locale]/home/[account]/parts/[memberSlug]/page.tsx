import { notFound } from 'next/navigation';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
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

import { MemberPartFileBadges } from '~/band/parts/m/[memberSlug]/_components/member-part-file-badges';
import type { PartNoteContent } from '~/band/parts/_components/part-note-rich-text';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { loadBandAdminData } from '../../band/_lib/server/band-admin.loader';
import { MemberTabs } from '../_components/member-tabs';

interface MemberPartsPageProps {
  params: Promise<{ account: string; memberSlug: string }>;
}

type Asset = {
  content: unknown;
  description: string | null;
  id: string;
  kind: 'chart_pdf' | 'guide_audio' | 'rich_text_note';
  storage_path: string | null;
  title: string;
};

export async function generateMetadata({ params }: MemberPartsPageProps) {
  const { memberSlug } = await params;

  return {
    title: `${memberSlug} parts`,
  };
}

export default async function MemberPartsPage({
  params,
}: MemberPartsPageProps) {
  const { account, memberSlug: requestedMemberSlug } = await params;
  const data = await loadBandAdminData(account);
  const performerMembers = data.members.filter(
    (member) => member.status === 'active' && member.member_type === 'performer',
  );
  const selectedMember = performerMembers.find(
    (member) => memberSlug(member.display_name) === requestedMemberSlug,
  );
  const currentMember = performerMembers.find(
    (member) => member.user_id === data.workspace.user.id,
  );

  if (!selectedMember) {
    notFound();
  }

  const assetById = new Map(data.songPartAssets.map((asset) => [asset.id, asset]));
  const memberAssignments = data.songPartAssignments.filter(
    (assignment) =>
      assignment.member_id === selectedMember.id &&
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
    rows.flatMap((row) => row.assignments.map((assignment) => assignment.asset)),
  );
  const title = `${possessiveName(selectedMember.display_name)} parts`;

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={account}
        title={title}
        description={<AppBreadcrumbs />}
      />

      <div className="flex w-full max-w-6xl flex-col gap-6 pb-32">
        <Card>
          <CardHeader className="gap-4">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>
                {currentMember?.id === selectedMember.id
                  ? 'Your assigned song files, grouped by song.'
                  : `Assigned song files for ${selectedMember.display_name}.`}
              </CardDescription>
            </div>

            <MemberTabs
              members={performerMembers.map((member) => ({
                displayName: member.display_name,
                href: `/home/${account}/parts/${memberSlug(member.display_name)}`,
                isActive: member.id === selectedMember.id,
              }))}
            />
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
                        <span className="font-medium">{song.title}</span>
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
                      No song files are assigned to {selectedMember.display_name}{' '}
                      yet.
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

async function getSignedAssetUrlById(assets: Asset[]) {
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

function hasStoragePath(asset: Asset): asset is Asset & { storage_path: string } {
  return Boolean(asset.storage_path);
}

function isIndividualSongPartAssignment<Assignment extends { area: string }>(
  assignment: Assignment,
): assignment is Assignment & { area: 'instrumental' | 'vocal' } {
  return assignment.area === 'instrumental' || assignment.area === 'vocal';
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

function possessiveName(displayName: string) {
  const name = displayName.trim();

  return name.endsWith('s') ? `${name}'` : `${name}'s`;
}

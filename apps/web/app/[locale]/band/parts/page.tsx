import Link from 'next/link';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Badge } from '@kit/ui/badge';
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

import { loadSwellWorkspace } from '../_lib/server/swell-workspace.loader';

import { PartsSongSearch } from './_components/parts-song-search';

export const generateMetadata = () => {
  return {
    title: 'Parts',
  };
};

export default async function BandPartsPage() {
  const workspace = await loadSwellWorkspace();
  const data = await loadBandAdminData(workspace.account.slug);
  const songsWithParts = data.songs
    .map((song) => {
      const memberIds = new Set(
        (data.songPartAssignmentsBySongId.get(song.id) ?? []).map(
          (assignment) => assignment.member_id,
        ),
      );
      const members = [...memberIds]
        .map((memberId) => data.memberById.get(memberId))
        .filter((member): member is NonNullable<typeof member> =>
          Boolean(member),
        )
        .sort((a, b) => a.display_name.localeCompare(b.display_name));

      return {
        members,
        song,
      };
    })
    .filter(({ members }) => members.length > 0);

  const searchSongs = data.songs.map((song) => ({
    artist: song.original_artist,
    partCount: data.songPartAssetsBySongId.get(song.id)?.length ?? 0,
    slug: song.slug,
    title: song.title,
  }));

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={workspace.account.slug}
        title="Parts"
        description={<AppBreadcrumbs />}
      />

      <div className="flex w-full max-w-6xl flex-col gap-6 pb-32">
        <Card>
          <CardHeader>
            <CardTitle>Find a song</CardTitle>
            <CardDescription>
              Jump directly to the parts board for any song in the catalog.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PartsSongSearch songs={searchSongs} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Songs with parts</CardTitle>
            <CardDescription>
              Current arrangements grouped by assigned member.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Song</TableHead>
                  <TableHead>Parts</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {songsWithParts.length > 0 ? (
                  songsWithParts.map(({ members, song }) => (
                    <TableRow key={song.id}>
                      <TableCell className="w-72 align-top">
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
                        <div className="flex flex-wrap gap-2">
                          {members.map((member) => (
                            <Link
                              key={member.id}
                              href={`/band/parts/m/${memberSlug(member.display_name)}`}
                            >
                              <Badge
                                className="hover:bg-secondary/80"
                                variant="secondary"
                              >
                                {member.display_name}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      className="text-muted-foreground text-sm"
                      colSpan={2}
                    >
                      No songs have parts yet. Search for a song above to start
                      building its arrangement.
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

function memberSlug(displayName: string) {
  return displayName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

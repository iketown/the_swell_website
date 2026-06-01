import Link from 'next/link';

import { FileAudio, FileText } from 'lucide-react';

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
    .map((song) => ({
      song,
      parts: data.parts.filter((part) => part.song_id === song.id),
    }))
    .filter(({ parts }) => parts.length > 0);

  const searchSongs = data.songs.map((song) => ({
    artist: song.original_artist,
    partCount: data.parts.filter((part) => part.song_id === song.id).length,
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
              Current arrangements with one link per assigned vocal or
              instrument part.
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
                  songsWithParts.map(({ parts, song }) => (
                    <TableRow key={song.id}>
                      <TableCell className="w-72 align-top">
                        <Link
                          className="font-medium hover:underline"
                          href={`/band/parts/${song.slug}/parts`}
                        >
                          {song.title}
                        </Link>
                        <div className="text-muted-foreground text-xs">
                          {song.original_artist ?? 'The Beach Boys'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {parts.map((part) => {
                            const files = data.filesByPartId.get(part.id) ?? [];

                            return (
                              <Link
                                key={part.id}
                                href={`/band/parts/${song.slug}/parts/${part.slot}`}
                              >
                                <Badge
                                  className="hover:bg-secondary/80 gap-1.5"
                                  variant="secondary"
                                >
                                  {compactPartLabel(part.slot)}
                                  {files.some(
                                    (file) => file.kind === 'guide_audio',
                                  ) ? (
                                    <FileAudio className="size-3" />
                                  ) : null}
                                  {files.some(
                                    (file) => file.kind === 'chart_pdf',
                                  ) ? (
                                    <FileText className="size-3" />
                                  ) : null}
                                </Badge>
                              </Link>
                            );
                          })}
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

function compactPartLabel(slot: string) {
  if (slot.startsWith('vocal_')) {
    return slot.replace('vocal_', 'voc_');
  }

  return slot;
}

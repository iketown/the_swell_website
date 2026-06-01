import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowLeft, ExternalLink } from 'lucide-react';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Badge } from '@kit/ui/badge';
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

import { loadSwellWorkspace } from '../../_lib/server/swell-workspace.loader';

interface AlbumDetailPageProps {
  params: Promise<{ albumSlug: string }>;
}

export async function generateMetadata({ params }: AlbumDetailPageProps) {
  const { albumSlug } = await params;

  return {
    title: albumSlug,
  };
}

export default async function AlbumDetailPage({
  params,
}: AlbumDetailPageProps) {
  const { albumSlug } = await params;
  const workspace = await loadSwellWorkspace();
  const data = await loadBandAdminData(workspace.account.slug);
  const album = data.albumBySlug.get(albumSlug);

  if (!album) {
    notFound();
  }

  const songs = data.songsByAlbumId.get(album.id) ?? [];

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={workspace.account.slug}
        title={album.title}
        description={<AppBreadcrumbs />}
      />

      <div className="flex w-full max-w-6xl flex-col gap-6 pb-32">
        <div>
          <Button
            nativeButton={false}
            render={<Link href="/band/albums" />}
            variant="ghost"
          >
            <ArrowLeft data-icon="inline-start" />
            Records
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card className="overflow-hidden">
            {album.cover_art_url ? (
              <div className="bg-muted relative aspect-square overflow-hidden">
                <Image
                  alt={`${album.title} cover`}
                  className="h-full w-full object-cover"
                  fill
                  src={album.cover_art_url}
                  unoptimized
                />
              </div>
            ) : null}

            <CardHeader>
              <CardTitle>{album.title}</CardTitle>
              <CardDescription>
                {album.original_artist} · {album.release_year ?? 'Year unknown'}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-wrap gap-2">
              {album.album_type ? (
                <Badge variant="secondary">{album.album_type}</Badge>
              ) : null}
              {album.studio ? <Badge variant="secondary">Studio</Badge> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Reference songs</CardTitle>
                  <CardDescription>
                    Songs in the current reference import that appear on this
                    record.
                  </CardDescription>
                </div>

                {album.reference_url ? (
                  <Button
                    nativeButton={false}
                    render={
                      <a
                        href={album.reference_url}
                        rel="noreferrer"
                        target="_blank"
                      />
                    }
                    variant="outline"
                  >
                    Source
                    <ExternalLink data-icon="inline-end" />
                  </Button>
                ) : null}
              </div>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Song</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>BPM</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {songs.length > 0 ? (
                    songs.map((song) => (
                      <TableRow key={song.id}>
                        <TableCell>
                          <Link
                            className="font-medium hover:underline"
                            href={`/band/songs/${song.slug}`}
                          >
                            {song.title}
                          </Link>
                        </TableCell>
                        <TableCell>{song.year_recorded ?? 'Unset'}</TableCell>
                        <TableCell>{song.song_key ?? 'Unset'}</TableCell>
                        <TableCell>{song.bpm ?? 'Unset'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        className="text-muted-foreground text-sm"
                        colSpan={4}
                      >
                        No imported reference songs are linked to this record
                        yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageBody>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowLeft, FileAudio, FileText, Music2 } from 'lucide-react';

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

interface SongDetailPageProps {
  params: Promise<{ songSlug: string }>;
}

export async function generateMetadata({ params }: SongDetailPageProps) {
  const { songSlug } = await params;

  return {
    title: songSlug,
  };
}

export default async function SongDetailPage({ params }: SongDetailPageProps) {
  const { songSlug } = await params;
  const workspace = await loadSwellWorkspace();
  const data = await loadBandAdminData(workspace.account.slug);
  const song = data.songBySlug.get(songSlug);

  if (!song) {
    notFound();
  }

  const albums = data.albumsBySongId.get(song.id) ?? [];
  const tags = data.tagsBySongId.get(song.id) ?? [];
  const parts = data.parts.filter((part) => part.song_id === song.id);

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={workspace.account.slug}
        title={song.title}
        description={<AppBreadcrumbs />}
      />

      <div className="flex w-full max-w-6xl flex-col gap-6 pb-32">
        <div>
          <Button
            nativeButton={false}
            render={<Link href="/band/songs" />}
            variant="ghost"
          >
            <ArrowLeft data-icon="inline-start" />
            Songs
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <div className="text-primary flex items-center gap-2">
                <Music2 className="size-5" />
                <CardTitle>{song.title}</CardTitle>
              </div>
              <CardDescription>
                {song.original_artist ?? 'The Beach Boys'}
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 text-sm sm:grid-cols-4">
              <MetadataBlock label="Year" value={song.year_recorded} />
              <MetadataBlock label="Key" value={song.song_key} />
              <MetadataBlock label="BPM" value={song.bpm} />
              <MetadataBlock label="Status" value={song.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>

            <CardContent className="flex flex-wrap gap-2">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.display}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">Untagged</span>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Records</CardTitle>
            <CardDescription>
              Original records where this song appears.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-wrap gap-2">
            {albums.length > 0 ? (
              albums.map((album) => (
                <Button
                  key={album.id}
                  nativeButton={false}
                  render={<Link href={`/band/albums/${album.slug}`} />}
                  variant="outline"
                >
                  {album.title}
                </Button>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">
                No through-1980 record reference yet.
              </span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Parts</CardTitle>
                <CardDescription>
                  Admin view of assigned parts and required rehearsal files.
                </CardDescription>
              </div>

              <Button nativeButton={false} render={<Link href="/band/parts" />}>
                Manage parts
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead>Default member</TableHead>
                  <TableHead>Files</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {parts.length > 0 ? (
                  parts.map((part) => {
                    const member = part.default_member_id
                      ? data.memberById.get(part.default_member_id)
                      : null;
                    const files = data.filesByPartId.get(part.id) ?? [];

                    return (
                      <TableRow key={part.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {part.label ?? formatSlot(part.slot)}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {formatSlot(part.slot)}
                              {part.is_lead ? ' · lead' : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {member?.display_name ?? (
                            <span className="text-muted-foreground">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {files.map((file) => (
                              <Badge
                                key={file.id}
                                variant="secondary"
                                className="max-w-64"
                                title={`${file.label} (${file.kind === 'guide_audio' ? 'MP3' : 'PDF'})`}
                              >
                                {file.kind === 'guide_audio' ? (
                                  <FileAudio data-icon="inline-start" />
                                ) : (
                                  <FileText data-icon="inline-start" />
                                )}
                                <span className="truncate">{file.label}</span>
                              </Badge>
                            ))}
                            {files.length === 0 ? (
                              <span className="text-muted-foreground text-sm">
                                Needs files
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      className="text-muted-foreground text-sm"
                      colSpan={3}
                    >
                      No parts have been created for this song yet.
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

function MetadataBlock({
  label,
  value,
}: {
  label: string;
  value: number | string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium uppercase">
        {label}
      </span>
      <span className="font-medium">{value ?? 'Unset'}</span>
    </div>
  );
}

function formatSlot(value: string | null) {
  if (!value) {
    return 'Unset';
  }

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

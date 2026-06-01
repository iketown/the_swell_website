import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  ArrowLeft,
  ExternalLink,
  FileAudio,
  FileText,
  Music2,
  Upload,
} from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
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
import { Input } from '@kit/ui/input';
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
import { uploadPartFileAction } from '~/home/[account]/band/_lib/server/band-admin.actions';
import { loadBandAdminData } from '~/home/[account]/band/_lib/server/band-admin.loader';

import { loadSwellWorkspace } from '../../../../_lib/server/swell-workspace.loader';

interface PartDetailPageProps {
  params: Promise<{ partSlug: string; songSlug: string }>;
}

export async function generateMetadata({ params }: PartDetailPageProps) {
  const { partSlug, songSlug } = await params;

  return {
    title: `${songSlug} ${partSlug}`,
  };
}

export default async function PartDetailPage({ params }: PartDetailPageProps) {
  const { partSlug, songSlug } = await params;
  const workspace = await loadSwellWorkspace();
  const data = await loadBandAdminData(workspace.account.slug);
  const song = data.songBySlug.get(songSlug);

  if (!song) {
    notFound();
  }

  const normalizedPartSlug = normalizePartSlug(partSlug);
  const part = data.parts.find(
    (candidate) =>
      candidate.song_id === song.id && candidate.slot === normalizedPartSlug,
  );

  if (!part) {
    notFound();
  }

  const member = part.default_member_id
    ? data.memberById.get(part.default_member_id)
    : null;
  const files = data.filesByPartId.get(part.id) ?? [];
  const signedFiles = await getSignedPartFiles(files);

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={workspace.account.slug}
        title={part.label ?? formatSlot(part.slot)}
        description={<AppBreadcrumbs />}
      />

      <div className="flex w-full max-w-6xl flex-col gap-6 pb-32">
        <div>
          <Button
            nativeButton={false}
            render={<Link href={`/band/parts/${song.slug}/parts`} />}
            variant="ghost"
          >
            <ArrowLeft data-icon="inline-start" />
            {song.title} parts
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <div className="text-primary flex items-center gap-2">
                <Music2 className="size-5" />
                <CardTitle>{part.label ?? formatSlot(part.slot)}</CardTitle>
              </div>
              <CardDescription>{song.title}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 text-sm sm:grid-cols-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs uppercase">
                  Slot
                </span>
                <Button
                  nativeButton={false}
                  render={
                    <Link
                      href={`/band/parts/slots/${compactPartLabel(part.slot)}`}
                    />
                  }
                  size="sm"
                  variant="link"
                  className="h-auto justify-start p-0 font-medium"
                >
                  {compactPartLabel(part.slot)}
                </Button>
              </div>
              <MetadataBlock label="Type" value={formatSlot(part.type)} />
              <MetadataBlock label="Lead" value={part.is_lead ? 'Yes' : 'No'} />
              <MetadataBlock
                label="Default member"
                value={member?.display_name ?? 'Unassigned'}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="secondary">{formatSlot(song.status)}</Badge>
              {part.is_lead ? <Badge>Lead</Badge> : null}
            </CardContent>
          </Card>
        </div>

        {part.description ? (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm leading-6 whitespace-pre-wrap">
              {part.description}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
            <CardDescription>
              Rehearsal audio and chart files for this part.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <div className="grid gap-3 md:grid-cols-2">
              <PartFileUploadForm
                accountSlug={workspace.account.slug}
                accept="audio/mpeg,audio/mp3,.mp3"
                buttonLabel="Upload MP3"
                kind="guide_audio"
                partId={part.id}
              />
              <PartFileUploadForm
                accountSlug={workspace.account.slug}
                accept="application/pdf,.pdf"
                buttonLabel="Upload PDF"
                kind="chart_pdf"
                partId={part.id}
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signedFiles.length > 0 ? (
                  signedFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        {file.label ?? formatSlot(file.kind)}
                        <div className="text-muted-foreground mt-1 font-mono text-xs">
                          {file.storage_path}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {file.kind === 'guide_audio' ? (
                            <FileAudio data-icon="inline-start" />
                          ) : (
                            <FileText data-icon="inline-start" />
                          )}
                          {file.kind === 'guide_audio' ? 'MP3' : 'PDF'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {file.signedUrl ? (
                          file.kind === 'guide_audio' ? (
                            <audio
                              className="w-full max-w-sm"
                              controls
                              preload="metadata"
                              src={file.signedUrl}
                            />
                          ) : (
                            <Button
                              nativeButton={false}
                              render={
                                <a
                                  href={file.signedUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                />
                              }
                              size="sm"
                              variant="outline"
                            >
                              <ExternalLink data-icon="inline-start" />
                              Open PDF
                            </Button>
                          )
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Unavailable
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      className="text-muted-foreground text-sm"
                      colSpan={3}
                    >
                      No files are attached to this part yet.
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

function PartFileUploadForm({
  accept,
  accountSlug,
  buttonLabel,
  kind,
  partId,
}: {
  accept: string;
  accountSlug: string;
  buttonLabel: string;
  kind: 'chart_pdf' | 'guide_audio';
  partId: string;
}) {
  return (
    <form
      action={uploadPartFileAction}
      className="border-input bg-muted/30 flex flex-col gap-3 rounded-lg border p-3"
    >
      <input type="hidden" name="accountSlug" value={accountSlug} />
      <input type="hidden" name="partId" value={partId} />
      <input type="hidden" name="kind" value={kind} />
      <Input
        name="label"
        placeholder={kind === 'guide_audio' ? 'MP3 label' : 'PDF label'}
      />
      <Input accept={accept} name="file" required type="file" />
      <Button type="submit" size="sm">
        <Upload data-icon="inline-start" />
        {buttonLabel}
      </Button>
    </form>
  );
}

async function getSignedPartFiles<T extends { storage_path: string }>(
  files: T[],
) {
  const client = getSupabaseServerClient();

  return Promise.all(
    files.map(async (file) => {
      const { data } = await client.storage
        .from('band_assets')
        .createSignedUrl(file.storage_path, 60 * 60);

      return {
        ...file,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
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
      <span className="text-muted-foreground text-xs uppercase">{label}</span>
      <span className="font-medium">{value ?? 'Unset'}</span>
    </div>
  );
}

function normalizePartSlug(partSlug: string) {
  if (partSlug.startsWith('voc_')) {
    return partSlug.replace('voc_', 'vocal_');
  }

  return partSlug;
}

function compactPartLabel(slot: string) {
  if (slot.startsWith('vocal_')) {
    return slot.replace('vocal_', 'voc_');
  }

  return slot;
}

function formatSlot(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

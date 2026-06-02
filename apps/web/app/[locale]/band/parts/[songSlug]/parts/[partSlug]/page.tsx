import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  ArrowLeft,
  ExternalLink,
  Music2,
  Paperclip,
  Trash2,
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
import {
  attachSongInventoryFileToPartAction,
  removePartFileReferenceAction,
} from '~/home/[account]/band/_lib/server/band-admin.actions';
import { loadBandAdminData } from '~/home/[account]/band/_lib/server/band-admin.loader';

import { loadSwellWorkspace } from '../../../../_lib/server/swell-workspace.loader';
import { PartFileBadge } from '../../../_components/part-file-badge';
import { PartFileTitleEditor } from './_components/part-file-title-editor';
import { PartFileUploadForm } from './_components/part-file-upload-form';

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
  const files = (data.filesByPartId.get(part.id) ?? []).filter(
    isUploadedPartFile,
  );
  const signedFiles = await getSignedPartFiles(files);
  const attachedStoragePaths = new Set(files.map((file) => file.storage_path));
  const songPartById = new Map(
    data.parts
      .filter((candidate) => candidate.song_id === song.id)
      .map((candidate) => [candidate.id, candidate]),
  );
  const attachableSongFiles = getAttachableSongFiles({
    attachedStoragePaths,
    files: data.files.filter(isUploadedPartFile),
    songPartById,
    songFiles: (data.songFilesBySongId.get(song.id) ?? []).filter(
      isUploadedPartFile,
    ),
  });

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
            render={<Link href={`/band/parts/${song.slug}`} />}
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

            {attachableSongFiles.length > 0 ? (
              <AttachExistingPartFileForm
                accountSlug={workspace.account.slug}
                files={attachableSongFiles}
                partId={part.id}
              />
            ) : null}

            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[32%]">File</TableHead>
                  <TableHead className="w-24">Kind</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signedFiles.length > 0 ? (
                  signedFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="min-w-0 font-medium">
                        {file.kind === 'guide_audio' ? (
                          <PartFileTitleEditor
                            accountSlug={workspace.account.slug}
                            fileId={file.id}
                            title={file.label ?? ''}
                          />
                        ) : (
                          (file.label ?? formatSlot(file.kind))
                        )}
                        <div className="text-muted-foreground mt-1 truncate font-mono text-xs">
                          {file.storage_path}
                        </div>
                      </TableCell>
                      <TableCell>
                        <PartFileBadge
                          kind={file.kind}
                          label={file.label ?? formatSlot(file.kind)}
                          labelClassName="max-w-32"
                          previewUrl={file.signedUrl}
                        />
                      </TableCell>
                      <TableCell>
                        {file.signedUrl ? (
                          file.kind === 'guide_audio' ? (
                            <audio
                              className="w-full min-w-72"
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
                      <TableCell className="text-right">
                        <RemovePartFileReferenceForm
                          accountSlug={workspace.account.slug}
                          fileId={file.id}
                          title={file.label ?? formatSlot(file.kind)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      className="text-muted-foreground text-sm"
                      colSpan={4}
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

function AttachExistingPartFileForm({
  accountSlug,
  files,
  partId,
}: {
  accountSlug: string;
  files: AttachableSongFile[];
  partId: string;
}) {
  return (
    <form
      action={attachSongInventoryFileToPartAction}
      className="border-input bg-background flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="accountSlug" value={accountSlug} />
      <input type="hidden" name="partId" value={partId} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-medium">Attach existing song file</span>
        <select
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 min-w-0 rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
          name="sourceFileRef"
          required
        >
          {files.map((file) => (
            <option key={file.sourceFileRef} value={file.sourceFileRef}>
              {file.label} ({file.kind === 'guide_audio' ? 'MP3' : 'PDF'} ·{' '}
              {file.sourceLabel})
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" variant="outline">
        <Paperclip data-icon="inline-start" />
        Attach
      </Button>
    </form>
  );
}

function RemovePartFileReferenceForm({
  accountSlug,
  fileId,
  title,
}: {
  accountSlug: string;
  fileId: string;
  title: string;
}) {
  return (
    <form action={removePartFileReferenceAction}>
      <input type="hidden" name="accountSlug" value={accountSlug} />
      <input type="hidden" name="id" value={fileId} />
      <Button
        aria-label={`Remove ${title} from this part`}
        data-swell-tone="danger"
        type="submit"
        size="icon"
        variant="ghost"
        className="size-8"
      >
        <Trash2 />
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

function isUploadedPartFile<
  FileRow extends {
    kind: string;
    label: string;
    storage_path: string;
  },
>(file: FileRow): file is FileRow & { kind: 'chart_pdf' | 'guide_audio' } {
  return file.kind === 'chart_pdf' || file.kind === 'guide_audio';
}

type AttachableSongFile = {
  id: string;
  kind: 'chart_pdf' | 'guide_audio';
  label: string;
  sourceFileRef: string;
  sourceLabel: string;
};

function getAttachableSongFiles({
  attachedStoragePaths,
  files,
  songPartById,
  songFiles,
}: {
  attachedStoragePaths: Set<string>;
  files: Array<{
    id: string;
    kind: 'chart_pdf' | 'guide_audio';
    label: string;
    part_id: string;
    storage_path: string;
  }>;
  songPartById: Map<string, { label: string | null; slot: string }>;
  songFiles: Array<{
    id: string;
    kind: 'chart_pdf' | 'guide_audio';
    label: string;
    storage_path: string;
  }>;
}) {
  const seenStoragePaths = new Set<string>();
  const options: AttachableSongFile[] = [];

  for (const file of songFiles) {
    if (
      attachedStoragePaths.has(file.storage_path) ||
      seenStoragePaths.has(file.storage_path)
    ) {
      continue;
    }

    seenStoragePaths.add(file.storage_path);
    options.push({
      id: file.id,
      kind: file.kind,
      label: file.label,
      sourceFileRef: `song:${file.id}`,
      sourceLabel: 'Song upload',
    });
  }

  for (const file of files) {
    const sourcePart = songPartById.get(file.part_id);

    if (!sourcePart || attachedStoragePaths.has(file.storage_path)) {
      continue;
    }

    if (seenStoragePaths.has(file.storage_path)) {
      continue;
    }

    seenStoragePaths.add(file.storage_path);
    options.push({
      id: file.id,
      kind: file.kind,
      label: file.label,
      sourceFileRef: `part:${file.id}`,
      sourceLabel: sourcePart.label ?? formatSlot(sourcePart.slot),
    });
  }

  return options.sort((a, b) => {
    const byKind = a.kind.localeCompare(b.kind);

    if (byKind !== 0) {
      return byKind;
    }

    return a.label.localeCompare(b.label);
  });
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

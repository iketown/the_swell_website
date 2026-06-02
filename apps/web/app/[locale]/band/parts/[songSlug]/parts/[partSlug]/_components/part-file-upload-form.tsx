'use client';

import { type FormEvent, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  CheckCircle2,
  CircleAlert,
  FileAudio,
  FileText,
  Loader2,
  Upload,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Progress } from '@kit/ui/progress';
import { toast } from '@kit/ui/sonner';
import { cn } from '@kit/ui/utils';

import {
  finalizePartFileUploadAction,
  preparePartFileUploadAction,
} from '~/home/[account]/band/_lib/server/band-admin.actions';
import type { Database } from '~/lib/database.types';

import {
  formatBytes,
  MAX_DIRECT_BAND_ASSET_BYTES,
  removeUploadedBandAsset,
  toClientUploadFile,
  type UploadQueueItem,
  uploadBandAssetWithProgress,
} from '../../../../_components/direct-band-asset-upload';

export function PartFileUploadForm({
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
  const client = useSupabase<Database>();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [label, setLabel] = useState('');
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const kindLabel = kind === 'guide_audio' ? 'MP3' : 'PDF';
  const Icon = kind === 'guide_audio' ? FileAudio : FileText;
  const allowMultiple = kind === 'guide_audio';
  const hasFiles = files.length > 0;
  const hasMultipleFiles = files.length > 1;
  const {
    getInputProps,
    getRootProps,
    inputRef,
    isDragActive,
    isDragReject,
    open,
  } = useDropzone({
    accept: acceptToDropzoneAccept(accept),
    maxFiles: allowMultiple ? 25 : 1,
    maxSize: MAX_DIRECT_BAND_ASSET_BYTES,
    multiple: allowMultiple,
    noClick: true,
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      setQueue(createQueueItems(acceptedFiles));
    },
    onDropRejected: (rejections) => {
      setFiles([]);
      setQueue(
        rejections.map(({ file }) => ({
          error: `${kindLabel} files must be ${formatBytes(
            MAX_DIRECT_BAND_ASSET_BYTES,
          )} or less.`,
          id: getFileQueueId(file, 0),
          name: file.name,
          progress: 0,
          size: file.size,
          status: 'error',
        })),
      );
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (files.length === 0 || isUploading) {
      return;
    }

    const queueItems = createQueueItems(files);
    let completedCount = 0;

    setQueue(queueItems);
    setIsUploading(true);

    for (const [index, file] of files.entries()) {
      const queueId = queueItems[index]?.id;
      const clientFile = toClientUploadFile(file);
      let storagePath: string | null = null;

      if (!queueId) {
        continue;
      }

      try {
        updateQueueItem(queueId, { progress: 0, status: 'preparing' });

        const prepared = await preparePartFileUploadAction({
          accountSlug,
          file: clientFile,
          kind,
          label: !hasMultipleFiles && label.trim() ? label.trim() : null,
          partId,
        });

        storagePath = prepared.storagePath;
        updateQueueItem(queueId, { progress: 0, status: 'uploading' });

        await uploadBandAssetWithProgress({
          client,
          file,
          onProgress: (progress) => updateQueueItem(queueId, { progress }),
          storagePath,
        });

        updateQueueItem(queueId, { progress: 100, status: 'saving' });

        await finalizePartFileUploadAction({
          accountSlug,
          file: clientFile,
          kind,
          label: !hasMultipleFiles && label.trim() ? label.trim() : null,
          partId,
          storagePath,
        });

        completedCount += 1;
        updateQueueItem(queueId, { progress: 100, status: 'complete' });
      } catch (reason) {
        if (storagePath) {
          await removeUploadedBandAsset(client, storagePath);
        }

        updateQueueItem(queueId, {
          error:
            reason instanceof Error ? reason.message : 'Could not upload file.',
          status: 'error',
        });
      }
    }

    setIsUploading(false);

    if (completedCount > 0) {
      router.refresh();
    }

    if (completedCount === files.length) {
      toast.success(
        files.length === 1 ? 'File uploaded' : `${files.length} files uploaded`,
      );
      setFiles([]);
      setLabel('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } else if (completedCount > 0) {
      toast.warning(`${completedCount} of ${files.length} files uploaded`);
    } else {
      toast.error('No files uploaded');
    }
  }

  function updateQueueItem(
    queueId: string,
    patch: Partial<UploadQueueItem>,
  ) {
    setQueue((current) =>
      current.map((item) =>
        item.id === queueId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  return (
    <form
      className="border-input bg-muted/30 flex flex-col gap-3 rounded-lg border p-3"
      onSubmit={handleSubmit}
    >
      <Input
        disabled={hasMultipleFiles || isUploading}
        onChange={(event) => setLabel(event.target.value)}
        placeholder={
          hasMultipleFiles
            ? 'Titles will use file names for batch uploads'
            : kind === 'guide_audio'
              ? 'Optional MP3 title'
              : 'PDF label'
        }
        value={label}
      />
      <input
        {...getInputProps({
          multiple: allowMultiple,
          onChange: (event) => {
            const nextFiles = Array.from(event.currentTarget.files ?? []);
            setFiles(nextFiles);
            setQueue(createQueueItems(nextFiles));
          },
        })}
        className="sr-only"
      />
      <button
        {...getRootProps({
          className: cn(
            'border-input bg-background hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-14 items-center gap-3 rounded-lg border border-dashed px-3 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-3',
            isDragActive && !isDragReject && 'border-primary bg-primary/5',
            isDragReject && 'border-destructive bg-destructive/5',
            isUploading && 'pointer-events-none opacity-70',
          ),
        })}
        aria-label={`Choose or drop ${kindLabel} file`}
        disabled={isUploading}
        onClick={open}
        type="button"
      >
        <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
          <Icon className="size-4" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-medium">
            {hasFiles
              ? `${files.length} ${files.length === 1 ? 'file' : 'files'} ready`
              : `Drop ${kindLabel}${allowMultiple ? 's' : ''} here or choose file`}
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {hasFiles
              ? files.map((file) => file.name).join(', ')
              : `Uploads run one at a time, up to ${formatBytes(
                  MAX_DIRECT_BAND_ASSET_BYTES,
                )} each`}
          </span>
        </span>
      </button>

      <UploadQueue items={queue} />

      <Button disabled={!hasFiles || isUploading} size="sm" type="submit">
        {isUploading ? (
          <Loader2 className="animate-spin" data-icon="inline-start" />
        ) : (
          <Upload data-icon="inline-start" />
        )}
        {isUploading ? 'Uploading...' : buttonLabel}
      </Button>
    </form>
  );
}

function UploadQueue({ items }: { items: UploadQueueItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div
          className="border-input bg-background grid gap-1 rounded-md border px-3 py-2 text-xs"
          key={item.id}
        >
          <div className="flex min-w-0 items-center gap-2">
            {item.status === 'complete' ? (
              <CheckCircle2 className="text-primary size-4 shrink-0" />
            ) : item.status === 'error' ? (
              <CircleAlert className="text-destructive size-4 shrink-0" />
            ) : item.status === 'queued' ? (
              <IconForQueuedItem className="text-muted-foreground size-4 shrink-0" />
            ) : (
              <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />
            )}
            <span className="truncate font-medium">{item.name}</span>
            <span className="text-muted-foreground ml-auto shrink-0">
              {formatBytes(item.size)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Progress className="flex-1" value={item.progress} />
            <span className="text-muted-foreground w-20 text-right tabular-nums">
              {getUploadStatusLabel(item)}
            </span>
          </div>
          {item.error ? (
            <p className="text-destructive text-xs">{item.error}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function IconForQueuedItem({ className }: { className: string }) {
  return <Upload className={className} />;
}

function createQueueItems(files: File[]): UploadQueueItem[] {
  return files.map((file, index) => ({
    id: getFileQueueId(file, index),
    name: file.name,
    progress: 0,
    size: file.size,
    status: 'queued',
  }));
}

function getFileQueueId(file: File, index: number) {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`;
}

function getUploadStatusLabel(item: UploadQueueItem) {
  switch (item.status) {
    case 'queued':
      return 'Queued';
    case 'preparing':
      return 'Preparing';
    case 'uploading':
      return `${item.progress}%`;
    case 'saving':
      return 'Saving';
    case 'complete':
      return 'Done';
    case 'error':
      return 'Failed';
  }
}

function acceptToDropzoneAccept(accept: string) {
  const parts = accept
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .reduce(
      (acc, value) => {
        if (value.startsWith('.')) {
          acc.extensions.push(value);
        } else {
          acc.mimeTypes.push(value);
        }

        return acc;
      },
      { extensions: [] as string[], mimeTypes: [] as string[] },
    );

  if (parts.mimeTypes.length === 0) {
    return { 'application/octet-stream': parts.extensions };
  }

  return parts.mimeTypes.reduce<Record<string, string[]>>((acc, mimeType) => {
    acc[mimeType] = parts.extensions;

    return acc;
  }, {});
}

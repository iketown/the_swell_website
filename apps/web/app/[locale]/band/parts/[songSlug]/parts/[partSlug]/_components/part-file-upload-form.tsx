'use client';

import { useState } from 'react';

import { FileAudio, FileText, Upload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { cn } from '@kit/ui/utils';

import { uploadPartFileAction } from '~/home/[account]/band/_lib/server/band-admin.actions';

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
  const [fileName, setFileName] = useState('');
  const kindLabel = kind === 'guide_audio' ? 'MP3' : 'PDF';
  const Icon = kind === 'guide_audio' ? FileAudio : FileText;
  const {
    getInputProps,
    getRootProps,
    inputRef,
    isDragActive,
    isDragReject,
    open,
  } = useDropzone({
    accept: acceptToDropzoneAccept(accept),
    maxFiles: 1,
    multiple: false,
    noClick: true,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];

      if (!file || !inputRef.current) {
        return;
      }

      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current.files = transfer.files;
      setFileName(file.name);
    },
  });

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
        placeholder={
          kind === 'guide_audio' ? 'Optional MP3 title' : 'PDF label'
        }
      />
      <input
        {...getInputProps({
          name: 'file',
          onChange: (event) => {
            setFileName(event.currentTarget.files?.item(0)?.name ?? '');
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
          ),
        })}
        aria-label={`Choose or drop ${kindLabel} file`}
        onClick={open}
        type="button"
      >
        <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
          <Icon className="size-4" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-medium">
            {fileName || `Drop ${kindLabel} here or choose file`}
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {fileName ? 'Ready to upload' : `Drag from Finder, then upload`}
          </span>
        </span>
      </button>
      <Button type="submit" size="sm" disabled={!fileName}>
        <Upload data-icon="inline-start" />
        {buttonLabel}
      </Button>
    </form>
  );
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

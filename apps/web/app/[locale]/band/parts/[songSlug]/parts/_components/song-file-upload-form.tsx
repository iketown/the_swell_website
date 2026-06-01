'use client';

import { useState } from 'react';

import { FileUp, Upload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import { cn } from '@kit/ui/utils';

import { uploadSongFileAction } from '~/home/[account]/band/_lib/server/band-admin.actions';

export function SongFileUploadForm({
  accountSlug,
  songId,
}: {
  accountSlug: string;
  songId: string;
}) {
  const [fileNames, setFileNames] = useState<string[]>([]);
  const hasFiles = fileNames.length > 0;
  const hasMultipleFiles = fileNames.length > 1;
  const {
    getInputProps,
    getRootProps,
    inputRef,
    isDragActive,
    isDragReject,
    open,
  } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'audio/mpeg': ['.mp3'],
      'audio/mp3': ['.mp3'],
    },
    maxFiles: 25,
    multiple: true,
    noClick: true,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length === 0 || !inputRef.current) {
        return;
      }

      const transfer = new DataTransfer();

      for (const file of acceptedFiles) {
        transfer.items.add(file);
      }

      inputRef.current.files = transfer.files;
      setFileNames(acceptedFiles.map((file) => file.name));
    },
  });

  return (
    <form
      action={uploadSongFileAction}
      className="border-input bg-muted/30 flex flex-col gap-3 rounded-lg border p-3"
    >
      <input type="hidden" name="accountSlug" value={accountSlug} />
      <input type="hidden" name="songId" value={songId} />
      <Input
        name="label"
        placeholder={
          hasMultipleFiles
            ? 'Titles will use file names for batch uploads'
            : 'Optional file title'
        }
        disabled={hasMultipleFiles}
      />
      <Textarea
        name="description"
        placeholder={
          hasMultipleFiles
            ? 'Optional description applied to each uploaded file'
            : 'Optional description'
        }
        rows={3}
      />
      <input
        {...getInputProps({
          name: 'file',
          multiple: true,
          onChange: (event) => {
            setFileNames(
              Array.from(event.currentTarget.files ?? []).map(
                (file) => file.name,
              ),
            );
          },
        })}
        className="sr-only"
      />
      <button
        {...getRootProps({
          className: cn(
            'border-input bg-background hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-24 items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-left text-sm transition-colors outline-none focus-visible:ring-3',
            isDragActive && !isDragReject && 'border-primary bg-primary/5',
            isDragReject && 'border-destructive bg-destructive/5',
          ),
        })}
        aria-label="Choose or drop song MP3 or PDF file"
        onClick={open}
        type="button"
      >
        <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md">
          <FileUp className="size-4" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-medium">
            {hasFiles
              ? `${fileNames.length} ${fileNames.length === 1 ? 'file' : 'files'} ready`
              : 'Drop MP3s or PDFs here or choose files'}
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {hasFiles
              ? fileNames.join(', ')
              : 'Upload once, then attach files to any part below'}
          </span>
        </span>
      </button>
      <Button type="submit" size="sm" disabled={!hasFiles}>
        <Upload data-icon="inline-start" />
        {hasMultipleFiles ? 'Upload files' : 'Upload file'}
      </Button>
    </form>
  );
}

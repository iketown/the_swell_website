'use client';

import { type ComponentProps, type ReactNode } from 'react';
import { useRef, useState, useTransition } from 'react';

import { ExternalLink, FileText, Play } from 'lucide-react';
import { StickyNote } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { toast } from '@kit/ui/sonner';
import { cn } from '@kit/ui/utils';

import { updateSongPartNoteAction } from '~/home/[account]/band/_lib/server/band-admin.actions';

import {
  PartNoteContent,
  PartNoteEditor,
  PartNoteViewer,
} from './part-note-rich-text';

export type PartFileBadgeKind = 'chart_pdf' | 'guide_audio' | 'rich_text_note';

type PartFileBadgeTone = 'assigned' | 'available' | 'highlighted' | 'neutral';

export function PartFileBadge({
  accountSlug,
  assetId,
  children,
  className,
  count,
  kind,
  label,
  labelClassName,
  noteContent,
  previewUrl,
  tone = 'neutral',
  tooltip,
  variant = 'secondary',
  ...props
}: Omit<ComponentProps<typeof Badge>, 'children' | 'title'> & {
  children?: ReactNode;
  count?: number;
  kind: PartFileBadgeKind;
  label: string;
  labelClassName?: string;
  accountSlug?: string;
  assetId?: string;
  noteContent?: PartNoteContent | null;
  previewUrl?: string | null;
  tone?: PartFileBadgeTone;
  tooltip?: string | null;
}) {
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(label);
  const [draftContent, setDraftContent] = useState<PartNoteContent | null>(
    noteContent ?? null,
  );
  const latestDraftContentRef = useRef<PartNoteContent | null>(
    noteContent ?? null,
  );
  const [isPending, startTransition] = useTransition();
  const isNote = kind === 'rich_text_note';
  const canPreview = isNote ? Boolean(noteContent) : Boolean(previewUrl);
  const canEditNote = Boolean(isNote && accountSlug && assetId);
  const previewKindLabel =
    kind === 'guide_audio' ? 'MP3' : kind === 'chart_pdf' ? 'PDF' : 'Note';

  function saveNote() {
    const contentToSave = latestDraftContentRef.current;

    if (!accountSlug || !assetId || !contentToSave) {
      return;
    }

    startTransition(() => {
      void updateSongPartNoteAction({
        accountSlug,
        assetId,
        content: contentToSave,
        title: draftTitle,
      })
        .then(() => {
          toast.success('Note updated');
          setIsEditing(false);
          router.refresh();
        })
        .catch((reason: unknown) => {
          toast.error(
            reason instanceof Error ? reason.message : 'Could not update note.',
          );
        });
    });
  }

  return (
    <>
      <Badge
        className={cn(
          'h-auto max-w-full gap-1.5 px-2.5 py-1 text-sm',
          tone === 'available' &&
            'border-primary/30 bg-primary/10 text-primary',
          tone === 'assigned' && 'border-border bg-background text-foreground',
          tone === 'highlighted' &&
            'border-primary bg-primary/10 text-primary ring-2 ring-primary/20',
          className,
        )}
        title={tooltip ?? label}
        variant={variant}
        {...props}
      >
        <button
          aria-label={`Preview ${label}`}
          className={cn(
            'hover:bg-muted inline-flex size-5 shrink-0 items-center justify-center rounded-full [&>svg]:size-3 [&>svg]:shrink-0',
            canPreview
              ? 'cursor-pointer'
              : 'text-muted-foreground cursor-not-allowed opacity-60',
          )}
          disabled={!canPreview}
          draggable={false}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setPreviewOpen(true);
          }}
          onDragStart={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          {kind === 'guide_audio' ? (
            <Play fill="currentColor" />
          ) : kind === 'chart_pdf' ? (
            <FileText />
          ) : (
            <StickyNote />
          )}
        </button>
        <span className={cn('min-w-0 truncate', labelClassName)}>
          {label}
          {count && count > 1 ? ` (${count})` : ''}
        </span>
        {children}
      </Badge>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? (
                <input
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-base font-semibold outline-none focus-visible:ring-3"
                  maxLength={255}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  value={draftTitle}
                />
              ) : (
                label
              )}
            </DialogTitle>
            <DialogDescription>
              {previewKindLabel}
              {tooltip && tooltip !== label ? ` · ${tooltip}` : ''}
            </DialogDescription>
          </DialogHeader>

          {isNote ? (
            isEditing ? (
              <div className="flex flex-col gap-4">
                <PartNoteEditor
                  content={draftContent}
                  onChange={(nextContent) => {
                    latestDraftContentRef.current = nextContent;
                    setDraftContent(nextContent);
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    disabled={isPending}
                    onClick={() => {
                      setDraftTitle(label);
                      setDraftContent(noteContent ?? null);
                      latestDraftContentRef.current = noteContent ?? null;
                      setIsEditing(false);
                    }}
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={isPending || draftTitle.trim().length === 0}
                    onClick={saveNote}
                    type="button"
                  >
                    Save note
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <PartNoteViewer
                  className="rounded-lg border px-4 py-3"
                  content={noteContent}
                />
                {canEditNote ? (
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        setDraftTitle(label);
                        setDraftContent(noteContent ?? null);
                        latestDraftContentRef.current = noteContent ?? null;
                        setIsEditing(true);
                      }}
                      type="button"
                      variant="outline"
                    >
                      Edit note
                    </Button>
                  </div>
                ) : null}
              </div>
            )
          ) : previewUrl ? (
            kind === 'guide_audio' ? (
              <audio
                className="w-full"
                controls
                preload="metadata"
                src={previewUrl}
              />
            ) : (
              <div className="flex flex-col gap-3">
                <iframe
                  className="border-input h-[70vh] w-full rounded-lg border"
                  src={previewUrl}
                  title={label}
                />
                <Button
                  nativeButton={false}
                  render={
                    <a href={previewUrl} rel="noreferrer" target="_blank" />
                  }
                  size="sm"
                  variant="outline"
                >
                  <ExternalLink data-icon="inline-start" />
                  Open PDF
                </Button>
              </div>
            )
          ) : (
            <p className="text-muted-foreground text-sm">
              This file preview is unavailable.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

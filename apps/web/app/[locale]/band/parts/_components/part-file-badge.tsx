'use client';

import { type ComponentProps, type ReactNode } from 'react';
import { useState } from 'react';

import { ExternalLink, FileText, Play } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { cn } from '@kit/ui/utils';

export type PartFileBadgeKind = 'chart_pdf' | 'guide_audio';

type PartFileBadgeTone = 'assigned' | 'available' | 'highlighted' | 'neutral';

export function PartFileBadge({
  children,
  className,
  count,
  kind,
  label,
  labelClassName,
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
  previewUrl?: string | null;
  tone?: PartFileBadgeTone;
  tooltip?: string | null;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewKindLabel = kind === 'guide_audio' ? 'MP3' : 'PDF';

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
            previewUrl
              ? 'cursor-pointer'
              : 'text-muted-foreground cursor-not-allowed opacity-60',
          )}
          disabled={!previewUrl}
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
          ) : (
            <FileText />
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
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              {previewKindLabel}
              {tooltip && tooltip !== label ? ` · ${tooltip}` : ''}
            </DialogDescription>
          </DialogHeader>

          {previewUrl ? (
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

'use client';

import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Check, Pencil, X } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';

import { updatePartFileTitleAction } from '~/home/[account]/band/_lib/server/band-admin.actions';

export function PartFileTitleEditor({
  accountSlug,
  fileId,
  title,
}: {
  accountSlug: string;
  fileId: string;
  title: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);

  useEffect(() => {
    if (!isEditing) {
      setDraftTitle(title);
    }
  }, [isEditing, title]);

  if (isEditing) {
    return (
      <form
        action={async (formData) => {
          await updatePartFileTitleAction(formData);
          setIsEditing(false);
        }}
        className="flex max-w-xs items-center gap-1.5"
      >
        <input type="hidden" name="accountSlug" value={accountSlug} />
        <input type="hidden" name="id" value={fileId} />
        <Input
          aria-label="MP3 title"
          className="h-8"
          maxLength={255}
          name="label"
          onChange={(event) => setDraftTitle(event.target.value)}
          required
          value={draftTitle}
        />
        <TitleEditActions
          onCancel={() => {
            setDraftTitle(title);
            setIsEditing(false);
          }}
        />
      </form>
    );
  }

  return (
    <div className="flex max-w-xs items-center gap-1.5">
      <span className="truncate text-sm font-medium">
        {title || 'MP3 guide'}
      </span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="Edit MP3 title"
                type="button"
                size="icon"
                variant="ghost"
                className="text-muted-foreground size-7 shrink-0"
                onClick={() => setIsEditing(true)}
              >
                <Pencil />
              </Button>
            }
          />
          <TooltipContent>Edit title</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function TitleEditActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="Save MP3 title"
                disabled={pending}
                type="submit"
                size="icon"
                variant="outline"
                className="size-8 shrink-0"
              >
                <Check />
              </Button>
            }
          />
          <TooltipContent>Save</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="Cancel MP3 title edit"
                disabled={pending}
                type="button"
                size="icon"
                variant="ghost"
                className="text-muted-foreground size-8 shrink-0"
                onClick={onCancel}
              >
                <X />
              </Button>
            }
          />
          <TooltipContent>Cancel</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

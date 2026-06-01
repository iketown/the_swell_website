import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowLeft, FileAudio, FileText, PlusCircle } from 'lucide-react';

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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
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
import { Textarea } from '@kit/ui/textarea';

import { TeamAccountLayoutPageHeader } from '~/home/[account]/_components/team-account-layout-page-header';
import { createPartAction } from '~/home/[account]/band/_lib/server/band-admin.actions';
import { loadBandAdminData } from '~/home/[account]/band/_lib/server/band-admin.loader';

import { loadSwellWorkspace } from '../../../_lib/server/swell-workspace.loader';

interface SongPartsPageProps {
  params: Promise<{ songSlug: string }>;
}

const instrumentSlots = [
  ['rhy_gtr', 'Rhythm guitar'],
  ['lead_gtr', 'Lead guitar'],
  ['keys', 'Keys'],
  ['bass', 'Bass'],
  ['drums', 'Drums'],
] as const;

const vocalSlots = [
  ['vocal_1', 'Vocal 1'],
  ['vocal_2', 'Vocal 2'],
  ['vocal_3', 'Vocal 3'],
  ['vocal_4', 'Vocal 4'],
  ['vocal_5', 'Vocal 5'],
] as const;

export async function generateMetadata({ params }: SongPartsPageProps) {
  const { songSlug } = await params;

  return {
    title: `${songSlug} parts`,
  };
}

export default async function SongPartsPage({ params }: SongPartsPageProps) {
  const { songSlug } = await params;
  const workspace = await loadSwellWorkspace();
  const data = await loadBandAdminData(workspace.account.slug);
  const song = data.songBySlug.get(songSlug);

  if (!song) {
    notFound();
  }

  const parts = data.parts.filter((part) => part.song_id === song.id);

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={workspace.account.slug}
        title={`${song.title} parts`}
        description={<AppBreadcrumbs />}
      />

      <div className="flex w-full max-w-6xl flex-col gap-6 pb-32">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            nativeButton={false}
            render={<Link href="/band/parts" />}
            variant="ghost"
          >
            <ArrowLeft data-icon="inline-start" />
            Parts
          </Button>

          <CreatePartDialog
            accountSlug={workspace.account.slug}
            members={data.members}
            songId={song.id}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Arrangement</CardTitle>
            <CardDescription>
              Vocal and instrument parts for {song.title}.
            </CardDescription>
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
                          <Link
                            className="font-medium hover:underline"
                            href={`/band/parts/${song.slug}/parts/${part.slot}`}
                          >
                            {part.label ?? formatSlot(part.slot)}
                          </Link>
                          <div className="text-muted-foreground text-xs">
                            {compactPartLabel(part.slot)}
                            {part.is_lead ? ' · lead' : ''}
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
                            {files.length > 0 ? (
                              files.map((file) => (
                                <Badge key={file.id} variant="secondary">
                                  {file.kind === 'guide_audio' ? (
                                    <FileAudio data-icon="inline-start" />
                                  ) : (
                                    <FileText data-icon="inline-start" />
                                  )}
                                  {file.kind === 'guide_audio' ? 'MP3' : 'PDF'}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Needs files
                              </span>
                            )}
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
                      No parts yet. Create the first vocal or instrument part
                      for this song.
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

function CreatePartDialog({
  accountSlug,
  members,
  songId,
}: {
  accountSlug: string;
  members: Array<{
    display_name: string;
    id: string;
  }>;
  songId: string;
}) {
  const formId = `create-part-${songId}`;

  return (
    <Dialog>
      <DialogTrigger render={<Button />}>
        <PlusCircle data-icon="inline-start" />
        Create new part
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create new part</DialogTitle>
          <DialogDescription>
            Add a vocal, instrument, or miscellaneous part.
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          action={createPartAction}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="accountSlug" value={accountSlug} />
          <input type="hidden" name="song_id" value={songId} />

          <NativeSelect name="type" defaultValue="vocal">
            <option value="vocal">Vocal</option>
            <option value="instrumental">Instrumental</option>
            <option value="other">Other</option>
          </NativeSelect>

          <NativeSelect name="slot" defaultValue="vocal_1">
            <optgroup label="Vocals">
              {vocalSlots.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Instruments">
              {instrumentSlots.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Other">
              <option value="other">Other</option>
            </optgroup>
          </NativeSelect>

          <NativeSelect name="default_member_id" defaultValue="">
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.display_name}
              </option>
            ))}
          </NativeSelect>

          <Input name="label" placeholder="Part label" />
          <Textarea
            name="description"
            placeholder="Description or learning notes"
            rows={3}
          />
          <Input name="order_index" type="number" placeholder="Order" />

          <label className="border-input bg-background flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm">
            <input name="is_lead" type="checkbox" className="accent-primary" />
            Lead vocal or featured part
          </label>
        </form>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <DialogClose render={<Button form={formId} type="submit" />}>
            Create part
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NativeSelect(props: React.ComponentProps<'select'>) {
  return (
    <select
      {...props}
      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm transition-colors outline-none focus-visible:ring-3"
    />
  );
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

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowLeft, FileAudio, FileText } from 'lucide-react';

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

import { loadSwellWorkspace } from '../../../_lib/server/swell-workspace.loader';

interface SlotPartsPageProps {
  params: Promise<{ slotSlug: string }>;
}

const allowedSlots = new Set([
  'vocal_1',
  'vocal_2',
  'vocal_3',
  'vocal_4',
  'vocal_5',
  'rhy_gtr',
  'lead_gtr',
  'keys',
  'bass',
  'drums',
  'other',
]);

export async function generateMetadata({ params }: SlotPartsPageProps) {
  const { slotSlug } = await params;

  return {
    title: `${slotSlug} parts`,
  };
}

export default async function SlotPartsPage({ params }: SlotPartsPageProps) {
  const { slotSlug } = await params;
  const slot = normalizePartSlug(slotSlug);

  if (!allowedSlots.has(slot)) {
    notFound();
  }

  const workspace = await loadSwellWorkspace();
  const data = await loadBandAdminData(workspace.account.slug);
  const parts = data.parts.filter((part) => part.slot === slot);

  return (
    <PageBody>
      <TeamAccountLayoutPageHeader
        account={workspace.account.slug}
        title={`${compactPartLabel(slot)} parts`}
        description={<AppBreadcrumbs />}
      />

      <div className="flex w-full max-w-6xl flex-col gap-6 pb-32">
        <div>
          <Button
            nativeButton={false}
            render={<Link href="/band/parts" />}
            variant="ghost"
          >
            <ArrowLeft data-icon="inline-start" />
            Parts
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{compactPartLabel(slot)}</CardTitle>
            <CardDescription>
              Every song part assigned to this lane.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Song</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Default member</TableHead>
                  <TableHead>Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.length > 0 ? (
                  parts.map((part) => {
                    const song = data.songById.get(part.song_id);
                    const member = part.default_member_id
                      ? data.memberById.get(part.default_member_id)
                      : null;
                    const files = data.filesByPartId.get(part.id) ?? [];

                    if (!song) {
                      return null;
                    }

                    return (
                      <TableRow key={part.id}>
                        <TableCell>
                          <Link
                            className="font-medium hover:underline"
                            href={`/band/parts/${song.slug}/parts`}
                          >
                            {song.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            className="hover:underline"
                            href={`/band/parts/${song.slug}/parts/${part.slot}`}
                          >
                            {part.label ?? formatSlot(part.slot)}
                          </Link>
                          {part.description ? (
                            <div className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                              {part.description}
                            </div>
                          ) : null}
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
                              <Badge key={file.id} variant="secondary">
                                {file.kind === 'guide_audio' ? (
                                  <FileAudio data-icon="inline-start" />
                                ) : (
                                  <FileText data-icon="inline-start" />
                                )}
                                {file.kind === 'guide_audio' ? 'MP3' : 'PDF'}
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
                      colSpan={4}
                    >
                      No parts are assigned to this lane yet.
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

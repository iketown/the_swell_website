import Link from 'next/link';

import {
  FileAudio,
  FileText,
  Music,
  PlusCircle,
  Tags,
  Trash2,
  Users,
} from 'lucide-react';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { BandAdminData } from '../_lib/server/band-admin.loader';
import {
  createBandMemberAction,
  createPartAction,
  createSongAction,
  createTagAction,
  deleteBandMemberAction,
  deletePartAction,
  deleteSongAction,
  deleteTagAction,
  updateTagAction,
  updateSongTagsAction,
} from '../_lib/server/band-admin.actions';

type BandData = BandAdminData;

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

const songStatuses = ['active', 'learning', 'candidate', 'retired'] as const;
const memberStatuses = ['candidate', 'active', 'inactive', 'alumni'] as const;

export function BandOverview({ data }: { data: BandData }) {
  const assignedParts = data.parts.filter((part) => part.default_member_id);
  const unassignedParts = data.parts.length - assignedParts.length;
  const guideFiles = data.files.filter((file) => file.kind === 'guide_audio');
  const chartFiles = data.files.filter((file) => file.kind === 'chart_pdf');
  const basePath = `/home/${data.workspace.account.slug}/band`;

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 pb-32">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Members" value={data.members.length} />
        <MetricCard label="Songs" value={data.songs.length} />
        <MetricCard label="Parts" value={data.parts.length} />
        <MetricCard label="Open parts" value={unassignedParts} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BandQuickLink
          href={`${basePath}/members`}
          icon={<Users />}
          title="Members"
          description="Create candidates, track roles, and set home parts."
          action="Manage members"
        />

        <BandQuickLink
          href={`${basePath}/songs`}
          icon={<Music />}
          title="Songs"
          description="Build the working set list and rehearsal backlog."
          action="Manage songs"
        />

        <BandQuickLink
          href={`${basePath}/parts`}
          icon={<FileAudio />}
          title="Parts"
          description={`${assignedParts.length} assigned, ${guideFiles.length} guides, ${chartFiles.length} charts.`}
          action="Manage parts"
        />
      </div>
    </div>
  );
}

export function MembersAdmin({ data }: { data: BandData }) {
  const accountSlug = data.workspace.account.slug;

  return (
    <div className="grid w-full max-w-6xl gap-6 pb-32 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Band members</CardTitle>
          <CardDescription>
            Performer roster, candidates, and the first pass at home parts.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Default instrument</TableHead>
                <TableHead>Default vocal</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{member.display_name}</span>
                      <span className="text-muted-foreground text-xs">
                        {member.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={member.status} />
                  </TableCell>
                  <TableCell>{member.role_label ?? 'Member'}</TableCell>
                  <TableCell>{formatSlot(member.default_instrument)}</TableCell>
                  <TableCell>{formatSlot(member.default_vocal_slot)}</TableCell>
                  <TableCell className="text-right">
                    <DeleteButton
                      accountSlug={accountSlug}
                      id={member.id}
                      action={deleteBandMemberAction}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateMemberForm accountSlug={accountSlug} />
    </div>
  );
}

export function SongsAdmin({
  data,
  selectedTagSlug,
}: {
  data: BandData;
  selectedTagSlug?: string | null;
}) {
  const accountSlug = data.workspace.account.slug;
  const basePath = `/home/${accountSlug}/band/songs`;
  const selectedTag = selectedTagSlug
    ? data.tags.find((tag) => tag.slug === selectedTagSlug)
    : null;
  const songs = selectedTag
    ? data.songs.filter((song) =>
        (data.tagsBySongId.get(song.id) ?? []).some(
          (tag) => tag.id === selectedTag.id,
        ),
      )
    : data.songs;

  return (
    <div className="grid w-full max-w-6xl gap-6 pb-32 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Songs</CardTitle>
          <CardDescription>
            Working repertoire. Parts are added separately so arrangements can
            vary song by song.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              nativeButton={false}
              render={<Link href={basePath} />}
              size="sm"
              variant={selectedTag ? 'outline' : 'default'}
            >
              All
            </Button>

            {data.tags.map((tag) => (
              <Button
                key={tag.id}
                nativeButton={false}
                render={<Link href={`${basePath}?tag=${tag.slug}`} />}
                size="sm"
                variant={selectedTag?.id === tag.id ? 'default' : 'outline'}
              >
                {tag.display}
              </Button>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>BPM</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>

            <TableBody>
              {songs.map((song) => {
                const songTags = data.tagsBySongId.get(song.id) ?? [];

                return (
                  <TableRow key={song.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{song.title}</span>
                        <span className="text-muted-foreground text-xs">
                          {song.original_artist ?? 'The Beach Boys'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={song.status} />
                    </TableCell>
                    <TableCell>{song.song_key ?? 'Unset'}</TableCell>
                    <TableCell>{song.bpm ?? 'Unset'}</TableCell>
                    <TableCell className="min-w-56">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {songTags.length > 0 ? (
                            songTags.map((tag) => (
                              <Badge key={tag.id} variant="secondary">
                                {tag.display}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Untagged
                            </span>
                          )}
                        </div>

                        {data.canManageTags ? (
                          <TagAssignmentForm
                            accountSlug={accountSlug}
                            songId={song.id}
                            tags={data.tags}
                            selectedTagIds={new Set(
                              songTags.map((tag) => tag.id),
                            )}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteButton
                        accountSlug={accountSlug}
                        id={song.id}
                        action={deleteSongAction}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <CreateSongForm accountSlug={accountSlug} />

        {data.canManageTags ? <ManageTagsCard data={data} /> : null}
      </div>
    </div>
  );
}

export function PartsAdmin({ data }: { data: BandData }) {
  const accountSlug = data.workspace.account.slug;

  return (
    <div className="grid w-full max-w-6xl gap-6 pb-32 2xl:grid-cols-[1fr_400px]">
      <Card>
        <CardHeader>
          <CardTitle>Parts</CardTitle>
          <CardDescription>
            Song arrangement rows with default performers and placeholder file
            slots for MP3 guides and PDF charts.
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
                <TableHead />
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.parts.map((part) => {
                const files = data.filesByPartId.get(part.id) ?? [];
                const song = data.songById.get(part.song_id);
                const member = part.default_member_id
                  ? data.memberById.get(part.default_member_id)
                  : null;

                return (
                  <TableRow key={part.id}>
                    <TableCell className="font-medium">
                      {song?.title ?? 'Unknown song'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{part.label ?? formatSlot(part.slot)}</span>
                        <span className="text-muted-foreground text-xs">
                          {formatSlot(part.slot)}
                          {part.is_lead ? ' · lead' : ''}
                        </span>
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
                      <div className="flex gap-2">
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
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteButton
                        accountSlug={accountSlug}
                        id={part.id}
                        action={deletePartAction}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreatePartForm data={data} />
    </div>
  );
}

function CreateMemberForm({ accountSlug }: { accountSlug: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add member</CardTitle>
        <CardDescription>
          Candidates can be created now and connected to login later.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={createBandMemberAction} className="flex flex-col gap-3">
          <input type="hidden" name="accountSlug" value={accountSlug} />

          <Input name="display_name" placeholder="Display name" required />
          <Input name="email" type="email" placeholder="Email" required />
          <Input name="role_label" placeholder="Role label" />

          <NativeSelect name="status" defaultValue="candidate">
            {memberStatuses.map((status) => (
              <option key={status} value={status}>
                {formatSlot(status)}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect name="default_instrument" defaultValue="">
            <option value="">No default instrument</option>
            {instrumentSlots.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect name="default_vocal_slot" defaultValue="">
            <option value="">No default vocal slot</option>
            {vocalSlots.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>

          <Button type="submit">
            <PlusCircle data-icon="inline-start" />
            Add member
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateSongForm({ accountSlug }: { accountSlug: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add song</CardTitle>
        <CardDescription>
          Add the tune first, then build its vocal and instrument parts.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={createSongAction} className="flex flex-col gap-3">
          <input type="hidden" name="accountSlug" value={accountSlug} />

          <Input name="title" placeholder="Song title" required />
          <Input
            name="original_artist"
            placeholder="Original artist"
            defaultValue="The Beach Boys"
          />

          <div className="grid grid-cols-3 gap-2">
            <Input name="year_recorded" type="number" placeholder="Year" />
            <Input name="song_key" placeholder="Key" />
            <Input name="bpm" type="number" placeholder="BPM" />
          </div>

          <NativeSelect name="status" defaultValue="learning">
            {songStatuses.map((status) => (
              <option key={status} value={status}>
                {formatSlot(status)}
              </option>
            ))}
          </NativeSelect>

          <Button type="submit">
            <PlusCircle data-icon="inline-start" />
            Add song
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ManageTagsCard({ data }: { data: BandData }) {
  const accountSlug = data.workspace.account.slug;

  return (
    <Card>
      <CardHeader>
        <div className="text-primary flex items-center gap-2">
          <Tags className="size-4" />
          <CardTitle>Tags</CardTitle>
        </div>
        <CardDescription>
          Add eras, themes, or show-planning groups for the song list.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form action={createTagAction} className="flex flex-col gap-3">
          <input type="hidden" name="accountSlug" value={accountSlug} />
          <Input name="display" placeholder="Display name" required />
          <Input name="slug" placeholder="slug-from-display" />
          <Button type="submit">
            <PlusCircle data-icon="inline-start" />
            Add tag
          </Button>
        </form>

        <div className="divide-border divide-y rounded-lg border">
          {data.tags.length > 0 ? (
            data.tags.map((tag) => (
              <div key={tag.id} className="space-y-2 px-3 py-3">
                <form action={updateTagAction} className="grid gap-2">
                  <input type="hidden" name="accountSlug" value={accountSlug} />
                  <input type="hidden" name="id" value={tag.id} />
                  <Input
                    name="display"
                    defaultValue={tag.display}
                    aria-label={`${tag.display} display name`}
                    required
                  />
                  <Input
                    name="slug"
                    defaultValue={tag.slug}
                    aria-label={`${tag.display} slug`}
                    required
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="submit" size="sm" variant="outline">
                      Save
                    </Button>
                  </div>
                </form>

                <div className="flex justify-end">
                  <DeleteButton
                    accountSlug={accountSlug}
                    id={tag.id}
                    action={deleteTagAction}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground px-3 py-4 text-sm">
              No tags yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TagAssignmentForm({
  accountSlug,
  songId,
  tags,
  selectedTagIds,
}: {
  accountSlug: string;
  songId: string;
  tags: BandData['tags'];
  selectedTagIds: Set<string>;
}) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <details className="group">
      <summary className="text-primary cursor-pointer text-xs font-medium marker:text-muted-foreground">
        Edit tags
      </summary>

      <form action={updateSongTagsAction} className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="accountSlug" value={accountSlug} />
        <input type="hidden" name="songId" value={songId} />

        <div className="grid gap-1.5 sm:grid-cols-2">
          {tags.map((tag) => (
            <label
              key={tag.id}
              className="border-input bg-background flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-xs"
            >
              <input
                type="checkbox"
                name="tagId"
                value={tag.id}
                defaultChecked={selectedTagIds.has(tag.id)}
                className="accent-primary"
              />
              <span className="truncate">{tag.display}</span>
            </label>
          ))}
        </div>

        <Button type="submit" size="sm" variant="outline">
          Save tags
        </Button>
      </form>
    </details>
  );
}

function CreatePartForm({ data }: { data: BandData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add part</CardTitle>
        <CardDescription>
          Each new part gets MP3 and PDF placeholders for the upload flow.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={createPartAction} className="flex flex-col gap-3">
          <input
            type="hidden"
            name="accountSlug"
            value={data.workspace.account.slug}
          />

          <NativeSelect name="song_id" required>
            {data.songs.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect name="type" defaultValue="vocal">
            <option value="vocal">Vocal</option>
            <option value="instrumental">Instrumental</option>
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
          </NativeSelect>

          <NativeSelect name="default_member_id" defaultValue="">
            <option value="">Unassigned</option>
            {data.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.display_name}
              </option>
            ))}
          </NativeSelect>

          <Input name="label" placeholder="Part label" />
          <Input name="order_index" type="number" placeholder="Order" />

          <label className="border-input bg-background flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm">
            <input name="is_lead" type="checkbox" className="accent-primary" />
            Lead vocal or featured part
          </label>

          <Button type="submit" disabled={data.songs.length === 0}>
            <PlusCircle data-icon="inline-start" />
            Add part
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function BandQuickLink({
  href,
  icon,
  title,
  description,
  action,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="text-primary flex items-center gap-2">
          {icon}
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button nativeButton={false} render={<Link href={href} />}>
          {action}
        </Button>
      </CardContent>
    </Card>
  );
}

function DeleteButton({
  accountSlug,
  id,
  action,
}: {
  accountSlug: string;
  id: string;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="accountSlug" value={accountSlug} />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="icon" variant="ghost">
        <Trash2 className="size-4" />
        <span className="sr-only">Delete</span>
      </Button>
    </form>
  );
}

function NativeSelect(props: React.ComponentProps<'select'>) {
  return (
    <select
      {...props}
      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none transition-colors focus-visible:ring-3"
    />
  );
}

function StatusBadge({ value }: { value: string }) {
  const variant =
    value === 'active'
      ? 'default'
      : value === 'learning' || value === 'candidate'
        ? 'secondary'
        : 'outline';

  return <Badge variant={variant}>{formatSlot(value)}</Badge>;
}

function formatSlot(value: string | null) {
  if (!value) {
    return 'Unset';
  }

  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

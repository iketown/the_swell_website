import Link from 'next/link';

import {
  ArrowDown,
  ArrowUp,
  FileAudio,
  FileText,
  LibraryBig,
  Music,
  Pencil,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Textarea } from '@kit/ui/textarea';
import { cn } from '@kit/ui/utils';

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
import { BandAdminData } from '../_lib/server/band-admin.loader';

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
const songSortKeys = ['title', 'popularity', 'status', 'key', 'bpm'] as const;
const sortDirections = ['asc', 'desc'] as const;
const tagColorOptions = [
  {
    value: 'teal',
    label: 'Surf Blue',
    className: 'border-[#5baec0] bg-[#c7edf3] text-[#064b5e]',
    swatchClassName: 'bg-[#008aa3]',
  },
  {
    value: 'coral',
    label: 'Sunset Coral',
    className: 'border-[#f18f77] bg-[#ffd3c5] text-[#812c1d]',
    swatchClassName: 'bg-[#f05a3f]',
  },
  {
    value: 'gold',
    label: 'Golden Hour',
    className: 'border-[#e5b322] bg-[#ffeb9f] text-[#654400]',
    swatchClassName: 'bg-[#e6a700]',
  },
  {
    value: 'avocado',
    label: 'Avocado',
    className: 'border-[#9aad3d] bg-[#dfeaa1] text-[#3d4a08]',
    swatchClassName: 'bg-[#718b18]',
  },
  {
    value: 'hibiscus',
    label: 'Hibiscus',
    className: 'border-[#d7759d] bg-[#f6c9dc] text-[#762143]',
    swatchClassName: 'bg-[#c83f77]',
  },
  {
    value: 'driftwood',
    label: 'Driftwood',
    className: 'border-[#b67c57] bg-[#ead3c3] text-[#52301c]',
    swatchClassName: 'bg-[#8a5533]',
  },
] as const;

type SongSortKey = (typeof songSortKeys)[number];
type SortDirection = (typeof sortDirections)[number];

export function BandOverview({ data }: { data: BandData }) {
  const assignedParts = data.parts.filter((part) => part.default_member_id);
  const guideFiles = data.files.filter((file) => file.kind === 'guide_audio');
  const chartFiles = data.files.filter((file) => file.kind === 'chart_pdf');
  const basePath = '/band';

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 pb-32">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Members" value={data.members.length} />
        <MetricCard label="Songs" value={data.songs.length} />
        <MetricCard label="Records" value={data.albums.length} />
        <MetricCard label="Parts" value={data.parts.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
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
          href="/band/albums"
          icon={<LibraryBig />}
          title="Records"
          description="Original album references, cover art, and song links."
          action="Browse records"
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
  basePath,
  selectedTagSlug,
  sortDirection,
  sortKey,
}: {
  data: BandData;
  basePath?: string;
  selectedTagSlug?: string | null;
  sortDirection?: string | null;
  sortKey?: string | null;
}) {
  const accountSlug = data.workspace.account.slug;
  const songListPath = basePath ?? `/home/${accountSlug}/band/songs`;
  const activeSortKey = parseSongSortKey(sortKey);
  const activeSortDirection = parseSortDirection(sortDirection);
  const selectedTag = selectedTagSlug
    ? data.tags.find((tag) => tag.slug === selectedTagSlug)
    : null;
  const filteredSongs = selectedTag
    ? data.songs.filter((song) =>
        (data.tagsBySongId.get(song.id) ?? []).some(
          (tag) => tag.id === selectedTag.id,
        ),
      )
    : data.songs;
  const songs = sortSongs(filteredSongs, activeSortKey, activeSortDirection);
  const createTagFilterPath = (tagSlug?: string | null) =>
    createSongListPath(songListPath, {
      direction: activeSortDirection,
      sort: activeSortKey,
      tag: tagSlug ?? null,
    });

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
              render={<Link href={createTagFilterPath()} />}
              size="sm"
              variant={selectedTag ? 'outline' : 'default'}
            >
              All
            </Button>

            {data.tags.map((tag) => (
              <Link
                key={tag.id}
                href={createTagFilterPath(tag.slug)}
                className={cn(
                  'focus-visible:border-ring focus-visible:ring-ring/50 rounded-4xl transition outline-none focus-visible:ring-3',
                  selectedTag?.id === tag.id && 'ring-ring/30 ring-2',
                )}
              >
                <TagBadge tag={tag} />
              </Link>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <SortableSongHeader
                  basePath={songListPath}
                  currentDirection={activeSortDirection}
                  currentSort={activeSortKey}
                  label="Title"
                  selectedTagSlug={selectedTag?.slug ?? null}
                  sort="title"
                />
                <SortableSongHeader
                  basePath={songListPath}
                  currentDirection={activeSortDirection}
                  currentSort={activeSortKey}
                  label="Status"
                  selectedTagSlug={selectedTag?.slug ?? null}
                  sort="status"
                />
                <SortableSongHeader
                  basePath={songListPath}
                  currentDirection={activeSortDirection}
                  currentSort={activeSortKey}
                  label="Popularity"
                  selectedTagSlug={selectedTag?.slug ?? null}
                  sort="popularity"
                />
                <SortableSongHeader
                  basePath={songListPath}
                  currentDirection={activeSortDirection}
                  currentSort={activeSortKey}
                  label="Key"
                  selectedTagSlug={selectedTag?.slug ?? null}
                  sort="key"
                />
                <SortableSongHeader
                  basePath={songListPath}
                  currentDirection={activeSortDirection}
                  currentSort={activeSortKey}
                  label="BPM"
                  selectedTagSlug={selectedTag?.slug ?? null}
                  sort="bpm"
                />
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
                        <Link
                          href={`/band/songs/${song.slug}`}
                          className="font-medium hover:underline"
                        >
                          {song.title}
                        </Link>
                        <span className="text-muted-foreground text-xs">
                          {song.original_artist ?? 'The Beach Boys'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={song.status} />
                    </TableCell>
                    <TableCell>
                      {song.popularity_rank ? (
                        `#${song.popularity_rank}`
                      ) : (
                        <span className="text-muted-foreground">Unset</span>
                      )}
                    </TableCell>
                    <TableCell>{song.song_key ?? 'Unset'}</TableCell>
                    <TableCell>{song.bpm ?? 'Unset'}</TableCell>
                    <TableCell className="min-w-56">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {songTags.length > 0 ? (
                            songTags.map((tag) => (
                              <TagBadge key={tag.id} tag={tag} />
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
                            selectedTagIds={
                              new Set(songTags.map((tag) => tag.id))
                            }
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

      <CardContent className="flex flex-col gap-4">
        <form action={createTagAction} className="flex flex-col gap-3">
          <input type="hidden" name="accountSlug" value={accountSlug} />
          <Input name="display" placeholder="Display name" required />
          <Input name="slug" placeholder="slug-from-display" />
          <TagColorPicker defaultColor="teal" />
          <Button type="submit">
            <PlusCircle data-icon="inline-start" />
            Add tag
          </Button>
        </form>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
          {data.tags.length > 0 ? (
            data.tags.map((tag) => (
              <TagEditDialog key={tag.id} accountSlug={accountSlug} tag={tag} />
            ))
          ) : (
            <div className="text-muted-foreground col-span-full rounded-lg border px-3 py-4 text-sm">
              No tags yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SortableSongHeader({
  basePath,
  currentDirection,
  currentSort,
  label,
  selectedTagSlug,
  sort,
}: {
  basePath: string;
  currentDirection: SortDirection | null;
  currentSort: SongSortKey | null;
  label: string;
  selectedTagSlug: string | null;
  sort: SongSortKey;
}) {
  const isActive = currentSort === sort;
  const nextDirection: SortDirection =
    isActive && currentDirection === 'asc' ? 'desc' : 'asc';
  const href = createSongListPath(basePath, {
    direction: nextDirection,
    sort,
    tag: selectedTagSlug,
  });
  const Icon = isActive
    ? currentDirection === 'desc'
      ? ArrowDown
      : ArrowUp
    : null;

  return (
    <TableHead>
      <Link
        href={href}
        className={cn(
          'hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 inline-flex items-center gap-1.5 rounded-md py-1 transition outline-none focus-visible:ring-3',
          isActive && 'text-foreground',
        )}
      >
        <span>{label}</span>
        {Icon ? <Icon data-icon="inline-end" /> : null}
      </Link>
    </TableHead>
  );
}

function parseSongSortKey(value?: string | null): SongSortKey | null {
  return songSortKeys.includes(value as SongSortKey)
    ? (value as SongSortKey)
    : null;
}

function parseSortDirection(value?: string | null): SortDirection | null {
  return sortDirections.includes(value as SortDirection)
    ? (value as SortDirection)
    : null;
}

function createSongListPath(
  basePath: string,
  params: {
    direction: SortDirection | null;
    sort: SongSortKey | null;
    tag: string | null;
  },
) {
  const searchParams = new URLSearchParams();

  if (params.tag) {
    searchParams.set('tag', params.tag);
  }

  if (params.sort) {
    searchParams.set('sort', params.sort);
    searchParams.set('dir', params.direction ?? 'asc');
  }

  const query = searchParams.toString();

  return query ? `${basePath}?${query}` : basePath;
}

function sortSongs(
  songs: BandData['songs'],
  sort: SongSortKey | null,
  direction: SortDirection | null,
) {
  if (!sort) {
    return songs;
  }

  const multiplier = direction === 'desc' ? -1 : 1;

  return [...songs].sort((first, second) => {
    if (sort === 'title') {
      return compareStrings(first.title, second.title) * multiplier;
    }

    if (sort === 'status') {
      return compareStrings(first.status, second.status) * multiplier;
    }

    if (sort === 'popularity') {
      return compareNullableNumbers(
        first.popularity_rank,
        second.popularity_rank,
        multiplier,
      );
    }

    if (sort === 'key') {
      return compareNullableStrings(
        first.song_key,
        second.song_key,
        multiplier,
      );
    }

    return compareNullableNumbers(first.bpm, second.bpm, multiplier);
  });
}

function compareStrings(first: string, second: string) {
  return first.localeCompare(second, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function compareNullableStrings(
  first: string | null,
  second: string | null,
  multiplier: number,
) {
  if (!first && !second) {
    return 0;
  }

  if (!first) {
    return 1;
  }

  if (!second) {
    return -1;
  }

  return compareStrings(first, second) * multiplier;
}

function compareNullableNumbers(
  first: number | null,
  second: number | null,
  multiplier: number,
) {
  if (first === null && second === null) {
    return 0;
  }

  if (first === null) {
    return 1;
  }

  if (second === null) {
    return -1;
  }

  return (first - second) * multiplier;
}

function TagEditDialog({
  accountSlug,
  tag,
}: {
  accountSlug: string;
  tag: BandData['tags'][number];
}) {
  const formId = `tag-form-${tag.id}`;
  const formKey = `${tag.id}-${tag.updated_at}`;

  return (
    <Dialog>
      <DialogTrigger className="focus-visible:border-ring focus-visible:ring-ring/50 flex min-w-0 rounded-4xl outline-none focus-visible:ring-3">
        <TagBadge tag={tag} className="h-7 max-w-full px-3 text-sm" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit tag</DialogTitle>
          <DialogDescription>
            Tags can mark eras, themes, show sections, or rehearsal priorities.
          </DialogDescription>
        </DialogHeader>

        <form
          key={formKey}
          id={formId}
          action={updateTagAction}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="accountSlug" value={accountSlug} />
          <input type="hidden" name="id" value={tag.id} />

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Display
            <Input
              name="display"
              defaultValue={tag.display}
              aria-label={`${tag.display} display name`}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Slug
            <Input
              name="slug"
              defaultValue={tag.slug}
              aria-label={`${tag.display} slug`}
              required
            />
          </label>

          <TagColorPicker defaultColor={tag.color} />
        </form>

        <DialogFooter className="sm:items-center sm:justify-between">
          <DeleteButton
            accountSlug={accountSlug}
            id={tag.id}
            action={deleteTagAction}
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>

            <DialogClose render={<Button type="submit" form={formId} />}>
              <Pencil data-icon="inline-start" />
              Save
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TagColorPicker({ defaultColor }: { defaultColor: string }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">Color</legend>

      <div className="grid gap-2 sm:grid-cols-2">
        {tagColorOptions.map((color) => (
          <label
            key={color.value}
            className="border-input bg-background flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-xs"
          >
            <input
              type="radio"
              name="color"
              value={color.value}
              defaultChecked={defaultColor === color.value}
              className="accent-primary"
            />
            <span
              className={cn(
                'size-3 shrink-0 rounded-full border',
                color.swatchClassName,
              )}
            />
            <span className="truncate">{color.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
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
      <summary className="text-primary marker:text-muted-foreground cursor-pointer text-xs font-medium">
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
              <span
                className={cn(
                  'size-2.5 shrink-0 rounded-full border',
                  getTagColor(tag.color).swatchClassName,
                )}
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
          Create the assignment lane first, then upload its MP3 or PDF files.
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
            {data.members.map((member) => (
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

function TagBadge({
  tag,
  className,
}: {
  tag: BandData['tags'][number];
  className?: string;
}) {
  const color = getTagColor(tag.color);

  return (
    <Badge
      variant="outline"
      className={cn('border px-2.5', color.className, className)}
    >
      {tag.display}
    </Badge>
  );
}

function getTagColor(color: string | null) {
  return (
    tagColorOptions.find((option) => option.value === color) ??
    tagColorOptions[0]
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
      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm transition-colors outline-none focus-visible:ring-3"
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

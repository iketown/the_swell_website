'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import {
  Check,
  GripVertical,
  Settings2,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { toast } from '@kit/ui/sonner';
import { cn } from '@kit/ui/utils';

import {
  assignSongPartAssetAction,
  removeSongPartAssetAction,
  removeSongPartAssignmentAction,
  shareSongPartAssetAction,
  unshareSongPartAssetAction,
} from '~/home/[account]/band/_lib/server/band-admin.actions';

import { PartFileBadge } from '../../../_components/part-file-badge';

type AssignmentArea = 'vocal' | 'instrumental';
type AssetDefaultArea = AssignmentArea | 'shared';
type AssetKind = 'guide_audio' | 'chart_pdf';

type Member = {
  display_name: string;
  id: string;
};

type SongPartAsset = {
  default_area: AssetDefaultArea | null;
  description: string | null;
  id: string;
  kind: AssetKind;
  signedUrl: string | null;
  title: string;
};

type SongPartAssignment = {
  area: AssignmentArea;
  asset_id: string;
  id: string;
  member_id: string;
};

type PendingAssetRemoval = {
  asset: SongPartAsset;
  memberNames: string[];
};

const dragDataType = 'application/x-swell-song-part-asset-id';
const assignmentDragDataType = 'application/x-swell-song-part-assignment-id';
const sharedDragDataType = 'application/x-swell-shared-song-part-asset-id';
const memberDragDataType = 'application/x-swell-member-id';
const memberOrderStorageKey = 'swell-band:member-order';
const areas = [
  ['vocal', 'Vocal'],
  ['instrumental', 'Instrumental'],
] as const;

export function SongPartAssignmentGrid({
  accountSlug,
  assignments,
  assets,
  members,
  songId,
  songTitle,
}: {
  accountSlug: string;
  assignments: SongPartAssignment[];
  assets: SongPartAsset[];
  members: Member[];
  songId: string;
  songTitle: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);
  const [isTrashOver, setIsTrashOver] = useState(false);
  const [pendingSharedAssignmentAsset, setPendingSharedAssignmentAsset] =
    useState<SongPartAsset | null>(null);
  const [pendingAssetRemoval, setPendingAssetRemoval] =
    useState<PendingAssetRemoval | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [memberOrderIds, setMemberOrderIds] = useState<string[]>(() =>
    members.map((member) => member.id),
  );
  const [visibleMemberIds, setVisibleMemberIds] = useState<string[]>(() =>
    members.map((member) => member.id),
  );
  const legacyStorageKey = `swell-song-grid:${songId}:members`;
  const visibleMembersStorageKey = `swell-song-grid:${songId}:visible-members`;

  useEffect(() => {
    const availableIds = new Set(members.map((member) => member.id));
    const allMemberIds = members.map((member) => member.id);

    try {
      const savedGlobalOrder = parseStringArray(
        window.localStorage.getItem(memberOrderStorageKey),
      );
      const savedVisibleMembers = parseStringArray(
        window.localStorage.getItem(visibleMembersStorageKey),
      );
      const savedLegacySettings = window.localStorage.getItem(legacyStorageKey);
      let nextOrderIds =
        savedGlobalOrder && savedGlobalOrder.length > 0
          ? mergeKnownMemberIds(savedGlobalOrder, allMemberIds, availableIds)
          : null;
      let nextVisibleIds =
        savedVisibleMembers && savedVisibleMembers.length > 0
          ? savedVisibleMembers.filter((id) => availableIds.has(id))
          : null;

      if (savedLegacySettings) {
        const parsed = JSON.parse(savedLegacySettings) as unknown;

        if (Array.isArray(parsed)) {
          const savedIds = parsed.filter(
            (value): value is string => typeof value === 'string',
          );
          const legacyVisibleIds = savedIds.filter((id) =>
            availableIds.has(id),
          );

          nextVisibleIds ??= legacyVisibleIds;
          nextOrderIds ??= mergeKnownMemberIds(
            legacyVisibleIds,
            allMemberIds,
            availableIds,
          );
        } else if (isSavedMemberSettings(parsed)) {
          const legacyVisibleIds = parsed.visibleMemberIds.filter((id) =>
            availableIds.has(id),
          );
          const legacyOrderIds = parsed.memberOrderIds.filter((id) =>
            availableIds.has(id),
          );

          nextVisibleIds ??= legacyVisibleIds;
          nextOrderIds ??= mergeKnownMemberIds(
            legacyOrderIds,
            allMemberIds,
            availableIds,
          );
        }
      }

      if (nextVisibleIds && nextVisibleIds.length > 0) {
        setVisibleMemberIds(nextVisibleIds);
      }

      if (nextOrderIds && nextOrderIds.length > 0) {
        setMemberOrderIds(nextOrderIds);
      }
    } catch {
      window.localStorage.removeItem(legacyStorageKey);
      window.localStorage.removeItem(visibleMembersStorageKey);
    }

    setSettingsLoaded(true);
  }, [legacyStorageKey, members, visibleMembersStorageKey]);

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    window.localStorage.setItem(
      memberOrderStorageKey,
      JSON.stringify(memberOrderIds),
    );
  }, [memberOrderIds, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    window.localStorage.setItem(
      visibleMembersStorageKey,
      JSON.stringify(visibleMemberIds),
    );
  }, [settingsLoaded, visibleMemberIds, visibleMembersStorageKey]);

  const assetById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );
  const orderedMembers = useMemo(() => {
    const ordered = memberOrderIds
      .map((memberId) => memberById.get(memberId))
      .filter((member): member is Member => Boolean(member));
    const orderedIds = new Set(ordered.map((member) => member.id));

    return [
      ...ordered,
      ...members.filter((member) => !orderedIds.has(member.id)),
    ];
  }, [memberById, memberOrderIds, members]);

  const assignmentCountByAssetId = useMemo(() => {
    const counts = new Map<string, number>();

    for (const assignment of assignments) {
      counts.set(
        assignment.asset_id,
        (counts.get(assignment.asset_id) ?? 0) + 1,
      );
    }

    return counts;
  }, [assignments]);
  const assignmentMemberNamesByAssetId = useMemo(() => {
    const namesByAssetId = new Map<string, string[]>();

    for (const assignment of assignments) {
      const member = memberById.get(assignment.member_id);

      if (!member) {
        continue;
      }

      const existing = namesByAssetId.get(assignment.asset_id) ?? [];
      namesByAssetId.set(assignment.asset_id, [
        ...existing,
        member.display_name,
      ]);
    }

    return namesByAssetId;
  }, [assignments, memberById]);

  const assignmentsByCell = useMemo(() => {
    const grouped = new Map<string, SongPartAssignment[]>();

    for (const assignment of assignments) {
      const key = getCellKey(assignment.member_id, assignment.area);
      const existing = grouped.get(key) ?? [];
      grouped.set(key, [...existing, assignment]);
    }

    return grouped;
  }, [assignments]);

  const visibleMembers = orderedMembers.filter((member) =>
    visibleMemberIds.includes(member.id),
  );
  const sharedAssets = assets.filter((asset) => asset.default_area === 'shared');
  const assignedAssets = assets.filter(
    (asset) =>
      asset.default_area === 'shared' ||
      (assignmentCountByAssetId.get(asset.id) ?? 0) > 0,
  );
  const unassignedAssets = assets.filter(
    (asset) =>
      asset.default_area !== 'shared' &&
      (assignmentCountByAssetId.get(asset.id) ?? 0) === 0,
  );

  function toggleMember(memberId: string) {
    setVisibleMemberIds((current) => {
      if (current.includes(memberId)) {
        return current.filter((id) => id !== memberId);
      }

      return [...current, memberId];
    });
  }

  function moveMember(memberId: string, targetMemberId: string) {
    if (memberId === targetMemberId) {
      return;
    }

    setMemberOrderIds((current) => {
      const fullOrder = [
        ...current.filter((id) => memberById.has(id)),
        ...members
          .map((member) => member.id)
          .filter((id) => !current.includes(id)),
      ];
      const fromIndex = fullOrder.indexOf(memberId);
      const toIndex = fullOrder.indexOf(targetMemberId);

      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }

      const nextOrder = [...fullOrder];
      const [movedMemberId] = nextOrder.splice(fromIndex, 1);

      if (!movedMemberId) {
        return current;
      }

      nextOrder.splice(toIndex, 0, movedMemberId);

      return nextOrder;
    });
  }

  function assignAsset({
    area,
    assetId,
    memberId,
  }: {
    area: AssignmentArea;
    assetId: string;
    memberId: string;
  }) {
    const asset = assetById.get(assetId);

    if (asset?.default_area === 'shared') {
      setPendingSharedAssignmentAsset(asset);
      return;
    }

    setError(null);
    startTransition(() => {
      void assignSongPartAssetAction({
        accountSlug,
        area,
        assetId,
        memberId,
        songId,
      })
        .then(() => {
          router.refresh();
        })
        .catch((reason: unknown) => {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Could not assign that file.',
          );
        });
    });
  }

  function shareAsset(assetId: string) {
    setError(null);
    startTransition(() => {
      void shareSongPartAssetAction({
        accountSlug,
        assetId,
        songId,
      })
        .then(() => {
          router.refresh();
        })
        .catch((reason: unknown) => {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Could not assign that file to ALL.',
          );
        });
    });
  }

  function removeAssignment(assignmentId: string) {
    setError(null);
    startTransition(() => {
      void removeSongPartAssignmentAction({
        accountSlug,
        assignmentId,
      })
        .then(() => {
          router.refresh();
        })
        .catch((reason: unknown) => {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Could not remove that assignment.',
          );
        });
    });
  }

  function unshareAsset(assetId: string) {
    setError(null);
    startTransition(() => {
      void unshareSongPartAssetAction({
        accountSlug,
        assetId,
        songId,
      })
        .then(() => {
          router.refresh();
        })
        .catch((reason: unknown) => {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Could not move that file back to unassigned.',
          );
        });
    });
  }

  function removeAsset(assetId: string) {
    const assetTitle = assetById.get(assetId)?.title ?? 'File';

    setError(null);
    startTransition(() => {
      void removeSongPartAssetAction({
        accountSlug,
        assetId,
      })
        .then(() => {
          setPendingAssetRemoval(null);
          toast.success(`'${assetTitle}' has been removed from '${songTitle}'`);
          router.refresh();
        })
        .catch((reason: unknown) => {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Could not remove that file.',
          );
        });
    });
  }

  function handleTrashDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsTrashOver(false);

    const sharedAssetId = event.dataTransfer.getData(sharedDragDataType);

    if (sharedAssetId) {
      unshareAsset(sharedAssetId);
      return;
    }

    const assignmentId = event.dataTransfer.getData(assignmentDragDataType);

    if (assignmentId) {
      removeAssignment(assignmentId);
      return;
    }

    const assetId =
      event.dataTransfer.getData(dragDataType) ||
      event.dataTransfer.getData('text/plain');
    const asset = assetById.get(assetId);

    if (!asset) {
      return;
    }

    const memberNames = assignmentMemberNamesByAssetId.get(asset.id) ?? [];

    if (memberNames.length > 0) {
      setPendingAssetRemoval({ asset, memberNames });
      return;
    }

    removeAsset(asset.id);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger render={<Button type="button" variant="outline" />}>
            <Settings2 data-icon="inline-start" />
            Members
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Shown members</DialogTitle>
              <DialogDescription>
                Choose which members appear in this song view.
              </DialogDescription>
            </DialogHeader>
            <div className="grid max-h-80 gap-2 overflow-auto pr-1">
              {orderedMembers.map((member) => {
                const checked = visibleMemberIds.includes(member.id);

                return (
                  <SortableMemberRow
                    checked={checked}
                    key={member.id}
                    member={member}
                    onDropMember={moveMember}
                    onToggle={() => toggleMember(member.id)}
                  />
                );
              })}
            </div>
            <DialogFooter>
              <Button
                onClick={() =>
                  setVisibleMemberIds(members.map((member) => member.id))
                }
                type="button"
                variant="outline"
              >
                <SlidersHorizontal data-icon="inline-start" />
                Show all
              </Button>
              <DialogClose render={<Button type="button" />}>
                Done
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border-input overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-px pr-8 whitespace-nowrap">
                Member
              </TableHead>
              <TableHead>Vocal</TableHead>
              <TableHead>Instrumental</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="w-px pr-8 align-top font-medium whitespace-nowrap">
                ALL
              </TableCell>
              <TableCell className="align-top" colSpan={2}>
                <SharedDropTarget
                  assets={sharedAssets}
                  hoveredAssetId={hoveredAssetId}
                  isPending={isPending}
                  onHoverAsset={setHoveredAssetId}
                  onShare={shareAsset}
                />
              </TableCell>
            </TableRow>

            {visibleMembers.length > 0 ? (
              visibleMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="w-px pr-8 align-top font-medium whitespace-nowrap">
                    {member.display_name}
                  </TableCell>
                  {areas.map(([area]) => (
                    <TableCell className="align-top" key={area}>
                      <AssignmentDropTarget
                        area={area}
                        assetById={assetById}
                        assignments={
                          assignmentsByCell.get(getCellKey(member.id, area)) ??
                          []
                        }
                        hoveredAssetId={hoveredAssetId}
                        isPending={isPending}
                        memberId={member.id}
                        onAssign={assignAsset}
                        onRemove={removeAssignment}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="text-muted-foreground text-sm"
                  colSpan={3}
                >
                  No members are shown.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem]">
        <PartPool
          assets={unassignedAssets}
          assignmentCountByAssetId={assignmentCountByAssetId}
          emptyText="No unassigned files."
          onHoverAsset={setHoveredAssetId}
          title="Unassigned"
          tone="available"
        />
        <PartPool
          assets={assignedAssets}
          assignmentCountByAssetId={assignmentCountByAssetId}
          emptyText="No assigned files yet."
          onHoverAsset={setHoveredAssetId}
          title="Assigned"
          tone="assigned"
        />
        <TrashDropZone
          isOver={isTrashOver}
          onDragLeave={() => setIsTrashOver(false)}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setIsTrashOver(true);
          }}
          onDrop={handleTrashDrop}
        />
      </div>

      <Dialog
        open={Boolean(pendingAssetRemoval)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAssetRemoval(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove file?</DialogTitle>
            <DialogDescription>
              {pendingAssetRemoval
                ? `${pendingAssetRemoval.asset.title} will be removed from parts ${formatMemberList(
                    pendingAssetRemoval.memberNames,
                  )}.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              data-swell-tone="danger"
              disabled={isPending}
              onClick={() => {
                if (pendingAssetRemoval) {
                  removeAsset(pendingAssetRemoval.asset.id);
                }
              }}
              type="button"
              variant="outline"
            >
              <Trash2 data-icon="inline-start" />
              Remove file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingSharedAssignmentAsset)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingSharedAssignmentAsset(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Already assigned to ALL</DialogTitle>
            <DialogDescription>
              {pendingSharedAssignmentAsset
                ? `${pendingSharedAssignmentAsset.title} is already assigned to ALL.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" />}>OK</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableMemberRow({
  checked,
  member,
  onDropMember,
  onToggle,
}: {
  checked: boolean;
  member: Member;
  onDropMember: (memberId: string, targetMemberId: string) => void;
  onToggle: () => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={cn(
        'border-input bg-background hover:bg-muted/40 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
        isDragOver && 'border-primary bg-primary/5',
      )}
      onDragLeave={() => setIsDragOver(false)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        const draggedMemberId = event.dataTransfer.getData(memberDragDataType);

        if (!draggedMemberId) {
          return;
        }

        onDropMember(draggedMemberId, member.id);
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          aria-label={`Reorder ${member.display_name}`}
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 inline-flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md outline-none active:cursor-grabbing focus-visible:ring-3"
          draggable
          onDragEnd={() => setIsDragOver(false)}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData(memberDragDataType, member.id);
          }}
          type="button"
        >
          <GripVertical className="size-4" />
        </button>

        <span className="truncate font-medium">{member.display_name}</span>
      </div>

      <label className="relative flex size-5 shrink-0 items-center justify-center">
        <span className="sr-only">
          {checked ? 'Hide' : 'Show'} {member.display_name}
        </span>
        <input
          checked={checked}
          className="peer absolute inset-0 cursor-pointer opacity-0"
          onChange={onToggle}
          type="checkbox"
        />
        <span className="border-input peer-focus-visible:border-ring peer-focus-visible:ring-ring/50 flex size-5 items-center justify-center rounded border peer-focus-visible:ring-3">
          {checked ? <Check className="size-3.5" /> : null}
        </span>
      </label>
    </div>
  );
}

function SharedDropTarget({
  assets,
  hoveredAssetId,
  isPending,
  onHoverAsset,
  onShare,
}: {
  assets: SongPartAsset[];
  hoveredAssetId: string | null;
  isPending: boolean;
  onHoverAsset: (assetId: string | null) => void;
  onShare: (assetId: string) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      className={cn(
        'border-input bg-secondary/20 flex min-h-14 flex-wrap items-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 transition-colors',
        isOver && 'border-primary bg-primary/5',
      )}
      onDragLeave={() => setIsOver(false)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        const assetId =
          event.dataTransfer.getData(dragDataType) ||
          event.dataTransfer.getData('text/plain');

        if (!assetId) {
          return;
        }

        onShare(assetId);
      }}
    >
      {assets.length > 0 ? (
        assets.map((asset) => (
          <SharedBadge
            asset={asset}
            highlighted={hoveredAssetId === asset.id}
            isPending={isPending}
            key={asset.id}
            onHover={onHoverAsset}
          />
        ))
      ) : (
        <span className="text-muted-foreground text-sm">
          Drop files here for every member.
        </span>
      )}
    </div>
  );
}

function AssignmentDropTarget({
  area,
  assetById,
  assignments,
  hoveredAssetId,
  isPending,
  memberId,
  onAssign,
  onRemove,
}: {
  area: AssignmentArea;
  assetById: Map<string, SongPartAsset>;
  assignments: SongPartAssignment[];
  hoveredAssetId: string | null;
  isPending: boolean;
  memberId: string;
  onAssign: (input: {
    area: AssignmentArea;
    assetId: string;
    memberId: string;
  }) => void;
  onRemove: (assignmentId: string) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      className={cn(
        'border-input bg-muted/20 flex min-h-14 flex-wrap items-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 transition-colors',
        isOver && 'border-primary bg-primary/5',
      )}
      onDragLeave={() => setIsOver(false)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setIsOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        const assetId =
          event.dataTransfer.getData(dragDataType) ||
          event.dataTransfer.getData('text/plain');

        if (!assetId || !assetById.has(assetId)) {
          return;
        }

        onAssign({ area, assetId, memberId });
      }}
    >
      {assignments.map((assignment) => {
        const asset = assetById.get(assignment.asset_id);

        if (!asset) {
          return null;
        }

        return (
          <AssignedBadge
            asset={asset}
            assignmentId={assignment.id}
            highlighted={hoveredAssetId === asset.id}
            isPending={isPending}
            key={assignment.id}
            onRemove={() => onRemove(assignment.id)}
          />
        );
      })}
    </div>
  );
}

function PartPool({
  assets,
  assignmentCountByAssetId,
  emptyText,
  onHoverAsset,
  title,
  tone,
}: {
  assets: SongPartAsset[];
  assignmentCountByAssetId: Map<string, number>;
  emptyText: string;
  onHoverAsset: (assetId: string | null) => void;
  title: string;
  tone: 'assigned' | 'available';
}) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="border-input bg-muted/20 flex min-h-28 flex-wrap content-start gap-2 rounded-lg border p-3">
        {assets.length > 0 ? (
          assets.map((asset) => (
            <DraggablePoolBadge
              asset={asset}
              count={assignmentCountByAssetId.get(asset.id) ?? 0}
              key={asset.id}
              onHover={onHoverAsset}
              tone={tone}
            />
          ))
        ) : (
          <span className="text-muted-foreground text-sm">{emptyText}</span>
        )}
      </div>
    </section>
  );
}

function TrashDropZone({
  isOver,
  onDragLeave,
  onDragOver,
  onDrop,
}: {
  isOver: boolean;
  onDragLeave: () => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold">Trash</h4>
      <div
        className={cn(
          'border-input text-muted-foreground flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 p-3 text-center text-xs transition-colors',
          isOver && 'border-destructive bg-destructive/10 text-destructive',
        )}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <Trash2 className="size-6" />
        <span>Drop to remove</span>
      </div>
    </section>
  );
}

function DraggablePoolBadge({
  asset,
  count,
  onHover,
  tone,
}: {
  asset: SongPartAsset;
  count: number;
  onHover: (assetId: string | null) => void;
  tone: 'assigned' | 'available';
}) {
  return (
    <PartFileBadge
      className="cursor-grab active:cursor-grabbing"
      count={count}
      draggable
      kind={asset.kind}
      label={asset.title}
      labelClassName="max-w-52"
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'copyMove';
        event.dataTransfer.setData(dragDataType, asset.id);
        event.dataTransfer.setData('text/plain', asset.id);
      }}
      onMouseEnter={() => onHover(asset.id)}
      onMouseLeave={() => onHover(null)}
      previewUrl={asset.signedUrl}
      tone={tone}
      tooltip={asset.description ?? asset.title}
      variant="outline"
    />
  );
}

function AssignedBadge({
  asset,
  assignmentId,
  highlighted,
  isPending,
  onRemove,
}: {
  asset: SongPartAsset;
  assignmentId: string;
  highlighted: boolean;
  isPending: boolean;
  onRemove: () => void;
}) {
  return (
    <PartFileBadge
      className="transition"
      draggable
      kind={asset.kind}
      label={asset.title}
      labelClassName="max-w-44"
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'copyMove';
        event.dataTransfer.setData(assignmentDragDataType, assignmentId);
        event.dataTransfer.setData(dragDataType, asset.id);
        event.dataTransfer.setData('text/plain', asset.id);
      }}
      previewUrl={asset.signedUrl}
      tone={highlighted ? 'highlighted' : 'assigned'}
      tooltip={asset.description ?? asset.title}
      variant="outline"
    >
      <button
        aria-label={`Remove ${asset.title}`}
        className="hover:bg-muted ml-0.5 inline-flex size-5 items-center justify-center rounded-full"
        disabled={isPending}
        onClick={onRemove}
        type="button"
      >
        <X className="size-3.5" />
      </button>
    </PartFileBadge>
  );
}

function SharedBadge({
  asset,
  highlighted,
  isPending,
  onHover,
}: {
  asset: SongPartAsset;
  highlighted: boolean;
  isPending: boolean;
  onHover: (assetId: string | null) => void;
}) {
  return (
    <PartFileBadge
      className="cursor-grab transition active:cursor-grabbing"
      draggable={!isPending}
      kind={asset.kind}
      label={asset.title}
      labelClassName="max-w-52"
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'copyMove';
        event.dataTransfer.setData(sharedDragDataType, asset.id);
        event.dataTransfer.setData(dragDataType, asset.id);
        event.dataTransfer.setData('text/plain', asset.id);
      }}
      onMouseEnter={() => onHover(asset.id)}
      onMouseLeave={() => onHover(null)}
      previewUrl={asset.signedUrl}
      tone={highlighted ? 'highlighted' : 'assigned'}
      tooltip={asset.description ?? asset.title}
      variant="outline"
    />
  );
}

function getCellKey(memberId: string, area: AssignmentArea) {
  return `${memberId}:${area}`;
}

function formatMemberList(memberNames: string[]) {
  if (memberNames.length <= 2) {
    return memberNames.join(' and ');
  }

  return `${memberNames.slice(0, -1).join(', ')} and ${
    memberNames[memberNames.length - 1]
  }`;
}

function mergeKnownMemberIds(
  savedIds: string[],
  allMemberIds: string[],
  availableIds: Set<string>,
) {
  const knownSavedIds = savedIds.filter((id) => availableIds.has(id));

  return [
    ...knownSavedIds,
    ...allMemberIds.filter((id) => !knownSavedIds.includes(id)),
  ];
}

function parseStringArray(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return null;
  }
}

function isSavedMemberSettings(
  value: unknown,
): value is { memberOrderIds: string[]; visibleMemberIds: string[] } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    memberOrderIds?: unknown;
    visibleMemberIds?: unknown;
  };

  return (
    Array.isArray(candidate.memberOrderIds) &&
    candidate.memberOrderIds.every((id) => typeof id === 'string') &&
    Array.isArray(candidate.visibleMemberIds) &&
    candidate.visibleMemberIds.every((id) => typeof id === 'string')
  );
}

'use client';

import { useState } from 'react';

import { Pencil, PlusCircle, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
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
import { cn } from '@kit/ui/utils';

import type { Database } from '~/lib/database.types';

import {
  createBandMemberAction,
  deleteBandMemberAction,
  updateBandMemberAction,
} from '../_lib/server/band-admin.actions';

type MemberRow = Database['public']['Tables']['members']['Row'];

type MemberEditor =
  | {
      mode: 'create';
    }
  | {
      mode: 'edit';
      member: MemberRow;
    };

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

const memberStatuses = ['candidate', 'active', 'inactive', 'alumni'] as const;

export function MembersAdmin({
  accountSlug,
  assignedPartCountsByMemberId,
  members,
}: {
  accountSlug: string;
  assignedPartCountsByMemberId: Record<string, number>;
  members: MemberRow[];
}) {
  const [editor, setEditor] = useState<MemberEditor | null>(null);

  return (
    <div
      className={cn(
        'grid w-full max-w-6xl gap-6 pb-32',
        editor && 'xl:grid-cols-[1fr_360px]',
      )}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Band members</CardTitle>
              <CardDescription>
                Performer roster, candidates, and the first pass at home parts.
              </CardDescription>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => setEditor({ mode: 'create' })}
            >
              <PlusCircle data-icon="inline-start" />
              Add member
            </Button>
          </div>
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
              {members.map((member) => (
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
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        aria-label={`Edit ${member.display_name}`}
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setEditor({ mode: 'edit', member })}
                      >
                        <Pencil />
                      </Button>

                      <DeleteButton
                        accountSlug={accountSlug}
                        assignedPartsCount={
                          assignedPartCountsByMemberId[member.id] ?? 0
                        }
                        id={member.id}
                        memberName={member.display_name}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editor && (
        <MemberForm
          key={editor.mode === 'edit' ? editor.member.id : 'create'}
          accountSlug={accountSlug}
          editor={editor}
          onCancel={() => setEditor(null)}
          onSaved={() => setEditor(null)}
        />
      )}
    </div>
  );
}

function MemberForm({
  accountSlug,
  editor,
  onCancel,
  onSaved,
}: {
  accountSlug: string;
  editor: MemberEditor;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const member = editor.mode === 'edit' ? editor.member : null;

  const action = async (formData: FormData) => {
    if (editor.mode === 'edit') {
      await updateBandMemberAction(formData);
    } else {
      await createBandMemberAction(formData);
    }

    onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {editor.mode === 'edit' ? 'Edit member' : 'Add member'}
        </CardTitle>
        <CardDescription>
          {editor.mode === 'edit'
            ? 'Update roster details and home part defaults.'
            : 'Candidates can be created now and connected to login later.'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="accountSlug" value={accountSlug} />

          {member && <input type="hidden" name="id" value={member.id} />}

          <Input
            name="display_name"
            placeholder="Display name"
            defaultValue={member?.display_name ?? ''}
            required
          />
          <Input
            name="email"
            type="email"
            placeholder="Email"
            defaultValue={member?.email ?? ''}
            required
          />
          <Input
            name="role_label"
            placeholder="Role label"
            defaultValue={member?.role_label ?? ''}
          />

          <NativeSelect
            name="status"
            defaultValue={member?.status ?? 'candidate'}
          >
            {memberStatuses.map((status) => (
              <option key={status} value={status}>
                {formatSlot(status)}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            name="default_instrument"
            defaultValue={member?.default_instrument ?? ''}
          >
            <option value="">No default instrument</option>
            {instrumentSlots.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            name="default_vocal_slot"
            defaultValue={member?.default_vocal_slot ?? ''}
          >
            <option value="">No default vocal slot</option>
            {vocalSlots.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DeleteButton({
  accountSlug,
  assignedPartsCount,
  id,
  memberName,
}: {
  accountSlug: string;
  assignedPartsCount: number;
  id: string;
  memberName: string;
}) {
  const partLabel = assignedPartsCount === 1 ? 'part' : 'parts';

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            aria-label={`Delete ${memberName}`}
            data-swell-tone="danger"
            type="button"
            size="icon"
            variant="outline"
          >
            <Trash2 />
          </Button>
        }
      />

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {memberName}?</AlertDialogTitle>
          <AlertDialogDescription>
            {assignedPartsCount > 0
              ? `This will remove ${memberName} from ${assignedPartsCount} assigned ${partLabel}.`
              : `${memberName} is not assigned to any parts.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>

          <form action={deleteBandMemberAction}>
            <input type="hidden" name="accountSlug" value={accountSlug} />
            <input type="hidden" name="id" value={id} />
            <AlertDialogAction
              data-swell-tone="danger"
              type="submit"
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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

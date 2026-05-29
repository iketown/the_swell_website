'use server';

import { revalidatePath } from 'next/cache';

import * as z from 'zod';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';
import { Database } from '~/lib/database.types';

type InstrumentSlot = Database['public']['Enums']['instrument_slot'];
type VocalSlot = Database['public']['Enums']['vocal_slot'];
type PartSlot = Database['public']['Enums']['part_slot'];
type PartType = Database['public']['Enums']['part_type'];

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const optionalString = z.preprocess(
  emptyToNull,
  z.string().trim().min(1).nullable(),
);

const optionalInt = z.preprocess((value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  return Number(value);
}, z.number().int().nullable());

const AccountSlugSchema = z.object({
  accountSlug: z.string().min(1),
});

const CreateMemberSchema = AccountSlugSchema.extend({
  display_name: z.string().trim().min(1),
  email: z.string().trim().email(),
  status: z.enum(['candidate', 'active', 'inactive', 'alumni']),
  role_label: optionalString,
  default_instrument: z.preprocess(
    emptyToNull,
    z.enum(['rhy_gtr', 'lead_gtr', 'keys', 'bass', 'drums']).nullable(),
  ),
  default_vocal_slot: z.preprocess(
    emptyToNull,
    z.enum(['vocal_1', 'vocal_2', 'vocal_3', 'vocal_4', 'vocal_5']).nullable(),
  ),
});

const UpdateMemberSchema = CreateMemberSchema.extend({
  id: z.string().uuid(),
});

const CreateSongSchema = AccountSlugSchema.extend({
  title: z.string().trim().min(1),
  original_artist: optionalString.default('The Beach Boys'),
  year_recorded: optionalInt,
  song_key: optionalString,
  bpm: optionalInt,
  era: optionalString,
  status: z.enum(['active', 'learning', 'candidate', 'retired']),
});

const CreatePartSchema = AccountSlugSchema.extend({
  song_id: z.string().uuid(),
  type: z.enum(['vocal', 'instrumental']),
  slot: z.enum([
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
  ]),
  default_member_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  label: optionalString,
  is_lead: z.preprocess((value) => value === 'on', z.boolean()),
  order_index: optionalInt,
});

const DeleteRecordSchema = AccountSlugSchema.extend({
  id: z.string().uuid(),
});

export async function createBandMemberAction(formData: FormData) {
  const data = CreateMemberSchema.parse(Object.fromEntries(formData));
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const instrumentCapabilities = data.default_instrument
    ? [data.default_instrument]
    : [];
  const vocalCapabilities = data.default_vocal_slot
    ? [data.default_vocal_slot]
    : [];

  const { error } = await client.from('members').insert({
    account_id: accountId,
    account_role: 'member',
    status: data.status,
    display_name: data.display_name,
    email: data.email,
    role_label: data.role_label,
    default_instrument: data.default_instrument as InstrumentSlot | null,
    default_vocal_slot: data.default_vocal_slot as VocalSlot | null,
    instrument_capabilities: instrumentCapabilities as InstrumentSlot[],
    vocal_capabilities: vocalCapabilities as VocalSlot[],
  });

  if (error) {
    throw error;
  }

  revalidateBand(accountSlug);
}

export async function updateBandMemberAction(formData: FormData) {
  const data = UpdateMemberSchema.parse(Object.fromEntries(formData));
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const instrumentCapabilities = data.default_instrument
    ? [data.default_instrument]
    : [];
  const vocalCapabilities = data.default_vocal_slot
    ? [data.default_vocal_slot]
    : [];

  const { error } = await client
    .from('members')
    .update({
      status: data.status,
      display_name: data.display_name,
      email: data.email,
      role_label: data.role_label,
      default_instrument: data.default_instrument as InstrumentSlot | null,
      default_vocal_slot: data.default_vocal_slot as VocalSlot | null,
      instrument_capabilities: instrumentCapabilities as InstrumentSlot[],
      vocal_capabilities: vocalCapabilities as VocalSlot[],
    })
    .eq('account_id', accountId)
    .eq('id', data.id);

  if (error) {
    throw error;
  }

  revalidateBand(accountSlug);
}

export async function createSongAction(formData: FormData) {
  const data = CreateSongSchema.parse(Object.fromEntries(formData));
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const { error } = await client.from('songs').insert({
    account_id: accountId,
    title: data.title,
    original_artist: data.original_artist ?? 'The Beach Boys',
    year_recorded: data.year_recorded,
    song_key: data.song_key,
    bpm: data.bpm,
    era: data.era,
    status: data.status,
  });

  if (error) {
    throw error;
  }

  revalidateBand(accountSlug);
}

export async function createPartAction(formData: FormData) {
  const data = CreatePartSchema.parse(Object.fromEntries(formData));
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  validatePartSlot(data.type, data.slot);

  const { data: part, error } = await client
    .from('parts')
    .insert({
      account_id: accountId,
      song_id: data.song_id,
      type: data.type as PartType,
      slot: data.slot as PartSlot,
      default_member_id: data.default_member_id,
      label: data.label,
      is_lead: data.is_lead,
      order_index: data.order_index ?? 0,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  const label = data.label ?? data.slot.replace('_', ' ');
  const storageBase = `${accountId}/parts/${part.id}`;

  const { error: filesError } = await client.from('part_files').insert([
    {
      account_id: accountId,
      part_id: part.id,
      kind: 'guide_audio',
      label: `${label} guide`,
      storage_path: `${storageBase}/guide.mp3`,
      mime_type: 'audio/mpeg',
      size_bytes: 1,
      order_index: 0,
    },
    {
      account_id: accountId,
      part_id: part.id,
      kind: 'chart_pdf',
      label: `${label} chart`,
      storage_path: `${storageBase}/chart.pdf`,
      mime_type: 'application/pdf',
      size_bytes: 1,
      order_index: 1,
    },
  ]);

  if (filesError) {
    throw filesError;
  }

  revalidateBand(accountSlug);
}

export async function deleteBandMemberAction(formData: FormData) {
  const data = DeleteRecordSchema.parse(Object.fromEntries(formData));
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const { error } = await client
    .from('members')
    .delete()
    .eq('account_id', accountId)
    .eq('id', data.id);

  if (error) {
    throw error;
  }

  revalidateBand(accountSlug);
}

export async function deleteSongAction(formData: FormData) {
  const data = DeleteRecordSchema.parse(Object.fromEntries(formData));
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const { error } = await client
    .from('songs')
    .delete()
    .eq('account_id', accountId)
    .eq('id', data.id);

  if (error) {
    throw error;
  }

  revalidateBand(accountSlug);
}

export async function deletePartAction(formData: FormData) {
  const data = DeleteRecordSchema.parse(Object.fromEntries(formData));
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const { error } = await client
    .from('parts')
    .delete()
    .eq('account_id', accountId)
    .eq('id', data.id);

  if (error) {
    throw error;
  }

  revalidateBand(accountSlug);
}

async function assertCanManageBand(accountSlug: string) {
  const workspace = await loadTeamWorkspace(accountSlug);

  if (!workspace.account.permissions.includes('members.manage')) {
    throw new Error('You do not have permission to manage band data.');
  }

  return {
    accountId: workspace.account.id,
    accountSlug: workspace.account.slug,
  };
}

function validatePartSlot(type: PartType, slot: PartSlot) {
  const vocal = slot.startsWith('vocal_');

  if (type === 'vocal' && !vocal) {
    throw new Error('Vocal parts must use a vocal slot.');
  }

  if (type === 'instrumental' && vocal) {
    throw new Error('Instrumental parts must use an instrument slot.');
  }
}

function revalidateBand(accountSlug: string) {
  revalidatePath(`/home/${accountSlug}/band`);
  revalidatePath(`/home/${accountSlug}/band/members`);
  revalidatePath(`/home/${accountSlug}/band/songs`);
  revalidatePath(`/home/${accountSlug}/band/parts`);
}

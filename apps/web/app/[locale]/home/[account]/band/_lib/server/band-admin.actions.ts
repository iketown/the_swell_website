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
type PartFileKind = Database['public']['Enums']['part_file_kind'];
type SongPartAssignmentArea =
  Database['public']['Enums']['song_part_assignment_area'];
type SupabaseServerClient = ReturnType<
  typeof getSupabaseServerClient<Database>
>;

const MAX_PART_FILE_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_PART_FILE_UPLOAD_LABEL = '50 MiB';
const MAX_SONG_FILE_UPLOAD_COUNT = 25;
const MAX_SONG_FILE_UPLOAD_TOTAL_BYTES = 250 * 1024 * 1024;
const MAX_SONG_FILE_UPLOAD_TOTAL_LABEL = '250 MiB';

const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const optionalString = z.preprocess(
  emptyToNull,
  z.string().trim().min(1).nullable(),
);

const optionalPartFileTitle = z.preprocess(
  emptyToNull,
  z.string().trim().min(1).max(255).nullable(),
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
  status: z.enum(['active', 'learning', 'candidate', 'retired']),
});

const TagSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const TagColorSchema = z.enum([
  'teal',
  'coral',
  'gold',
  'sky',
  'sand',
  'avocado',
  'hibiscus',
  'driftwood',
]);

const CreateTagSchema = AccountSlugSchema.extend({
  display: z.string().trim().min(1).max(120),
  slug: z.preprocess(emptyToNull, TagSlugSchema.max(120).nullable()),
  color: TagColorSchema.default('teal'),
});

const UpdateTagSchema = CreateTagSchema.extend({
  id: z.string().uuid(),
});

const UpdateSongTagsSchema = AccountSlugSchema.extend({
  songId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()),
});

const CreatePartSchema = AccountSlugSchema.extend({
  song_id: z.string().uuid(),
  type: z.enum(['vocal', 'instrumental', 'other']),
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
    'other',
  ]),
  default_member_id: z.preprocess(emptyToNull, z.string().uuid().nullable()),
  label: optionalString,
  description: optionalString,
  is_lead: z.preprocess((value) => value === 'on', z.boolean()),
  order_index: optionalInt,
});

const UploadPartFileSchema = AccountSlugSchema.extend({
  partId: z.string().uuid(),
  kind: z.enum(['guide_audio', 'chart_pdf']),
  label: optionalPartFileTitle,
});

const UploadSongFileSchema = AccountSlugSchema.extend({
  songId: z.string().uuid(),
  label: optionalPartFileTitle,
  description: optionalString,
});

const AssignSongPartAssetSchema = AccountSlugSchema.extend({
  songId: z.string().uuid(),
  assetId: z.string().uuid(),
  memberId: z.string().uuid(),
  area: z.enum(['vocal', 'instrumental']),
});

const RemoveSongPartAssignmentSchema = AccountSlugSchema.extend({
  assignmentId: z.string().uuid(),
});

const AttachExistingPartFileSchema = AccountSlugSchema.extend({
  partId: z.string().uuid(),
  sourceFileId: z.string().uuid(),
});

const AttachSongInventoryFileSchema = AccountSlugSchema.extend({
  partId: z.string().uuid(),
  sourceFileRef: z
    .string()
    .regex(/^(part|song):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
});

const UpdatePartFileTitleSchema = AccountSlugSchema.extend({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(255),
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

  const { error } = await client.from('parts').insert({
    account_id: accountId,
    song_id: data.song_id,
    type: data.type as PartType,
    slot: data.slot as PartSlot,
    default_member_id: data.default_member_id,
    label: data.label,
    description: data.description,
    is_lead: data.is_lead,
    order_index: data.order_index ?? 0,
  });

  if (error) {
    throw error;
  }

  revalidateBand(accountSlug);
}

export async function uploadPartFileAction(formData: FormData) {
  const data = UploadPartFileSchema.parse({
    accountSlug: formData.get('accountSlug'),
    partId: formData.get('partId'),
    kind: formData.get('kind'),
    label: formData.get('label'),
  });
  const uploadedFile = formData.get('file');
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  if (!(uploadedFile instanceof File) || uploadedFile.size === 0) {
    throw new Error('Choose an MP3 or PDF file to upload.');
  }

  if (uploadedFile.size > MAX_PART_FILE_UPLOAD_BYTES) {
    throw new Error(
      `Part files must be ${MAX_PART_FILE_UPLOAD_LABEL} or less.`,
    );
  }

  const { data: part, error: partError } = await client
    .from('parts')
    .select('id, song_id')
    .eq('account_id', accountId)
    .eq('id', data.partId)
    .single();

  if (partError) {
    throw partError;
  }

  const fileMetadata = getPartFileMetadata(uploadedFile, data.kind);
  const storagePath = [
    accountId,
    'parts',
    part.id,
    `${data.kind}-${Date.now()}.${fileMetadata.extension}`,
  ].join('/');

  const { error: uploadError } = await client.storage
    .from('band_assets')
    .upload(storagePath, uploadedFile, {
      contentType: fileMetadata.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: existingFile, error: existingError } =
    data.kind === 'chart_pdf'
      ? await client
          .from('part_files')
          .select('id')
          .eq('account_id', accountId)
          .eq('part_id', part.id)
          .eq('kind', data.kind)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle()
      : { data: null, error: null };

  if (existingError) {
    throw existingError;
  }

  const { data: lastFile, error: lastFileError } = await client
    .from('part_files')
    .select('order_index')
    .eq('account_id', accountId)
    .eq('part_id', part.id)
    .eq('kind', data.kind)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastFileError) {
    throw lastFileError;
  }

  const fileRow = {
    account_id: accountId,
    part_id: part.id,
    kind: data.kind as PartFileKind,
    label: data.label ?? getDefaultPartFileTitle(uploadedFile, fileMetadata),
    storage_path: storagePath,
    mime_type: fileMetadata.mimeType,
    size_bytes: uploadedFile.size,
    order_index:
      data.kind === 'guide_audio' ? (lastFile?.order_index ?? -1) + 1 : 1,
  };

  if (existingFile) {
    const { error: updateError } = await client
      .from('part_files')
      .update(fileRow)
      .eq('account_id', accountId)
      .eq('id', existingFile.id);

    if (updateError) {
      throw updateError;
    }
  } else {
    const { error: insertError } = await client
      .from('part_files')
      .insert(fileRow);

    if (insertError) {
      throw insertError;
    }
  }

  revalidateBand(accountSlug);
  await revalidateSongPartsPath(client, accountId, part.song_id);
}

export async function uploadSongFileAction(formData: FormData) {
  const data = UploadSongFileSchema.parse({
    accountSlug: formData.get('accountSlug'),
    songId: formData.get('songId'),
    label: formData.get('label'),
    description: formData.get('description'),
  });
  const uploadedFiles = formData
    .getAll('file')
    .filter((file): file is File => file instanceof File && file.size > 0);
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  if (uploadedFiles.length === 0) {
    throw new Error('Choose one or more MP3 or PDF files to upload.');
  }

  if (uploadedFiles.length > MAX_SONG_FILE_UPLOAD_COUNT) {
    throw new Error(
      `Upload ${MAX_SONG_FILE_UPLOAD_COUNT} song files or fewer at a time.`,
    );
  }

  const totalUploadBytes = uploadedFiles.reduce(
    (total, file) => total + file.size,
    0,
  );

  if (totalUploadBytes > MAX_SONG_FILE_UPLOAD_TOTAL_BYTES) {
    throw new Error(
      `Song file batches must be ${MAX_SONG_FILE_UPLOAD_TOTAL_LABEL} or less.`,
    );
  }

  for (const file of uploadedFiles) {
    if (file.size > MAX_PART_FILE_UPLOAD_BYTES) {
      throw new Error(
        `Each song file must be ${MAX_PART_FILE_UPLOAD_LABEL} or less.`,
      );
    }
  }

  const { data: song, error: songError } = await client
    .from('songs')
    .select('id, slug')
    .eq('account_id', accountId)
    .eq('id', data.songId)
    .single();

  if (songError) {
    throw songError;
  }

  const { data: lastFiles, error: lastFilesError } = await client
    .from('song_files')
    .select('kind, order_index')
    .eq('account_id', accountId)
    .eq('song_id', song.id)
    .order('order_index', { ascending: false });

  if (lastFilesError) {
    throw lastFilesError;
  }

  const nextOrderIndexByKind: Record<PartFileKind, number> = {
    chart_pdf: -1,
    guide_audio: -1,
  };

  for (const file of lastFiles ?? []) {
    nextOrderIndexByKind[file.kind] = Math.max(
      nextOrderIndexByKind[file.kind],
      file.order_index ?? -1,
    );
  }

  for (const [fileIndex, uploadedFile] of uploadedFiles.entries()) {
    const fileMetadata = getUploadedSongFileMetadata(uploadedFile);
    const storagePath = [
      accountId,
      'songs',
      song.id,
      `${fileMetadata.kind}-${Date.now()}-${fileIndex}.${fileMetadata.extension}`,
    ].join('/');

    const { error: uploadError } = await client.storage
      .from('band_assets')
      .upload(storagePath, uploadedFile, {
        contentType: fileMetadata.mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    nextOrderIndexByKind[fileMetadata.kind] += 1;

    const title =
      uploadedFiles.length === 1 && data.label
        ? data.label
        : getDefaultPartFileTitle(uploadedFile, fileMetadata);
    const orderIndex = nextOrderIndexByKind[fileMetadata.kind];

    const { error: insertError } = await client.from('song_files').insert({
      account_id: accountId,
      song_id: song.id,
      kind: fileMetadata.kind,
      label: title,
      storage_path: storagePath,
      mime_type: fileMetadata.mimeType,
      size_bytes: uploadedFile.size,
      order_index: orderIndex,
    });

    if (insertError) {
      throw insertError;
    }

    const { error: assetInsertError } = await client
      .from('song_part_assets')
      .insert({
        account_id: accountId,
        song_id: song.id,
        kind: fileMetadata.kind,
        title,
        description: data.description,
        storage_path: storagePath,
        mime_type: fileMetadata.mimeType,
        size_bytes: uploadedFile.size,
        default_area:
          fileMetadata.kind === 'guide_audio'
            ? ('vocal' satisfies SongPartAssignmentArea)
            : null,
        order_index: orderIndex,
      });

    if (assetInsertError) {
      throw assetInsertError;
    }
  }

  revalidateBand(accountSlug);
  revalidatePath(`/band/parts/${song.slug}`);
  revalidatePath(`/band/parts/${song.slug}/parts`);
}

export async function assignSongPartAssetAction(
  input: z.infer<typeof AssignSongPartAssetSchema>,
) {
  const data = AssignSongPartAssetSchema.parse(input);
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const { data: asset, error: assetError } = await client
    .from('song_part_assets')
    .select('id, song_id')
    .eq('account_id', accountId)
    .eq('id', data.assetId)
    .single();

  if (assetError) {
    throw assetError;
  }

  if (asset.song_id !== data.songId) {
    throw new Error('Part assets can only be assigned within their song.');
  }

  const { error: memberError } = await client
    .from('members')
    .select('id')
    .eq('account_id', accountId)
    .eq('id', data.memberId)
    .single();

  if (memberError) {
    throw memberError;
  }

  const { data: existingAssignment, error: existingAssignmentError } =
    await client
      .from('song_part_assignments')
      .select('id')
      .eq('account_id', accountId)
      .eq('asset_id', data.assetId)
      .eq('member_id', data.memberId)
      .eq('area', data.area)
      .maybeSingle();

  if (existingAssignmentError) {
    throw existingAssignmentError;
  }

  if (existingAssignment) {
    revalidateBand(accountSlug);
    await revalidateSongPartsPath(client, accountId, data.songId);
    return;
  }

  const { data: lastAssignment, error: lastAssignmentError } = await client
    .from('song_part_assignments')
    .select('order_index')
    .eq('account_id', accountId)
    .eq('song_id', data.songId)
    .eq('member_id', data.memberId)
    .eq('area', data.area)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastAssignmentError) {
    throw lastAssignmentError;
  }

  const { error: insertError } = await client
    .from('song_part_assignments')
    .insert({
      account_id: accountId,
      song_id: data.songId,
      asset_id: data.assetId,
      member_id: data.memberId,
      area: data.area as SongPartAssignmentArea,
      order_index: (lastAssignment?.order_index ?? -1) + 1,
    });

  if (insertError) {
    throw insertError;
  }

  revalidateBand(accountSlug);
  await revalidateSongPartsPath(client, accountId, data.songId);
}

export async function removeSongPartAssignmentAction(
  input: z.infer<typeof RemoveSongPartAssignmentSchema>,
) {
  const data = RemoveSongPartAssignmentSchema.parse(input);
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const { data: assignment, error: assignmentError } = await client
    .from('song_part_assignments')
    .select('id, song_id')
    .eq('account_id', accountId)
    .eq('id', data.assignmentId)
    .single();

  if (assignmentError) {
    throw assignmentError;
  }

  const { error: deleteError } = await client
    .from('song_part_assignments')
    .delete()
    .eq('account_id', accountId)
    .eq('id', assignment.id);

  if (deleteError) {
    throw deleteError;
  }

  revalidateBand(accountSlug);
  await revalidateSongPartsPath(client, accountId, assignment.song_id);
}

export async function attachSongInventoryFileToPartAction(
  formData: FormData,
) {
  const data = AttachSongInventoryFileSchema.parse(
    Object.fromEntries(formData),
  );
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();
  const [sourceType, sourceFileId] = data.sourceFileRef.split(':') as [
    'part' | 'song',
    string,
  ];

  const { data: targetPart, error: targetPartError } = await client
    .from('parts')
    .select('id, song_id')
    .eq('account_id', accountId)
    .eq('id', data.partId)
    .single();

  if (targetPartError) {
    throw targetPartError;
  }

  let sourceFile: {
    kind: PartFileKind;
    label: string;
    mime_type: string;
    size_bytes: number | null;
    song_id: string;
    storage_path: string;
  };

  if (sourceType === 'song') {
    const { data: songFile, error: songFileError } = await client
      .from('song_files')
      .select('kind, label, storage_path, mime_type, size_bytes, song_id')
      .eq('account_id', accountId)
      .eq('id', sourceFileId)
      .single();

    if (songFileError) {
      throw songFileError;
    }

    sourceFile = songFile;
  } else {
    const { data: partFile, error: partFileError } = await client
      .from('part_files')
      .select('kind, label, storage_path, mime_type, size_bytes, part_id')
      .eq('account_id', accountId)
      .eq('id', sourceFileId)
      .single();

    if (partFileError) {
      throw partFileError;
    }

    const { data: sourcePart, error: sourcePartError } = await client
      .from('parts')
      .select('song_id')
      .eq('account_id', accountId)
      .eq('id', partFile.part_id)
      .single();

    if (sourcePartError) {
      throw sourcePartError;
    }

    sourceFile = { ...partFile, song_id: sourcePart.song_id };
  }

  if (sourceFile.song_id !== targetPart.song_id) {
    throw new Error('Files can only be attached within the same song.');
  }

  const { data: existingReference, error: existingReferenceError } =
    await client
      .from('part_files')
      .select('id')
      .eq('account_id', accountId)
      .eq('part_id', targetPart.id)
      .eq('storage_path', sourceFile.storage_path)
      .maybeSingle();

  if (existingReferenceError) {
    throw existingReferenceError;
  }

  if (existingReference) {
    revalidateBand(accountSlug);
    await revalidateSongPartsPath(client, accountId, targetPart.song_id);
    return;
  }

  const { data: lastFile, error: lastFileError } = await client
    .from('part_files')
    .select('order_index')
    .eq('account_id', accountId)
    .eq('part_id', targetPart.id)
    .eq('kind', sourceFile.kind)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastFileError) {
    throw lastFileError;
  }

  const { error: insertError } = await client.from('part_files').insert({
    account_id: accountId,
    part_id: targetPart.id,
    kind: sourceFile.kind,
    label: sourceFile.label,
    storage_path: sourceFile.storage_path,
    mime_type: sourceFile.mime_type,
    size_bytes: sourceFile.size_bytes,
    order_index: (lastFile?.order_index ?? -1) + 1,
  });

  if (insertError) {
    throw insertError;
  }

  revalidateBand(accountSlug);
  await revalidateSongPartsPath(client, accountId, targetPart.song_id);
}

export async function attachExistingPartFileAction(formData: FormData) {
  const data = AttachExistingPartFileSchema.parse(Object.fromEntries(formData));
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const { data: targetPart, error: targetPartError } = await client
    .from('parts')
    .select('id, song_id')
    .eq('account_id', accountId)
    .eq('id', data.partId)
    .single();

  if (targetPartError) {
    throw targetPartError;
  }

  const { data: sourceFile, error: sourceFileError } = await client
    .from('part_files')
    .select('id, part_id, kind, label, storage_path, mime_type, size_bytes')
    .eq('account_id', accountId)
    .eq('id', data.sourceFileId)
    .single();

  if (sourceFileError) {
    throw sourceFileError;
  }

  const { data: sourcePart, error: sourcePartError } = await client
    .from('parts')
    .select('id, song_id')
    .eq('account_id', accountId)
    .eq('id', sourceFile.part_id)
    .single();

  if (sourcePartError) {
    throw sourcePartError;
  }

  if (sourcePart.song_id !== targetPart.song_id) {
    throw new Error(
      'Existing files can only be attached within the same song.',
    );
  }

  const { data: existingReference, error: existingReferenceError } =
    await client
      .from('part_files')
      .select('id')
      .eq('account_id', accountId)
      .eq('part_id', targetPart.id)
      .eq('storage_path', sourceFile.storage_path)
      .maybeSingle();

  if (existingReferenceError) {
    throw existingReferenceError;
  }

  if (existingReference) {
    revalidateBand(accountSlug);
    return;
  }

  const { data: lastFile, error: lastFileError } = await client
    .from('part_files')
    .select('order_index')
    .eq('account_id', accountId)
    .eq('part_id', targetPart.id)
    .eq('kind', sourceFile.kind)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastFileError) {
    throw lastFileError;
  }

  const { error: insertError } = await client.from('part_files').insert({
    account_id: accountId,
    part_id: targetPart.id,
    kind: sourceFile.kind,
    label: sourceFile.label,
    storage_path: sourceFile.storage_path,
    mime_type: sourceFile.mime_type,
    size_bytes: sourceFile.size_bytes,
    order_index: (lastFile?.order_index ?? -1) + 1,
  });

  if (insertError) {
    throw insertError;
  }

  revalidateBand(accountSlug);
  await revalidateSongPartsPath(client, accountId, targetPart.song_id);
}

export async function updatePartFileTitleAction(formData: FormData) {
  const data = UpdatePartFileTitleSchema.parse(Object.fromEntries(formData));
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const { error } = await client
    .from('part_files')
    .update({ label: data.label })
    .eq('account_id', accountId)
    .eq('id', data.id)
    .eq('kind', 'guide_audio');

  if (error) {
    throw error;
  }

  revalidateBand(accountSlug);
}

export async function removePartFileReferenceAction(formData: FormData) {
  const data = DeleteRecordSchema.parse(Object.fromEntries(formData));
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const { data: file, error: fileError } = await client
    .from('part_files')
    .select('id, part_id')
    .eq('account_id', accountId)
    .eq('id', data.id)
    .single();

  if (fileError) {
    throw fileError;
  }

  const { data: part, error: partError } = await client
    .from('parts')
    .select('id, song_id')
    .eq('account_id', accountId)
    .eq('id', file.part_id)
    .single();

  if (partError) {
    throw partError;
  }

  const { error: deleteError } = await client
    .from('part_files')
    .delete()
    .eq('account_id', accountId)
    .eq('id', file.id);

  if (deleteError) {
    throw deleteError;
  }

  revalidateBand(accountSlug);
  await revalidateSongPartsPath(client, accountId, part.song_id);
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

export async function createTagAction(formData: FormData) {
  const data = CreateTagSchema.parse(Object.fromEntries(formData));
  const { accountId, accountSlug } = await assertCanManageTags(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();
  const slug = data.slug ?? slugifyTag(data.display);

  const { error } = await client.from('tags').insert({
    account_id: accountId,
    display: data.display,
    slug,
    color: data.color,
  });

  if (error) {
    throw error;
  }

  revalidateBand(accountSlug);
}

export async function deleteTagAction(formData: FormData) {
  const data = DeleteRecordSchema.parse(Object.fromEntries(formData));
  const { accountId, accountSlug } = await assertCanManageTags(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const { error } = await client
    .from('tags')
    .delete()
    .eq('account_id', accountId)
    .eq('id', data.id);

  if (error) {
    throw error;
  }

  revalidateBand(accountSlug);
}

export async function updateTagAction(formData: FormData) {
  const data = UpdateTagSchema.parse(Object.fromEntries(formData));
  const { accountId, accountSlug } = await assertCanManageTags(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();
  const slug = data.slug ?? slugifyTag(data.display);

  const { error } = await client
    .from('tags')
    .update({
      display: data.display,
      slug,
      color: data.color,
    })
    .eq('account_id', accountId)
    .eq('id', data.id);

  if (error) {
    throw error;
  }

  revalidateBand(accountSlug);
}

export async function updateSongTagsAction(formData: FormData) {
  const data = UpdateSongTagsSchema.parse({
    accountSlug: formData.get('accountSlug'),
    songId: formData.get('songId'),
    tagIds: formData.getAll('tagId'),
  });
  const { accountId, accountSlug } = await assertCanManageTags(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const { error: deleteError } = await client
    .from('song_tags')
    .delete()
    .eq('account_id', accountId)
    .eq('song_id', data.songId);

  if (deleteError) {
    throw deleteError;
  }

  if (data.tagIds.length > 0) {
    const { error: insertError } = await client.from('song_tags').insert(
      data.tagIds.map((tagId) => ({
        account_id: accountId,
        song_id: data.songId,
        tag_id: tagId,
      })),
    );

    if (insertError) {
      throw insertError;
    }
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

async function assertCanManageTags(accountSlug: string) {
  const workspace = await loadTeamWorkspace(accountSlug);

  if (!workspace.account.permissions.includes('tags.manage')) {
    throw new Error('You do not have permission to manage song tags.');
  }

  return {
    accountId: workspace.account.id,
    accountSlug: workspace.account.slug,
  };
}

function validatePartSlot(type: PartType, slot: PartSlot) {
  const vocal = slot.startsWith('vocal_');
  const instrument = ['bass', 'drums', 'keys', 'lead_gtr', 'rhy_gtr'].includes(
    slot,
  );

  if (type === 'vocal' && !vocal) {
    throw new Error('Vocal parts must use a vocal slot.');
  }

  if (type === 'instrumental' && !instrument) {
    throw new Error('Instrumental parts must use an instrument slot.');
  }

  if (type === 'other' && slot !== 'other') {
    throw new Error('Other parts must use the other slot.');
  }
}

function revalidateBand(accountSlug: string) {
  revalidatePath(`/home/${accountSlug}/band`);
  revalidatePath(`/home/${accountSlug}/band/members`);
  revalidatePath(`/home/${accountSlug}/band/songs`);
  revalidatePath(`/home/${accountSlug}/band/parts`);
  revalidatePath('/band');
  revalidatePath('/band/members');
  revalidatePath('/band/songs');
  revalidatePath('/band/albums');
  revalidatePath('/band/parts');
}

async function revalidateSongPartsPath(
  client: SupabaseServerClient,
  accountId: string,
  songId: string,
) {
  const { data } = await client
    .from('songs')
    .select('slug')
    .eq('account_id', accountId)
    .eq('id', songId)
    .maybeSingle();

  if (data?.slug) {
    revalidatePath(`/band/parts/${data.slug}`);
    revalidatePath(`/band/parts/${data.slug}/parts`);
  }
}

function slugifyTag(display: string) {
  return TagSlugSchema.parse(
    display
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
  );
}

function getUploadedSongFileMetadata(file: File) {
  const fileName = file.name.toLowerCase();

  if (
    file.type === 'audio/mpeg' ||
    file.type === 'audio/mp3' ||
    fileName.endsWith('.mp3')
  ) {
    return {
      ...getPartFileMetadata(file, 'guide_audio'),
      kind: 'guide_audio' as const,
    };
  }

  if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
    return {
      ...getPartFileMetadata(file, 'chart_pdf'),
      kind: 'chart_pdf' as const,
    };
  }

  throw new Error('Song files must be MP3 or PDF files.');
}

function getPartFileMetadata(file: File, kind: PartFileKind) {
  const fileName = file.name.toLowerCase();

  if (
    kind === 'guide_audio' &&
    (file.type === 'audio/mpeg' ||
      file.type === 'audio/mp3' ||
      fileName.endsWith('.mp3'))
  ) {
    return {
      defaultLabel: 'MP3 guide',
      extension: 'mp3',
      mimeType: 'audio/mpeg',
    };
  }

  if (
    kind === 'chart_pdf' &&
    (file.type === 'application/pdf' || fileName.endsWith('.pdf'))
  ) {
    return {
      defaultLabel: 'PDF chart',
      extension: 'pdf',
      mimeType: 'application/pdf',
    };
  }

  throw new Error(
    kind === 'guide_audio'
      ? 'Guide audio must be an MP3 file.'
      : 'Charts must be PDF files.',
  );
}

function getDefaultPartFileTitle(
  file: File,
  metadata: ReturnType<typeof getPartFileMetadata>,
) {
  const title = file.name.replace(/\.[^/.]+$/, '').trim();

  return title || metadata.defaultLabel;
}

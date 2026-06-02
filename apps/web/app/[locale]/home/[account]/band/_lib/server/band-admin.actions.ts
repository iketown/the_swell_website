'use server';

import { revalidatePath } from 'next/cache';

import * as z from 'zod';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';
import { Database, Json } from '~/lib/database.types';

type InstrumentSlot = Database['public']['Enums']['instrument_slot'];
type VocalSlot = Database['public']['Enums']['vocal_slot'];
type PartSlot = Database['public']['Enums']['part_slot'];
type PartType = Database['public']['Enums']['part_type'];
type PartFileKind = Database['public']['Enums']['part_file_kind'];
type UploadedPartFileKind = Extract<PartFileKind, 'chart_pdf' | 'guide_audio'>;
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

const ClientUploadFileSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().positive(),
  type: z.string(),
});

const PreparePartFileUploadSchema = UploadPartFileSchema.extend({
  file: ClientUploadFileSchema,
});

const FinalizePartFileUploadSchema = UploadPartFileSchema.extend({
  file: ClientUploadFileSchema,
  storagePath: z.string().min(1).max(1000),
});

const PrepareSongFileUploadSchema = UploadSongFileSchema.extend({
  file: ClientUploadFileSchema,
});

const FinalizeSongFileUploadSchema = UploadSongFileSchema.extend({
  file: ClientUploadFileSchema,
  storagePath: z.string().min(1).max(1000),
});

const AssignSongPartAssetSchema = AccountSlugSchema.extend({
  songId: z.string().uuid(),
  assetId: z.string().uuid(),
  memberId: z.string().uuid(),
  area: z.enum(['vocal', 'instrumental']),
});

const ShareSongPartAssetSchema = AccountSlugSchema.extend({
  songId: z.string().uuid(),
  assetId: z.string().uuid(),
});

const RichTextDocSchema = z
  .unknown()
  .refine(isRichTextDoc, 'Rich text content must be a Tiptap document.');

const CreateSongPartNoteSchema = AccountSlugSchema.extend({
  area: z.enum(['vocal', 'instrumental']).nullable(),
  content: RichTextDocSchema,
  memberId: z.string().uuid().nullable(),
  scope: z.enum(['shared', 'member']),
  songId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
});

const UpdateSongPartNoteSchema = AccountSlugSchema.extend({
  assetId: z.string().uuid(),
  content: RichTextDocSchema,
  title: z.string().trim().min(1).max(255),
});

const UnshareSongPartAssetSchema = AccountSlugSchema.extend({
  songId: z.string().uuid(),
  assetId: z.string().uuid(),
});

const RemoveSongPartAssignmentSchema = AccountSlugSchema.extend({
  assignmentId: z.string().uuid(),
});

const RemoveSongPartAssetSchema = AccountSlugSchema.extend({
  assetId: z.string().uuid(),
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

export async function preparePartFileUploadAction(
  input: z.infer<typeof PreparePartFileUploadSchema>,
) {
  const data = PreparePartFileUploadSchema.parse(input);
  const { accountId } = await assertCanManageBand(data.accountSlug);
  const client = getSupabaseServerClient();

  validateClientUploadSize(data.file);

  const { data: part, error: partError } = await client
    .from('parts')
    .select('id')
    .eq('account_id', accountId)
    .eq('id', data.partId)
    .single();

  if (partError) {
    throw partError;
  }

  const fileMetadata = getPartFileMetadata(data.file, data.kind);
  const storagePath = [
    accountId,
    'parts',
    part.id,
    `${data.kind}-${crypto.randomUUID()}.${fileMetadata.extension}`,
  ].join('/');

  return {
    contentType: fileMetadata.mimeType,
    maxSizeBytes: MAX_PART_FILE_UPLOAD_BYTES,
    storagePath,
  };
}

export async function finalizePartFileUploadAction(
  input: z.infer<typeof FinalizePartFileUploadSchema>,
) {
  const data = FinalizePartFileUploadSchema.parse(input);
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  validateClientUploadSize(data.file);

  const { data: part, error: partError } = await client
    .from('parts')
    .select('id, song_id')
    .eq('account_id', accountId)
    .eq('id', data.partId)
    .single();

  if (partError) {
    throw partError;
  }

  assertStoragePathPrefix(data.storagePath, [accountId, 'parts', part.id]);

  const fileMetadata = getPartFileMetadata(data.file, data.kind);
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
    label: data.label ?? getDefaultPartFileTitle(data.file, fileMetadata),
    storage_path: data.storagePath,
    mime_type: fileMetadata.mimeType,
    size_bytes: data.file.size,
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

  const nextOrderIndexByKind: Record<UploadedPartFileKind, number> = {
    chart_pdf: -1,
    guide_audio: -1,
  };

  for (const file of lastFiles ?? []) {
    if (!isUploadedPartFileKind(file.kind)) {
      continue;
    }

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

export async function prepareSongFileUploadAction(
  input: z.infer<typeof PrepareSongFileUploadSchema>,
) {
  const data = PrepareSongFileUploadSchema.parse(input);
  const { accountId } = await assertCanManageBand(data.accountSlug);
  const client = getSupabaseServerClient();

  validateClientUploadSize(data.file);

  const { data: song, error: songError } = await client
    .from('songs')
    .select('id')
    .eq('account_id', accountId)
    .eq('id', data.songId)
    .single();

  if (songError) {
    throw songError;
  }

  const fileMetadata = getUploadedSongFileMetadata(data.file);
  const storagePath = [
    accountId,
    'songs',
    song.id,
    `${fileMetadata.kind}-${crypto.randomUUID()}.${fileMetadata.extension}`,
  ].join('/');

  return {
    contentType: fileMetadata.mimeType,
    maxSizeBytes: MAX_PART_FILE_UPLOAD_BYTES,
    storagePath,
  };
}

export async function finalizeSongFileUploadAction(
  input: z.infer<typeof FinalizeSongFileUploadSchema>,
) {
  const data = FinalizeSongFileUploadSchema.parse(input);
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  validateClientUploadSize(data.file);

  const { data: song, error: songError } = await client
    .from('songs')
    .select('id, slug')
    .eq('account_id', accountId)
    .eq('id', data.songId)
    .single();

  if (songError) {
    throw songError;
  }

  assertStoragePathPrefix(data.storagePath, [accountId, 'songs', song.id]);

  const fileMetadata = getUploadedSongFileMetadata(data.file);
  const { data: lastFile, error: lastFileError } = await client
    .from('song_files')
    .select('order_index')
    .eq('account_id', accountId)
    .eq('song_id', song.id)
    .eq('kind', fileMetadata.kind)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastFileError) {
    throw lastFileError;
  }

  const title =
    data.label ?? getDefaultPartFileTitle(data.file, fileMetadata);
  const orderIndex = (lastFile?.order_index ?? -1) + 1;

  const { error: insertError } = await client.from('song_files').insert({
    account_id: accountId,
    song_id: song.id,
    kind: fileMetadata.kind,
    label: title,
    storage_path: data.storagePath,
    mime_type: fileMetadata.mimeType,
    size_bytes: data.file.size,
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
      storage_path: data.storagePath,
      mime_type: fileMetadata.mimeType,
      size_bytes: data.file.size,
      default_area:
        fileMetadata.kind === 'guide_audio'
          ? ('vocal' satisfies SongPartAssignmentArea)
          : null,
      order_index: orderIndex,
    });

  if (assetInsertError) {
    throw assetInsertError;
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
    .select('id, song_id, title, default_area')
    .eq('account_id', accountId)
    .eq('id', data.assetId)
    .single();

  if (assetError) {
    throw assetError;
  }

  if (asset.song_id !== data.songId) {
    throw new Error('Part assets can only be assigned within their song.');
  }

  if (asset.default_area === 'shared') {
    throw new Error(`${asset.title} is already assigned to ALL.`);
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

export async function createSongPartNoteAction(
  input: z.infer<typeof CreateSongPartNoteSchema>,
) {
  const data = CreateSongPartNoteSchema.parse(input);
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const { data: song, error: songError } = await client
    .from('songs')
    .select('id')
    .eq('account_id', accountId)
    .eq('id', data.songId)
    .single();

  if (songError) {
    throw songError;
  }

  if (data.scope === 'member') {
    if (!data.memberId || !data.area) {
      throw new Error('Choose a member and bucket for this note.');
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
  }

  const { data: lastAsset, error: lastAssetError } = await client
    .from('song_part_assets')
    .select('order_index')
    .eq('account_id', accountId)
    .eq('song_id', song.id)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastAssetError) {
    throw lastAssetError;
  }

  const { data: insertedAsset, error: insertError } = await client
    .from('song_part_assets')
    .insert({
      account_id: accountId,
      content: data.content as Json,
      default_area:
        data.scope === 'shared'
          ? ('shared' satisfies SongPartAssignmentArea)
          : null,
      kind: 'rich_text_note' satisfies PartFileKind,
      order_index: (lastAsset?.order_index ?? -1) + 1,
      song_id: song.id,
      title: data.title,
    })
    .select('id')
    .single();

  if (insertError) {
    throw insertError;
  }

  if (data.scope === 'member' && data.memberId && data.area) {
    const { data: lastAssignment, error: lastAssignmentError } = await client
      .from('song_part_assignments')
      .select('order_index')
      .eq('account_id', accountId)
      .eq('song_id', song.id)
      .eq('member_id', data.memberId)
      .eq('area', data.area)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAssignmentError) {
      throw lastAssignmentError;
    }

    const { error: assignmentError } = await client
      .from('song_part_assignments')
      .insert({
        account_id: accountId,
        area: data.area as SongPartAssignmentArea,
        asset_id: insertedAsset.id,
        member_id: data.memberId,
        order_index: (lastAssignment?.order_index ?? -1) + 1,
        song_id: song.id,
      });

    if (assignmentError) {
      throw assignmentError;
    }
  }

  revalidateBand(accountSlug);
  await revalidateSongPartsPath(client, accountId, song.id);
}

export async function updateSongPartNoteAction(
  input: z.infer<typeof UpdateSongPartNoteSchema>,
) {
  const data = UpdateSongPartNoteSchema.parse(input);
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const { data: asset, error: assetError } = await client
    .from('song_part_assets')
    .select('id, song_id')
    .eq('account_id', accountId)
    .eq('id', data.assetId)
    .eq('kind', 'rich_text_note')
    .single();

  if (assetError) {
    throw assetError;
  }

  const { error: updateError } = await client
    .from('song_part_assets')
    .update({
      content: data.content as Json,
      title: data.title,
    })
    .eq('account_id', accountId)
    .eq('id', asset.id)
    .eq('kind', 'rich_text_note');

  if (updateError) {
    throw updateError;
  }

  revalidateBand(accountSlug);
  await revalidateSongPartsPath(client, accountId, asset.song_id);
}

export async function shareSongPartAssetAction(
  input: z.infer<typeof ShareSongPartAssetSchema>,
) {
  const data = ShareSongPartAssetSchema.parse(input);
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
    throw new Error('Part assets can only be shared within their song.');
  }

  const { error: assignmentDeleteError } = await client
    .from('song_part_assignments')
    .delete()
    .eq('account_id', accountId)
    .eq('asset_id', asset.id);

  if (assignmentDeleteError) {
    throw assignmentDeleteError;
  }

  const { error: updateError } = await client
    .from('song_part_assets')
    .update({
      default_area: 'shared' satisfies SongPartAssignmentArea,
    })
    .eq('account_id', accountId)
    .eq('id', asset.id);

  if (updateError) {
    throw updateError;
  }

  revalidateBand(accountSlug);
  await revalidateSongPartsPath(client, accountId, asset.song_id);
}

export async function unshareSongPartAssetAction(
  input: z.infer<typeof UnshareSongPartAssetSchema>,
) {
  const data = UnshareSongPartAssetSchema.parse(input);
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
    throw new Error('Part assets can only be unassigned within their song.');
  }

  const { error: updateError } = await client
    .from('song_part_assets')
    .update({
      default_area: null,
    })
    .eq('account_id', accountId)
    .eq('id', asset.id);

  if (updateError) {
    throw updateError;
  }

  revalidateBand(accountSlug);
  await revalidateSongPartsPath(client, accountId, asset.song_id);
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

export async function removeSongPartAssetAction(
  input: z.infer<typeof RemoveSongPartAssetSchema>,
) {
  const data = RemoveSongPartAssetSchema.parse(input);
  const { accountId, accountSlug } = await assertCanManageBand(
    data.accountSlug,
  );
  const client = getSupabaseServerClient();

  const { data: asset, error: assetError } = await client
    .from('song_part_assets')
    .select('id, song_id, storage_path')
    .eq('account_id', accountId)
    .eq('id', data.assetId)
    .single();

  if (assetError) {
    throw assetError;
  }

  const { error: assetDeleteError } = await client
    .from('song_part_assets')
    .delete()
    .eq('account_id', accountId)
    .eq('id', asset.id);

  if (assetDeleteError) {
    throw assetDeleteError;
  }

  if (asset.storage_path) {
    const { error: songFileDeleteError } = await client
      .from('song_files')
      .delete()
      .eq('account_id', accountId)
      .eq('song_id', asset.song_id)
      .eq('storage_path', asset.storage_path);

    if (songFileDeleteError) {
      throw songFileDeleteError;
    }

    const { error: storageDeleteError } = await client.storage
      .from('band_assets')
      .remove([asset.storage_path]);

    if (storageDeleteError) {
      throw storageDeleteError;
    }
  }

  revalidateBand(accountSlug);
  await revalidateSongPartsPath(client, accountId, asset.song_id);
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

function isRichTextDoc(value: unknown) {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    (value as { type?: unknown }).type === 'doc'
  );
}

function isUploadedPartFileKind(kind: PartFileKind): kind is UploadedPartFileKind {
  return kind === 'chart_pdf' || kind === 'guide_audio';
}

function validateClientUploadSize(file: { size: number }) {
  if (file.size > MAX_PART_FILE_UPLOAD_BYTES) {
    throw new Error(
      `Files must be ${MAX_PART_FILE_UPLOAD_LABEL} or less.`,
    );
  }
}

function assertStoragePathPrefix(storagePath: string, segments: string[]) {
  const prefix = `${segments.join('/')}/`;

  if (!storagePath.startsWith(prefix)) {
    throw new Error('Uploaded file path does not match the target record.');
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

function getUploadedSongFileMetadata(file: { name: string; type: string }) {
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

function getPartFileMetadata(
  file: { name: string; type: string },
  kind: PartFileKind,
) {
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
  file: { name: string },
  metadata: ReturnType<typeof getPartFileMetadata>,
) {
  const title = file.name.replace(/\.[^/.]+$/, '').trim();

  return title || metadata.defaultLabel;
}

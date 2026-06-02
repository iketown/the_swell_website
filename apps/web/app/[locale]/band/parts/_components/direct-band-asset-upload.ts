'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '~/lib/database.types';

const BAND_ASSETS_BUCKET = 'band_assets';
export const MAX_DIRECT_BAND_ASSET_BYTES = 50 * 1024 * 1024;

export type UploadQueueItemStatus =
  | 'queued'
  | 'preparing'
  | 'uploading'
  | 'saving'
  | 'complete'
  | 'error';

export type UploadQueueItem = {
  error?: string;
  id: string;
  name: string;
  progress: number;
  size: number;
  status: UploadQueueItemStatus;
};

export type ClientUploadFile = {
  name: string;
  size: number;
  type: string;
};

export type UploadedBandAsset = {
  contentType: string;
  maxSizeBytes: number;
  storagePath: string;
};

export async function uploadBandAssetWithProgress({
  client,
  file,
  onProgress,
  storagePath,
}: {
  client: SupabaseClient<Database>;
  file: File;
  onProgress: (progress: number) => void;
  storagePath: string;
}) {
  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.access_token) {
    throw new Error('Sign in again before uploading files.');
  }

  const formData = new FormData();
  formData.append('cacheControl', '3600');
  formData.append('', file);

  await postWithProgress({
    body: formData,
    onProgress,
    storagePath,
    token: session.access_token,
  });
}

export async function removeUploadedBandAsset(
  client: SupabaseClient<Database>,
  storagePath: string,
) {
  await client.storage.from(BAND_ASSETS_BUCKET).remove([storagePath]);
}

export function toClientUploadFile(file: File): ClientUploadFile {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

function postWithProgress({
  body,
  onProgress,
  storagePath,
  token,
}: {
  body: FormData;
  onProgress: (progress: number) => void;
  storagePath: string;
  token: string;
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }

      reject(new Error(getStorageErrorMessage(xhr)));
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed before the file reached storage.'));
    };

    xhr.open(
      'POST',
      `${getSupabaseUrl()}/storage/v1/object/${BAND_ASSETS_BUCKET}/${encodeStoragePath(
        storagePath,
      )}`,
    );
    xhr.setRequestHeader('apikey', getSupabaseAnonKey());
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.send(body);
  });
}

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.');
  }

  return url.replace(/\/$/, '');
}

function getSupabaseAnonKey() {
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLIC_KEY.');
  }

  return publicKey;
}

function encodeStoragePath(storagePath: string) {
  return storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function getStorageErrorMessage(xhr: XMLHttpRequest) {
  const fallback = `Storage upload failed with status ${xhr.status}.`;

  if (!xhr.responseText) {
    return fallback;
  }

  try {
    const response = JSON.parse(xhr.responseText) as {
      error?: string;
      message?: string;
    };

    return response.message ?? response.error ?? fallback;
  } catch {
    return xhr.responseText;
  }
}

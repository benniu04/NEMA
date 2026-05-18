import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDownloadResumable,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  DownloadResumable,
  DownloadProgressData,
} from 'expo-file-system/legacy';
import api from './api';
import type { Movie } from '../types';

export interface DownloadEntry {
  movieId: string;
  title: string;
  posterUrl?: string;
  localUri: string;
  sizeBytes: number;
  downloadedAt: string;
}

export interface DownloadUrlResponse {
  url: string;
  expiresAt: string;
}

const INDEX_KEY = 'downloads:index';
const DOWNLOADS_DIR = documentDirectory ? `${documentDirectory}downloads/` : null;

const ensureDownloadsDir = async (): Promise<void> => {
  if (!DOWNLOADS_DIR) {
    throw new Error('File system is not available on this platform');
  }
  const info = await getInfoAsync(DOWNLOADS_DIR);
  if (!info.exists) {
    await makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
  }
};

const readIndex = async (): Promise<Record<string, DownloadEntry>> => {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, DownloadEntry>;
  } catch (error) {
    console.error('Error reading downloads index:', error);
    return {};
  }
};

const writeIndex = async (index: Record<string, DownloadEntry>): Promise<void> => {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
};

export const downloadsService = {
  async requestDownloadUrl(movieId: string): Promise<DownloadUrlResponse> {
    const { data } = await api.get<DownloadUrlResponse>(`/api/movies/${movieId}/download-url`);
    return data;
  },

  async list(): Promise<DownloadEntry[]> {
    const index = await readIndex();
    return Object.values(index).sort(
      (a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
    );
  },

  async get(movieId: string): Promise<DownloadEntry | null> {
    const index = await readIndex();
    return index[movieId] ?? null;
  },

  /**
   * Kicks off a resumable download. Returns the underlying DownloadResumable so
   * callers can pause/cancel. Resolves with the finished DownloadEntry.
   *
   * Callers should treat the returned handle as the source of truth for cancel;
   * the promise will reject if the user cancels.
   */
  startDownload(
    movie: Movie,
    onProgress?: (progress: number) => void
  ): { handle: DownloadResumable; promise: Promise<DownloadEntry> } {
    if (!DOWNLOADS_DIR) {
      throw new Error('File system is not available on this platform');
    }

    const targetUri = `${DOWNLOADS_DIR}${movie._id}.mp4`;

    const progressCallback = (data: DownloadProgressData) => {
      if (data.totalBytesExpectedToWrite > 0) {
        onProgress?.(data.totalBytesWritten / data.totalBytesExpectedToWrite);
      }
    };

    // The signed URL is fetched lazily inside the promise so it isn't held in
    // memory longer than necessary.
    let handle: DownloadResumable | null = null;

    const promise = (async (): Promise<DownloadEntry> => {
      await ensureDownloadsDir();

      // Clear any leftover partial file from a previous failed attempt.
      const existing = await getInfoAsync(targetUri);
      if (existing.exists) {
        await deleteAsync(targetUri, { idempotent: true });
      }

      const { url } = await downloadsService.requestDownloadUrl(movie._id);

      handle = createDownloadResumable(url, targetUri, {}, progressCallback);
      const result = await handle.downloadAsync();
      if (!result) {
        throw new Error('Download was cancelled');
      }

      const info = await getInfoAsync(result.uri);
      const sizeBytes = info.exists ? info.size : 0;

      const entry: DownloadEntry = {
        movieId: movie._id,
        title: movie.title,
        posterUrl: movie.posterUrl,
        localUri: result.uri,
        sizeBytes,
        downloadedAt: new Date().toISOString(),
      };

      const index = await readIndex();
      index[movie._id] = entry;
      await writeIndex(index);

      return entry;
    })();

    // Return a proxy handle that becomes valid once the real one is created.
    // The caller only uses it to cancel, which is safe to call before the real
    // handle exists (we just check for null).
    const handleProxy = new Proxy({} as DownloadResumable, {
      get: (_, prop) => {
        if (!handle) {
          if (prop === 'cancelAsync' || prop === 'pauseAsync') {
            return async () => undefined;
          }
          return undefined;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (handle as any)[prop];
        return typeof value === 'function' ? value.bind(handle) : value;
      },
    });

    return { handle: handleProxy, promise };
  },

  async deleteDownload(movieId: string): Promise<void> {
    const index = await readIndex();
    const entry = index[movieId];
    if (!entry) return;

    try {
      await deleteAsync(entry.localUri, { idempotent: true });
    } catch (error) {
      console.warn('Failed to delete download file (continuing):', error);
    }

    delete index[movieId];
    await writeIndex(index);
  },

  /**
   * Verify each indexed entry still has its file on disk; remove stale entries.
   * Call on app start so the UI never shows a download that the OS evicted.
   */
  async reconcile(): Promise<DownloadEntry[]> {
    const index = await readIndex();
    let mutated = false;

    for (const [movieId, entry] of Object.entries(index)) {
      const info = await getInfoAsync(entry.localUri);
      if (!info.exists) {
        delete index[movieId];
        mutated = true;
      }
    }

    if (mutated) await writeIndex(index);
    return Object.values(index);
  },
};

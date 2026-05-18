import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { downloadsService, DownloadEntry } from '../services/downloads';
import type { DownloadResumable } from 'expo-file-system/legacy';
import type { Movie } from '../types';

interface ActiveDownload {
  movieId: string;
  title: string;
  posterUrl?: string;
  progress: number;
  handle: DownloadResumable;
}

interface DownloadsContextValue {
  downloads: Record<string, DownloadEntry>;
  activeDownloads: Record<string, ActiveDownload>;
  isInitialized: boolean;
  startDownload: (movie: Movie) => Promise<void>;
  cancelDownload: (movieId: string) => Promise<void>;
  deleteDownload: (movieId: string) => Promise<void>;
  getDownload: (movieId: string) => DownloadEntry | undefined;
  getActiveDownload: (movieId: string) => ActiveDownload | undefined;
}

const DownloadsContext = createContext<DownloadsContextValue | null>(null);

export const useDownloads = (): DownloadsContextValue => {
  const ctx = useContext(DownloadsContext);
  if (!ctx) {
    throw new Error('useDownloads must be used within a DownloadsProvider');
  }
  return ctx;
};

export const DownloadsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<Record<string, DownloadEntry>>({});
  const [activeDownloads, setActiveDownloads] = useState<Record<string, ActiveDownload>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Keep a stable ref to the latest active downloads for cleanup on unmount
  // without making the cancel handler re-create.
  const activeRef = useRef(activeDownloads);
  activeRef.current = activeDownloads;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = await downloadsService.reconcile();
        if (cancelled) return;
        const map: Record<string, DownloadEntry> = {};
        for (const entry of entries) map[entry.movieId] = entry;
        setDownloads(map);
      } catch (error) {
        console.error('Failed to load downloads index:', error);
      } finally {
        if (!cancelled) setIsInitialized(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startDownload = useCallback(async (movie: Movie): Promise<void> => {
    if (activeRef.current[movie._id] || downloads[movie._id]) return;

    const { handle, promise } = downloadsService.startDownload(movie, (progress) => {
      setActiveDownloads((prev) => {
        const existing = prev[movie._id];
        if (!existing) return prev;
        return { ...prev, [movie._id]: { ...existing, progress } };
      });
    });

    setActiveDownloads((prev) => ({
      ...prev,
      [movie._id]: {
        movieId: movie._id,
        title: movie.title,
        posterUrl: movie.posterUrl,
        progress: 0,
        handle,
      },
    }));

    try {
      const entry = await promise;
      setDownloads((prev) => ({ ...prev, [movie._id]: entry }));
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    } finally {
      setActiveDownloads((prev) => {
        const next = { ...prev };
        delete next[movie._id];
        return next;
      });
    }
  }, [downloads]);

  const cancelDownload = useCallback(async (movieId: string): Promise<void> => {
    const active = activeRef.current[movieId];
    if (!active) return;
    try {
      await active.handle.cancelAsync();
    } catch (error) {
      console.warn('Failed to cancel download:', error);
    }
    setActiveDownloads((prev) => {
      const next = { ...prev };
      delete next[movieId];
      return next;
    });
  }, []);

  const deleteDownload = useCallback(async (movieId: string): Promise<void> => {
    await downloadsService.deleteDownload(movieId);
    setDownloads((prev) => {
      const next = { ...prev };
      delete next[movieId];
      return next;
    });
  }, []);

  const getDownload = useCallback(
    (movieId: string) => downloads[movieId],
    [downloads]
  );

  const getActiveDownload = useCallback(
    (movieId: string) => activeDownloads[movieId],
    [activeDownloads]
  );

  const value = useMemo<DownloadsContextValue>(
    () => ({
      downloads,
      activeDownloads,
      isInitialized,
      startDownload,
      cancelDownload,
      deleteDownload,
      getDownload,
      getActiveDownload,
    }),
    [downloads, activeDownloads, isInitialized, startDownload, cancelDownload, deleteDownload, getDownload, getActiveDownload]
  );

  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
};

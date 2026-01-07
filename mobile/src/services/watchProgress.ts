import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WatchProgressItem {
  movieId: string;
  position: number;        // Current position in milliseconds
  duration: number;        // Total duration in milliseconds
  percentage: number;      // Progress percentage (0-100)
  lastWatched: string;     // ISO timestamp
  thumbnailUrl?: string;   // Cached for quick display
  title?: string;          // Cached for quick display
}

const WATCH_PROGRESS_KEY = 'watchProgress';
const MAX_ITEMS = 20;
const PROGRESS_THRESHOLD_START = 2;   // 2% - minimum to track
const PROGRESS_THRESHOLD_END = 95;    // 95% - considered complete

export const watchProgressService = {
  async getAll(): Promise<WatchProgressItem[]> {
    try {
      const data = await AsyncStorage.getItem(WATCH_PROGRESS_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting watch progress:', error);
      return [];
    }
  },

  async get(movieId: string): Promise<WatchProgressItem | null> {
    try {
      const items = await this.getAll();
      return items.find(item => item.movieId === movieId) || null;
    } catch (error) {
      console.error('Error getting watch progress for movie:', error);
      return null;
    }
  },

  async save(item: WatchProgressItem): Promise<void> {
    try {
      // Don't save if below threshold
      if (item.percentage < PROGRESS_THRESHOLD_START) {
        return;
      }

      // If above completion threshold, remove instead
      if (item.percentage >= PROGRESS_THRESHOLD_END) {
        await this.remove(item.movieId);
        return;
      }

      const items = await this.getAll();
      const existingIndex = items.findIndex(i => i.movieId === item.movieId);

      if (existingIndex >= 0) {
        items[existingIndex] = item;
      } else {
        items.unshift(item);
      }

      // Sort by lastWatched (most recent first) and limit
      const sorted = items
        .sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime())
        .slice(0, MAX_ITEMS);

      await AsyncStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(sorted));
    } catch (error) {
      console.error('Error saving watch progress:', error);
    }
  },

  async remove(movieId: string): Promise<void> {
    try {
      const items = await this.getAll();
      const filtered = items.filter(item => item.movieId !== movieId);
      await AsyncStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing watch progress:', error);
    }
  },

  async getContinueWatching(): Promise<WatchProgressItem[]> {
    try {
      const items = await this.getAll();
      // Return items between threshold start and end, sorted by most recently watched
      return items
        .filter(item => item.percentage >= PROGRESS_THRESHOLD_START && item.percentage < PROGRESS_THRESHOLD_END)
        .sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime());
    } catch (error) {
      console.error('Error getting continue watching:', error);
      return [];
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WATCH_PROGRESS_KEY);
    } catch (error) {
      console.error('Error clearing watch progress:', error);
    }
  },
};

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import API_BASE_URL from '../config/api';

// Type Definitions
interface VideoUrls {
  '720p': string;
  '1080p': string;
  hls?: string;
}

interface SubtitleUrls {
  en: string;
  es: string;
  fr: string;
  de: string;
  zh: string;
  ja: string;
  ko: string;
  pt: string;
}

interface Movie {
  _id: string;
  title: string;
  description: string;
  rating: number;
  releaseDate: string;
  genre: string | string[];
  director: string;
  cast: string | string[];
  language: string;
  videoUrls: VideoUrls;
  subtitleUrls?: SubtitleUrls;
  thumbnailUrl: string;
  posterUrl: string;
  thumbnailKey?: string;
  posterKey?: string;
  hasImageVariants?: boolean;
  isFeatured: boolean;
  isHero: boolean;
  tags: string | string[];
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

interface FormData {
  title: string;
  description: string;
  rating: number;
  releaseDate: string;
  genre: string;
  director: string;
  cast: string;
  language: string;
  videoUrls: VideoUrls;
  subtitleUrls: SubtitleUrls;
  thumbnailUrl: string;
  posterUrl: string;
  thumbnailKey?: string;
  posterKey?: string;
  hasImageVariants?: boolean;
  isFeatured: boolean;
  tags: string;
}

interface UploadProgress {
  'video-720p': number;
  'video-1080p': number;
  thumbnail: number;
  poster: number;
}

interface Analytics {
  topGenres: [string, number][];
  topDirectors: [string, number][];
  languageCount: Record<string, number>;
  avgRating: string | number;
  highRatedMovies: number;
  recentMovies: number;
  yearCount: Record<number, number>;
  moviesWithVideo: number;
  movies720p: number;
  movies1080p: number;
}

interface UserData {
  isAdmin: boolean;
  [key: string]: unknown;
}

interface UploadResponse {
  key: string;
  hasVariants?: boolean;
  message?: string;
}

interface TranscodeEnqueueResponse {
  jobId: string;
  originalKey: string;
  message?: string;
}

interface TranscodeStatusResponse {
  jobId: string;
  status: 'waiting' | 'active' | 'delayed' | 'completed' | 'failed' | 'paused' | 'stuck';
  progress: number | Record<string, unknown>;
  hlsKey: string | null;
  failedReason: string | null;
}

type TabKey = 'overview' | 'upload' | 'manage';
type UploadType = 'video' | 'thumbnail' | 'poster';
type VideoQuality = '720p' | '1080p';
type SubtitleLang = keyof SubtitleUrls;

const INITIAL_FORM_DATA: FormData = {
  title: '',
  description: '',
  rating: 0,
  releaseDate: '',
  genre: '',
  director: '',
  cast: '',
  language: 'English',
  videoUrls: { '720p': '', '1080p': '' },
  subtitleUrls: {
    en: '', es: '', fr: '', de: '',
    zh: '', ja: '', ko: '', pt: ''
  },
  thumbnailUrl: '',
  posterUrl: '',
  hasImageVariants: false,
  isFeatured: false,
  tags: ''
};

const SUBTITLE_LANGUAGES: Record<SubtitleLang, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  pt: 'Portuguese'
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    'video-720p': 0,
    'video-1080p': 0,
    thumbnail: 0,
    poster: 0
  });

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include'
        });

        if (response.ok) {
          const userData: UserData = await response.json();
          if (userData.isAdmin) {
            setAuthChecked(true);
            fetchMovies();
            return;
          }
        }
        navigate('/admin/login');
      } catch (err) {
        console.error('Auth check failed:', err);
        navigate('/admin/login');
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchMovies = async (bustCache = false): Promise<void> => {
    try {
      setLoading(true);
      const url = bustCache
        ? `${API_BASE_URL}/api/movies?_t=${Date.now()}`
        : `${API_BASE_URL}/api/movies`;

      const response = await fetch(url, { cache: 'no-cache' });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: Movie[] = await response.json();
      setMovies(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load movies: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (): void => {
    setFormData(INITIAL_FORM_DATA);
    setEditingMovie(null);
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = (): void => {
    resetForm();
    setActiveTab('manage');
  };

  const getAnalytics = (): Analytics | null => {
    if (movies.length === 0) return null;

    const genreCount: Record<string, number> = {};
    movies.forEach(movie => {
      if (Array.isArray(movie.genre)) {
        movie.genre.forEach(g => {
          genreCount[g] = (genreCount[g] || 0) + 1;
        });
      }
    });
    const topGenres = Object.entries(genreCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5) as [string, number][];

    const directorCount: Record<string, number> = {};
    movies.forEach(movie => {
      directorCount[movie.director] = (directorCount[movie.director] || 0) + 1;
    });
    const topDirectors = Object.entries(directorCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3) as [string, number][];

    const languageCount: Record<string, number> = {};
    movies.forEach(movie => {
      languageCount[movie.language] = (languageCount[movie.language] || 0) + 1;
    });

    const ratings = movies.map(m => parseFloat(String(m.rating))).filter(r => !isNaN(r));
    const avgRating = ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : 0;
    const highRatedMovies = movies.filter(m => parseFloat(String(m.rating)) >= 8).length;

    const currentYear = new Date().getFullYear();
    const recentMovies = movies.filter(
      m => new Date(m.releaseDate).getFullYear() >= currentYear - 2
    ).length;

    const yearCount: Record<number, number> = {};
    movies.forEach(movie => {
      const year = new Date(movie.releaseDate).getFullYear();
      yearCount[year] = (yearCount[year] || 0) + 1;
    });

    const moviesWithVideo = movies.filter(
      m => m.videoUrls?.['720p'] || m.videoUrls?.['1080p']
    ).length;
    const movies720p = movies.filter(m => m.videoUrls?.['720p']).length;
    const movies1080p = movies.filter(m => m.videoUrls?.['1080p']).length;

    return {
      topGenres,
      topDirectors,
      languageCount,
      avgRating,
      highRatedMovies,
      recentMovies,
      yearCount,
      moviesWithVideo,
      movies720p,
      movies1080p
    };
  };

  const analytics = getAnalytics();

  const handleEdit = (movie: Movie): void => {
    setEditingMovie(movie);
    setFormData({
      title: movie.title,
      description: movie.description,
      rating: movie.rating,
      releaseDate: new Date(movie.releaseDate).toISOString().split('T')[0],
      genre: Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre,
      director: movie.director,
      cast: Array.isArray(movie.cast) ? movie.cast.join(', ') : movie.cast,
      language: movie.language,
      videoUrls: movie.videoUrls || { '720p': '', '1080p': '' },
      subtitleUrls: movie.subtitleUrls || INITIAL_FORM_DATA.subtitleUrls,
      thumbnailUrl: movie.thumbnailUrl || '',
      posterUrl: movie.posterUrl || '',
      thumbnailKey: movie.thumbnailKey || '',
      posterKey: movie.posterKey || '',
      hasImageVariants: movie.hasImageVariants === true,
      isFeatured: movie.isFeatured,
      tags: Array.isArray(movie.tags) ? movie.tags.join(', ') : movie.tags
    });
    setActiveTab('upload');
  };

  const handleDelete = async (movieId: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this movie?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/movies/${movieId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete movie');

      setSuccess('Movie deleted successfully');
      fetchMovies(true);
    } catch {
      setError('Failed to delete movie');
    }
  };

  const handleSetHero = async (movieId: string, movieTitle: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/movies/${movieId}/set-hero`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to set hero movie');

      setSuccess(`"${movieTitle}" is now the hero movie`);
      fetchMovies(true);
    } catch {
      setError('Failed to set hero movie');
    }
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = type === 'checkbox' ? target.checked : undefined;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      
      if (parent === 'videoUrls') {
        setFormData(prev => ({
          ...prev,
          videoUrls: { ...prev.videoUrls, [child]: value }
        }));
      } else if (parent === 'subtitleUrls') {
        setFormData(prev => ({
          ...prev,
          subtitleUrls: { ...prev.subtitleUrls, [child as keyof SubtitleUrls]: value }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const hasVideo = formData.videoUrls['720p'] || formData.videoUrls['1080p'];
    if (!hasVideo) {
      setError('Please upload at least one video file (720p or 1080p) before submitting.');
      return;
    }

    if (!formData.posterKey && !formData.posterUrl) {
      setError('Please upload a poster image before submitting.');
      return;
    }

    if (!formData.thumbnailKey && !formData.thumbnailUrl) {
      setError('Please upload a thumbnail image before submitting.');
      return;
    }

    setLoading(true);

    try {
      const url = editingMovie
        ? `${API_BASE_URL}/api/movies/${editingMovie._id}`
        : `${API_BASE_URL}/api/movies`;

      const method = editingMovie ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const responseText = await response.text();
      let data: { message?: string };
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Server returned invalid response: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      setSuccess(
        editingMovie
          ? 'Movie updated successfully! Redirecting...'
          : 'Movie uploaded successfully! Redirecting...'
      );

      setTimeout(() => {
        resetForm();
        fetchMovies(true);
        setActiveTab('manage');
        setSuccess('');
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to ${editingMovie ? 'update' : 'add'} movie: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const pollTranscodeJob = async (jobId: string, progressKey: string): Promise<string> => {
    const pollIntervalMs = 2000;
    const timeoutMs = 60 * 60 * 1000;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      await new Promise(r => setTimeout(r, pollIntervalMs));
      const res = await fetch(`${API_BASE_URL}/api/upload/video/${jobId}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`Status check failed (${res.status})`);
      const status: TranscodeStatusResponse = await res.json();

      const pct = typeof status.progress === 'number' ? Math.max(1, Math.min(99, status.progress)) : 50;
      setUploadProgress(prev => ({ ...prev, [progressKey]: pct }));

      if (status.status === 'completed' && status.hlsKey) return status.hlsKey;
      if (status.status === 'failed') throw new Error(status.failedReason || 'Transcoding failed');
    }
    throw new Error('Transcoding timed out');
  };

  const handleFileUpload = async (
    file: File | undefined,
    type: UploadType,
    quality?: VideoQuality
  ): Promise<void> => {
    if (!file) return;

    setUploading(true);
    const progressKey = type === 'video' ? `video-${quality}` : type;
    setUploadProgress(prev => ({ ...prev, [progressKey]: 0 }));

    try {
      const uploadFormData = new FormData();
      const endpoint = type === 'video' ? 'video' : 'image';
      uploadFormData.append(type === 'video' ? 'video' : 'image', file);
      if (type !== 'video') uploadFormData.append('type', type);

      const response = await fetch(`${API_BASE_URL}/api/upload/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData
      });

      const responseText = await response.text();

      if (type === 'video') {
        const enqueued: TranscodeEnqueueResponse = JSON.parse(responseText);
        if (!response.ok) throw new Error(enqueued.message || 'Upload failed');

        setSuccess('Video uploaded, transcoding in progress...');
        const hlsKey = await pollTranscodeJob(enqueued.jobId, progressKey);

        setFormData(prev => ({
          ...prev,
          videoUrls: {
            ...prev.videoUrls,
            hls: hlsKey,
            ...(quality ? { [quality]: hlsKey } : {})
          }
        }));
        setUploadProgress(prev => ({ ...prev, [progressKey]: 100 }));
        setSuccess('Video transcoded and ready!');
      } else {
        const data: UploadResponse = JSON.parse(responseText);
        if (!response.ok) throw new Error(data.message || 'Upload failed');

        const keyField = type === 'thumbnail' ? 'thumbnailKey' : 'posterKey';
        setFormData(prev => ({
          ...prev,
          [keyField]: data.key,
          ...(type === 'poster' ? { hasImageVariants: data.hasVariants === true } : {})
        }));
        setUploadProgress(prev => ({ ...prev, [progressKey]: 100 }));
        setSuccess(`${type} uploaded successfully!`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to upload ${type}: ${message}`);
      setUploadProgress(prev => ({ ...prev, [progressKey]: 0 }));
    } finally {
      setUploading(false);
    }
  };

  const handleSubtitleUpload = async (
    file: File | undefined,
    lang: SubtitleLang
  ): Promise<void> => {
    if (!file) return;

    setUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('subtitle', file);
      uploadFormData.append('language', lang);

      const response = await fetch(`${API_BASE_URL}/api/upload/subtitle`, {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData
      });

      const data: UploadResponse = await response.json();

      if (!response.ok) throw new Error(data.message || 'Subtitle upload failed');

      setFormData(prev => ({
        ...prev,
        subtitleUrls: { ...prev.subtitleUrls, [lang]: data.key }
      }));

      setSuccess(`${lang.toUpperCase()} subtitle uploaded successfully!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to upload subtitle: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    navigate('/admin/login');
  };

  interface TabButtonProps {
    tabKey: TabKey;
    label: string;
    icon: React.ReactNode;
  }

  const TabButton: React.FC<TabButtonProps> = ({ tabKey, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabKey)}
      className={`flex items-center gap-3 px-6 py-3 rounded-lg transition-all ${
        activeTab === tabKey
          ? 'bg-amber-500/20 text-amber-100 border border-amber-500/30'
          : 'text-amber-100/60 hover:text-amber-100/80 hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {!authChecked ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p>Checking authentication...</p>
          </div>
        </div>
      ) : (
        <div className="relative min-h-screen pt-20">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/3 -left-40 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-light mb-2">Admin Dashboard</h1>
                <p className="text-amber-100/60">Manage your film collection</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-amber-100/20 rounded-lg text-amber-100/60 hover:bg-white/5 transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-4 mb-8 border-b border-amber-100/20 pb-6">
              <TabButton
                tabKey="overview"
                label="Overview"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
              <TabButton
                tabKey="upload"
                label={editingMovie ? 'Edit Movie' : 'Upload New'}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              />
              <TabButton
                tabKey="manage"
                label="Manage Movies"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                }
              />
            </div>

            {/* Alerts */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Error:</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg mb-6">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Success:</span>
                  <span>{success}</span>
                </div>
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/5 border border-amber-100/20 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-amber-100/90 mb-2">Total Movies</h3>
                    <p className="text-3xl font-light">{movies.length}</p>
                    <p className="text-xs text-amber-100/40 mt-1">Movies in database</p>
                  </div>
                  <div className="bg-white/5 border border-amber-100/20 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-amber-100/90 mb-2">Featured Movies</h3>
                    <p className="text-3xl font-light">{movies.filter(m => m.isFeatured).length}</p>
                    <p className="text-xs text-amber-100/40 mt-1">Currently featured</p>
                  </div>
                  <div className="bg-white/5 border border-amber-100/20 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-amber-100/90 mb-2">Recent Uploads</h3>
                    <p className="text-3xl font-light">
                      {movies.filter(m => new Date(m.createdAt || m.releaseDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                    </p>
                    <p className="text-xs text-amber-100/40 mt-1">In last 30 days</p>
                  </div>
                </div>

                <div className="bg-white/5 border border-amber-100/20 rounded-lg p-6">
                  <h3 className="text-xl font-medium text-amber-100/90 mb-4">Quick Actions</h3>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-100 hover:bg-amber-500/30 transition-colors"
                    >
                      Upload New Movie
                    </button>
                    <button
                      onClick={() => setActiveTab('manage')}
                      className="px-4 py-2 bg-white/5 border border-amber-100/20 rounded-lg text-amber-100/80 hover:bg-white/10 transition-colors"
                    >
                      Manage Movies
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Upload/Edit Tab */}
            {activeTab === 'upload' && (
              <div className="max-w-4xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-light">
                    {editingMovie ? `Edit "${editingMovie.title}"` : 'Upload New Movie'}
                  </h2>
                  {editingMovie && (
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-amber-100/20 rounded-lg text-amber-100/60 hover:bg-white/5"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">Title *</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">Director *</label>
                      <input
                        type="text"
                        name="director"
                        value={formData.director}
                        onChange={handleChange}
                        required
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">Release Date *</label>
                      <input
                        type="date"
                        name="releaseDate"
                        value={formData.releaseDate}
                        onChange={handleChange}
                        required
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">Genre (comma-separated) *</label>
                      <input
                        type="text"
                        name="genre"
                        value={formData.genre}
                        onChange={handleChange}
                        required
                        placeholder="Action, Adventure, Sci-Fi"
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">Language</label>
                      <input
                        type="text"
                        name="language"
                        value={formData.language}
                        onChange={handleChange}
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">Cast (comma-separated)</label>
                      <input
                        type="text"
                        name="cast"
                        value={formData.cast}
                        onChange={handleChange}
                        placeholder="Actor 1, Actor 2, Actor 3"
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">Tags (comma-separated)</label>
                      <input
                        type="text"
                        name="tags"
                        value={formData.tags}
                        onChange={handleChange}
                        placeholder="tag1, tag2, tag3"
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-amber-100/60 mb-2">Description *</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      rows={4}
                      className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  {/* File Upload Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">
                        720p Video File {formData.videoUrls['720p'] && <span className="text-green-400">✓</span>}
                      </label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileUpload(e.target.files?.[0], 'video', '720p')}
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-amber-500/20 file:text-amber-100"
                      />
                      {formData.videoUrls['720p'] && <p className="text-xs text-green-400 mt-1">✓ 720p video ready</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">
                        1080p Video File {formData.videoUrls['1080p'] && <span className="text-green-400">✓</span>}
                      </label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileUpload(e.target.files?.[0], 'video', '1080p')}
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-amber-500/20 file:text-amber-100"
                      />
                      {formData.videoUrls['1080p'] && <p className="text-xs text-green-400 mt-1">✓ 1080p video ready</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">Thumbnail File</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files?.[0], 'thumbnail')}
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-amber-500/20 file:text-amber-100"
                      />
                      {uploadProgress.thumbnail > 0 && uploadProgress.thumbnail < 100 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress.thumbnail}%` }}></div>
                          </div>
                          <p className="text-xs text-amber-100/60 mt-1">Uploading thumbnail...</p>
                        </div>
                      )}
                      {formData.thumbnailUrl && <p className="text-xs text-green-400 mt-1">✓ Thumbnail uploaded</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">Poster File</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files?.[0], 'poster')}
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-amber-500/20 file:text-amber-100"
                      />
                      {uploadProgress.poster > 0 && uploadProgress.poster < 100 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress.poster}%` }}></div>
                          </div>
                          <p className="text-xs text-amber-100/60 mt-1">Uploading poster...</p>
                        </div>
                      )}
                      {formData.posterUrl && <p className="text-xs text-green-400 mt-1">✓ Poster uploaded</p>}
                    </div>
                  </div>

                  {/* Subtitles Section */}
                  <div className="border-t border-amber-100/10 pt-6 mt-6">
                    <h3 className="text-lg font-medium text-amber-100 mb-4">Subtitles (VTT files)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {(Object.entries(SUBTITLE_LANGUAGES) as [SubtitleLang, string][]).map(([lang, label]) => (
                        <div key={lang}>
                          <label className="block text-sm font-medium text-amber-100/60 mb-2">
                            {label} {formData.subtitleUrls?.[lang] && <span className="text-green-400">✓</span>}
                          </label>
                          <input
                            type="file"
                            accept=".vtt,.srt"
                            onChange={(e) => handleSubtitleUpload(e.target.files?.[0], lang)}
                            className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-amber-500/20 file:text-amber-100 file:text-xs"
                          />
                          {formData.subtitleUrls?.[lang] && (
                            <p className="text-xs text-green-400 mt-1 truncate">✓ {label} subtitle ready</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-amber-100/40 mt-3">Upload .vtt or .srt subtitle files for each language</p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={formData.isFeatured}
                      onChange={handleChange}
                      className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-amber-100/20 rounded bg-white/5"
                    />
                    <label className="ml-2 block text-sm text-amber-100/60">Feature this movie</label>
                  </div>

                  <div className="flex justify-end space-x-4 pt-6">
                    <button
                      type="button"
                      onClick={editingMovie ? handleCancelEdit : resetForm}
                      className="px-6 py-3 border border-amber-100/20 rounded-lg text-amber-100/60 hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || uploading || (!formData.videoUrls['720p'] && !formData.videoUrls['1080p'])}
                      className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                        loading || uploading || (!formData.videoUrls['720p'] && !formData.videoUrls['1080p'])
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-amber-500 text-black hover:bg-amber-400'
                      }`}
                    >
                      {loading
                        ? (editingMovie ? 'Updating Movie...' : 'Saving Movie...')
                        : uploading
                          ? 'Uploading Files...'
                          : (editingMovie ? 'Save Changes' : 'Add Movie')
                      }
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Manage Movies Tab */}
            {activeTab === 'manage' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-light">Manage Movies</h2>
                    <p className="text-amber-100/60 text-sm mt-1">
                      {loading ? 'Loading...' : `${movies.length} movies found`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab('upload');
                    }}
                    className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-100 hover:bg-amber-500/30 transition-colors"
                  >
                    Add New Movie
                  </button>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="text-amber-100/60">Loading movies...</div>
                  </div>
                ) : movies.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-amber-100/60">No movies found. Upload your first movie to get started!</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {movies.map((movie) => (
                      <div key={movie._id} className="bg-white/5 border border-amber-100/20 rounded-lg overflow-hidden">
                        <div
                          className="h-48 bg-cover bg-center"
                          style={{ backgroundImage: `url(${movie.thumbnailUrl})` }}
                        />
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-medium text-white line-clamp-1">{movie.title}</h3>
                            <div className="flex gap-1">
                              {movie.isHero && (
                                <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-100">
                                  Hero
                                </span>
                              )}
                              {movie.isFeatured && (
                                <span className="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-100">
                                  Featured
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-amber-100/70 text-sm mb-1">{movie.director}</p>
                          <p className="text-amber-100/60 text-sm mb-3">{new Date(movie.releaseDate).getFullYear()}</p>
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(movie)}
                                className="flex-1 px-3 py-2 bg-amber-500/20 border border-amber-500/30 rounded text-sm text-amber-100 hover:bg-amber-500/30 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(movie._id)}
                                className="flex-1 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded text-sm text-red-100 hover:bg-red-500/30 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                            {!movie.isHero && (
                              <button
                                onClick={() => handleSetHero(movie._id, movie.title)}
                                className="w-full px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded text-sm text-purple-100 hover:bg-purple-500/30 transition-colors"
                              >
                                Set as Hero
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
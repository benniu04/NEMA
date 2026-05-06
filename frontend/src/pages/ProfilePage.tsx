import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useSettings } from '../context/SettingsContext';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import API_BASE_URL from '../config/api';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Types
interface Movie {
  _id: string;
  title: string;
  posterUrl?: string;
  director?: string;
  releaseDate: string;
}

interface Activity {
  _id: string;
  type: 'review' | 'comment' | 'watchlist_add' | 'favorite_add' | 'watched';
  movieId?: Movie;
  rating?: number;
  createdAt: string;
}

interface WatchSession {
  _id: string;
  movieId: Movie;
  completed: boolean;
  completionPercentage: number;
  maxTimeReached?: number;
  videoDuration: number;
  lastUpdatedAt: string;
}

interface Review {
  _id: string;
  movieId: Movie;
  rating: number;
  comment?: string;
  nickname?: string;
  createdAt: string;
}

interface SocialUser {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  isFollowing?: boolean;
}

interface User {
  id?: string;
  _id?: string;
  username: string;
  displayName?: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  watchlist?: Movie[];
  stats?: {
    filmsWatched?: number;
    reviewsWritten?: number;
    followersCount?: number;
    followingCount?: number;
  };
}

interface LocationState {
  tab?: string;
}

interface SocialModalProps {
  title: string;
  emptyMessage: string;
  users: SocialUser[];
  loading: boolean;
  onClose: () => void;
  onFollowAction: (userId: string, isFollowing: boolean) => Promise<void>;
  followActionLoading: Record<string, boolean>;
  currentUserId?: string;
  t: (key: string) => string;
}

type TabKey = 'activity' | 'films' | 'reviews' | 'watchlist';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateProfile, loading, isAuthenticated, refreshUser, removeFromFavorites, followUser, unfollowUser } = useUser();
  const { t } = useSettings();

  const locationState = location.state as LocationState | null;
  const initialTab: TabKey = (locationState?.tab as TabKey) || 'activity';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [deviceId, setDeviceId] = useState<string>('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchSession[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [removingFavorite, setRemovingFavorite] = useState<string | null>(null);

  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followers, setFollowers] = useState<SocialUser[]>([]);
  const [following, setFollowing] = useState<SocialUser[]>([]);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [followActionLoading, setFollowActionLoading] = useState<Record<string, boolean>>({});

  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Initialize device fingerprint for review ownership
  useEffect(() => {
    FingerprintJS.load()
      .then(fp => fp.get())
      .then(result => {
        setDeviceId(result.visitorId);
      })
      .catch(error => {
        console.error('Failed to initialize device fingerprint:', error);
      });
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/profile' } } });
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (locationState?.tab) {
      setActiveTab(locationState.tab as TabKey);
    }
  }, [locationState]);

  useEffect(() => {
    if (user) {
      setBio(user.bio || '');
      loadActivities();
      loadFavorites();
      loadWatchHistory();
    }
  }, [user]);

  // Reload favorites when favoriteFilms changes
  useEffect(() => {
    if (user) {
      loadFavorites();
      loadActivities(); // Also reload activities in case favorites were added
    }
  }, [user?.favoriteFilms?.length]);

  // Load reviews separately once deviceId is available
  useEffect(() => {
    if (user && deviceId) {
      loadUserReviews();
    }
  }, [user, deviceId]);

  const loadActivities = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/activity?limit=10`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const loadFavorites = (): void => {
    // Use favoriteFilms from user context (already populated via /api/users/me)
    if (user?.favoriteFilms) {
      setFavorites(user.favoriteFilms as Movie[]);
    }
  };

  const loadWatchHistory = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/watch-time/history?limit=50`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data: WatchSession[] = await response.json();
        const movieMap = new Map<string, WatchSession>();
        data.forEach(session => {
          if (session.movieId) {
            const existingSession = movieMap.get(session.movieId._id);
            if (!existingSession || new Date(session.lastUpdatedAt) > new Date(existingSession.lastUpdatedAt)) {
              movieMap.set(session.movieId._id, session);
            }
          }
        });
        setWatchHistory(Array.from(movieMap.values()));
      }
    } catch (error) {
      console.error('Failed to load watch history:', error);
    }
  };

  const loadUserReviews = async (): Promise<void> => {
    if (!deviceId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/user/my-reviews?deviceId=${encodeURIComponent(deviceId)}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUserReviews(data);
      }
    } catch (error) {
      console.error('Failed to load user reviews:', error);
    }
  };

  const loadFollowers = async (): Promise<void> => {
    if (!user) return;
    setLoadingSocial(true);
    try {
      const userId = user.id || user._id;
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/followers`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setFollowers(data);
      }
    } catch (error) {
      console.error('Failed to load followers:', error);
    } finally {
      setLoadingSocial(false);
    }
  };

  const loadFollowing = async (): Promise<void> => {
    if (!user) return;
    setLoadingSocial(true);
    try {
      const userId = user.id || user._id;
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/following`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setFollowing(data);
      }
    } catch (error) {
      console.error('Failed to load following:', error);
    } finally {
      setLoadingSocial(false);
    }
  };

  const handleShowFollowers = async (): Promise<void> => {
    setShowFollowersModal(true);
    await loadFollowers();
  };

  const handleShowFollowing = async (): Promise<void> => {
    setShowFollowingModal(true);
    await loadFollowing();
  };

  const handleFollowAction = async (userId: string, currentlyFollowing: boolean): Promise<void> => {
    setFollowActionLoading(prev => ({ ...prev, [userId]: true }));

    try {
      const result = currentlyFollowing
        ? await unfollowUser(userId)
        : await followUser(userId);

      if (result.success) {
        setFollowers(prev => prev.map(u =>
          u.id === userId ? { ...u, isFollowing: !currentlyFollowing } : u
        ));

        if (currentlyFollowing) {
          setFollowing(prev => prev.filter(u => u.id !== userId));
        }

        await refreshUser();

        if (!currentlyFollowing && showFollowingModal) {
          await loadFollowing();
        }
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Follow action error:', error);
    } finally {
      setFollowActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/');
  };

  const handleBioSave = async (): Promise<void> => {
    const result = await updateProfile({ bio });
    if (result.success) {
      setIsEditingBio(false);
    }
  };

  const handleImageUpload = async (file: File | undefined, type: 'avatar' | 'banner'): Promise<void> => {
    if (!file) return;

    if (type === 'banner') {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = async () => {
        URL.revokeObjectURL(objectUrl);

        if (img.width < 1500 || img.height < 500) {
          const proceed = window.confirm(
            `⚠️ ${t('profile.imageResolutionWarning')}\n\n` +
            `${t('profile.currentResolution')} ${img.width}x${img.height}px\n` +
            `${t('profile.recommendedResolution')}\n\n` +
            `${t('profile.imageBlurryWarning')}`
          );

          if (!proceed) return;
        }

        await performUpload(file, type);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        alert(t('profile.failedToLoadImage'));
      };

      img.src = objectUrl;
    } else {
      await performUpload(file, type);
    }
  };

  const performUpload = async (file: File, type: 'avatar' | 'banner'): Promise<void> => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append(type, file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload/${type}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        await updateProfile({ [type]: data.url });
        await refreshUser();
      } else {
        alert(t('profile.failedToUpload'));
      }
    } catch (error) {
      console.error(`Failed to upload ${type}:`, error);
      alert(t('profile.failedToUpload'));
    } finally {
      setIsUploading(false);
    }
  };

  const getActivityIcon = (type: Activity['type']): string => {
    switch (type) {
      case 'review': return '★';
      case 'comment': return '💬';
      case 'watchlist_add': return '📌';
      case 'favorite_add': return '❤️';
      case 'watched': return '✓';
      default: return '•';
    }
  };

  const getActivityText = (activity: Activity): string => {
    const movieTitle = activity.movieId?.title;
    switch (activity.type) {
      case 'review': return `${t('profile.activityReviewed')} ${movieTitle}`;
      case 'comment': return `${t('profile.activityCommented')} ${movieTitle}`;
      case 'watchlist_add': return `${t('profile.activityAddedToWatchlist')} ${movieTitle}`;
      case 'favorite_add': return `${t('profile.activityAddedToFavorites')} ${movieTitle}`;
      case 'watched': return `${t('profile.activityWatched')} ${movieTitle}`;
      default: return '';
    }
  };

  const handleRemoveFavorite = async (movieId: string, movieTitle: string, e: React.MouseEvent): Promise<void> => {
    e.preventDefault();

    const confirmRemove = window.confirm(`${t('profile.removeFavoriteConfirm')} "${movieTitle}"`);
    if (!confirmRemove) return;

    setRemovingFavorite(movieId);
    try {
      const result = await removeFromFavorites(movieId);
      if (result.success) {
        await loadFavorites();
      } else {
        alert(result.error || t('profile.removeFavoriteError'));
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert(t('profile.removeFavoriteError'));
    } finally {
      setRemovingFavorite(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>{t('profile.loadingProfile')}</p>
        </div>
      </div>
    );
  }

  const typedUser = user as User;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <NavBar />

      <main className="flex-grow">
        {/* Banner */}
        <div className="relative h-64 bg-white/5 group">
          {typedUser.banner ? (
            <>
              <img src={typedUser.banner} alt="Banner" className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"></div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute bottom-4 right-4 z-10 group/button">
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="px-3 py-1.5 bg-black/70 text-white text-sm border border-white/20 hover:bg-black/90 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
              disabled={isUploading}
            >
              {isUploading ? t('profile.uploading') : t('profile.changeBanner')}
            </button>
            <div className="absolute top-full right-0 mt-2 w-64 px-3 py-2 bg-black/95 border border-amber-500/30 text-xs text-white/80 opacity-0 group-hover/button:opacity-100 pointer-events-none transition-opacity backdrop-blur-sm">
              <p className="font-medium text-amber-500 mb-1">💡 {t('profile.bannerRecommended')}</p>
              <p>{t('profile.bannerTip')}</p>
            </div>
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleImageUpload(e.target.files?.[0], 'banner')}
          />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="relative -mt-16 mb-8 z-10">
            <div className="flex items-end gap-6">
              <div className="relative z-20">
                <div className="w-32 h-32 bg-white/5 border-4 border-black overflow-hidden shadow-xl">
                  {typedUser.avatar ? (
                    <img src={typedUser.avatar} alt={typedUser.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-light text-white/40">
                      {typedUser.displayName?.charAt(0).toUpperCase() || typedUser.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 pb-2">
                <h1 className="text-3xl font-light mb-1">{typedUser.displayName || typedUser.username}</h1>
                <p className="text-white/50 text-sm mb-3">@{typedUser.username}</p>

                <div className="flex gap-6 text-sm">
                  <button onClick={handleShowFollowers} className="hover:text-white transition-colors cursor-pointer">
                    <span className="text-white font-medium">{typedUser.stats?.followersCount || 0}</span>
                    <span className="text-white/50 ml-1">{t('profile.followers')}</span>
                  </button>
                  <button onClick={handleShowFollowing} className="hover:text-white transition-colors cursor-pointer">
                    <span className="text-white font-medium">{typedUser.stats?.followingCount || 0}</span>
                    <span className="text-white/50 ml-1">{t('profile.following')}</span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors text-sm mb-2"
              >
                {t('profile.signOut')}
              </button>
            </div>
          </div>

          {/* Bio Section */}
          <div className="mb-8 pb-8 border-b border-white/10">
            {isEditingBio ? (
              <div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full bg-white/5 border border-white/20 px-3 py-2 focus:outline-none focus:border-white/40 resize-none text-sm"
                  placeholder={t('profile.tellAboutYourself')}
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleBioSave} className="px-4 py-1.5 bg-white text-black text-sm hover:bg-white/90 transition-colors">
                    {t('profile.save')}
                  </button>
                  <button
                    onClick={() => { setBio(typedUser.bio || ''); setIsEditingBio(false); }}
                    className="px-4 py-1.5 border border-white/20 text-sm hover:border-white/40 transition-colors"
                  >
                    {t('profile.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="group">
                {bio ? (
                  <p className="text-white/70 text-sm leading-relaxed">{bio}</p>
                ) : (
                  <p className="text-white/30 text-sm italic">{t('profile.noBio')}</p>
                )}
                <button
                  onClick={() => setIsEditingBio(true)}
                  className="text-white/40 hover:text-white/60 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {t('profile.editBio')}
                </button>
              </div>
            )}
          </div>

          {/* Favorite Films */}
          {favorites.length >= 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm uppercase tracking-wider text-white/50">
                  {t('profile.favoriteFilms')} ({favorites.length}/5)
                </h2>
                {favorites.length > 0 && (
                  <p className="text-xs text-white/30 italic">{t('profile.hoverToRemove')}</p>
                )}
              </div>
              {favorites.length === 0 ? (
                <div className="text-center py-12 border border-white/10 border-dashed rounded">
                  <p className="text-white/30 mb-2">{t('profile.noFavorites')}</p>
                  <p className="text-white/20 text-sm">{t('profile.noFavoritesDescription')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-4">
                  {favorites.slice(0, 5).map((movie) => (
                    <div key={movie._id} className="relative group cursor-pointer">
                      <div className="transform transition-all duration-300 ease-out group-hover:-translate-y-2">
                        <Link to={`/video/${movie._id}`} className="block relative">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-500 rounded opacity-0 group-hover:opacity-75 blur transition-all duration-500"></div>
                          <div className="relative aspect-[2/3] bg-white/5 overflow-hidden rounded shadow-lg group-hover:shadow-2xl group-hover:shadow-rose-500/20 transition-all duration-300">
                            {movie.posterUrl ? (
                              <img src={movie.posterUrl} alt={movie.title} loading="lazy" decoding="async" className="w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-110" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/20">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                </svg>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>
                        </Link>
                        <button
                          onClick={(e) => handleRemoveFavorite(movie._id, movie.title, e)}
                          disabled={removingFavorite === movie._id}
                          className="absolute top-2 right-2 p-2 bg-amber-500/90 backdrop-blur-sm hover:bg-amber-600 text-white rounded-full shadow-lg transform translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 ease-out hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed z-20"
                          title={t('profile.removeFromFavorites')}
                        >
                          {removingFavorite === movie._id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/95 to-transparent transform translate-y-full group-hover:translate-y-0 transition-all duration-300 ease-out rounded-b z-10">
                          <p className="text-white text-sm font-medium truncate">{movie.title}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-white/10 mb-8">
            <div className="flex gap-8">
              {([
                { key: 'activity' as TabKey, label: t('profile.activity') },
                { key: 'films' as TabKey, label: t('profile.filmsTab') },
                { key: 'reviews' as TabKey, label: t('profile.reviewsTab') },
                { key: 'watchlist' as TabKey, label: t('profile.watchlistTab') }
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-3 text-sm uppercase tracking-wider transition-colors relative ${activeTab === tab.key ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  {tab.label}
                  {tab.key === 'reviews' && userReviews.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-white/10 text-white/60 text-xs rounded">{userReviews.length}</span>
                  )}
                  {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'activity' && (
            <div className="space-y-4 pb-12">
              {activities.length === 0 ? (
                <p className="text-white/30 text-center py-12">{t('profile.noRecentActivity')}</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity._id} className="flex gap-4 pb-4 border-b border-white/5">
                    <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1">
                      <p className="text-white/70 text-sm">
                        <span className="text-white">{typedUser.displayName || typedUser.username}</span>{' '}
                        {getActivityText(activity)}
                      </p>
                      <p className="text-white/40 text-xs mt-1">
                        {new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {activity.rating && <p className="text-white/60 text-sm mt-2">★ {activity.rating}/5</p>}
                    </div>
                    {activity.movieId?.posterUrl && (
                      <Link to={`/video/${activity.movieId._id}`}>
                        <img src={activity.movieId.posterUrl} alt={activity.movieId.title} loading="lazy" decoding="async" className="w-12 h-16 object-cover hover:opacity-80 transition-opacity" />
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'films' && (
            <div className="pb-12">
              {watchHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/30 mb-4">{t('profile.noFilmsWatched')}</p>
                  <Link to="/catalog" className="inline-block px-6 py-2 bg-white text-black hover:bg-white/90 transition-colors">
                    {t('profile.browseFilms')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {watchHistory.map((session) => {
                    const displayPercentage = session.completed ? 100 : Math.round(session.completionPercentage);
                    const resumeTime = session.maxTimeReached || (session.videoDuration * (session.completionPercentage / 100));

                    return (
                      <div key={session._id} className="flex gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group relative">
                        {!session.completed && session.completionPercentage > 5 && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500 text-black text-xs font-medium rounded flex items-center gap-1 z-10">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                            {t('profile.resume')}
                          </div>
                        )}

                        <Link to={`/video/${session.movieId._id}${!session.completed && resumeTime > 0 ? `?t=${Math.floor(resumeTime)}` : ''}`} className="w-20 h-28 flex-shrink-0 bg-white/5 overflow-hidden relative block">
                          {session.movieId.posterUrl ? (
                            <img src={session.movieId.posterUrl} alt={session.movieId.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/20">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                              </svg>
                            </div>
                          )}
                        </Link>

                        <div className="flex-1 min-w-0">
                          <Link to={`/video/${session.movieId._id}${!session.completed && resumeTime > 0 ? `?t=${Math.floor(resumeTime)}` : ''}`} className="block">
                            <h3 className="text-white font-medium mb-1 group-hover:text-amber-500 transition-colors truncate">{session.movieId.title}</h3>
                          </Link>
                          <p className="text-white/50 text-sm mb-3">{session.movieId.director} • {new Date(session.movieId.releaseDate).getFullYear()}</p>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-white/50">
                              <span>{session.completed ? t('profile.completed') : `${displayPercentage}% ${t('profile.watched')}`}</span>
                              <span>{displayPercentage}%</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${session.completed ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${displayPercentage}%` }} />
                            </div>
                          </div>

                          <p className="text-white/40 text-xs mt-2">
                            {t('profile.lastWatched')} {new Date(session.lastUpdatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>

                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                          {session.completed ? (
                            <>
                              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <Link
                                to={`/video/${session.movieId._id}?t=0`}
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-xs font-medium rounded transition-all flex items-center gap-1.5 opacity-0 group-hover:opacity-100"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {t('profile.rewatch')}
                              </Link>
                            </>
                          ) : (
                            <div className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="pb-12">
              {userReviews.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/30 mb-4">{t('profile.noReviews')}</p>
                  <Link to="/catalog" className="inline-block px-6 py-2 bg-white text-black hover:bg-white/90 transition-colors">
                    {t('profile.browseFilmsToReview')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {userReviews.map((review) => (
                    <div key={review._id} className="bg-white/5 border border-white/10 hover:border-white/20 transition-all p-6 rounded">
                      <div className="flex gap-4">
                        <Link to={`/video/${review.movieId._id}`} className="flex-shrink-0 group">
                          <div className="w-24 h-36 bg-white/5 overflow-hidden rounded">
                            {review.movieId.posterUrl ? (
                              <img src={review.movieId.posterUrl} alt={review.movieId.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/20">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </Link>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <Link to={`/video/${review.movieId._id}`} className="text-white font-medium text-lg hover:text-amber-500 transition-colors inline-block">
                                {review.movieId.title}
                              </Link>
                              <p className="text-white/50 text-sm mt-1">{review.movieId.director} • {new Date(review.movieId.releaseDate).getFullYear()}</p>
                            </div>

                            <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 rounded">
                              <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-amber-500 font-bold text-lg">{review.rating}</span>
                              <span className="text-white/40 text-sm">/5</span>
                            </div>
                          </div>

                          {review.comment && <p className="text-white/70 leading-relaxed mb-3 whitespace-pre-wrap">{review.comment}</p>}

                          <div className="flex items-center gap-4 text-xs text-white/40">
                            <span>
                              {t('profile.reviewed')} {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                            {review.nickname && review.nickname !== 'Anonymous' && <span>{t('profile.by')} {review.nickname}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'watchlist' && (
            <div className="pb-12">
              {(!typedUser.watchlist || typedUser.watchlist.length === 0) ? (
                <div className="text-center py-12">
                  <p className="text-white/30 mb-4">{t('profile.watchlistEmpty')}</p>
                  <Link to="/catalog" className="inline-block px-6 py-2 bg-white text-black hover:bg-white/90 transition-colors">
                    {t('profile.browseFilms')}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {typedUser.watchlist
                    .filter((movie): movie is Movie => movie != null && typeof movie === 'object' && '_id' in movie)
                    .map((movie) => (
                      <Link key={movie._id} to={`/video/${movie._id}`} className="group">
                        <div className="aspect-[2/3] bg-white/5 overflow-hidden mb-2">
                          {movie.posterUrl ? (
                            <img src={movie.posterUrl} alt={movie.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/20">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-white/70 group-hover:text-white transition-colors truncate">{movie.title || t('profile.untitled')}</p>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {showFollowersModal && (
        <SocialModal
          title={t('profile.followers')}
          emptyMessage={t('profile.noFollowersYet')}
          users={followers}
          loading={loadingSocial}
          onClose={() => setShowFollowersModal(false)}
          onFollowAction={handleFollowAction}
          followActionLoading={followActionLoading}
          currentUserId={typedUser.id}
          t={t}
        />
      )}

      {showFollowingModal && (
        <SocialModal
          title={t('profile.following')}
          emptyMessage={t('profile.noFollowingYet')}
          users={following}
          loading={loadingSocial}
          onClose={() => setShowFollowingModal(false)}
          onFollowAction={handleFollowAction}
          followActionLoading={followActionLoading}
          currentUserId={typedUser.id}
          t={t}
        />
      )}
    </div>
  );
};

const SocialModal: React.FC<SocialModalProps> = ({
  title,
  emptyMessage,
  users,
  loading,
  onClose,
  onFollowAction,
  followActionLoading,
  currentUserId,
  t
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-black border border-white/20 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col mx-4">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-medium text-white">{title}</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/40">{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded transition-colors">
                  <Link to={`/profile/${user.username}`} onClick={onClose} className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-light text-white/40">
                          {user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${user.username}`} onClick={onClose} className="block group">
                      <p className="text-white font-medium group-hover:text-amber-500 transition-colors truncate">
                        {user.displayName || user.username}
                      </p>
                    </Link>
                    <p className="text-white/50 text-sm truncate">@{user.username}</p>
                  </div>

                  {user.id !== currentUserId && (
                    <button
                      onClick={() => onFollowAction(user.id, user.isFollowing || false)}
                      disabled={followActionLoading[user.id]}
                      className={`px-4 py-1.5 text-sm font-medium rounded transition-all ${
                        user.isFollowing
                          ? 'bg-white/10 border border-white/20 text-white hover:bg-white/5'
                          : 'bg-amber-500 text-black hover:bg-amber-600'
                      } ${followActionLoading[user.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {followActionLoading[user.id] ? '...' : user.isFollowing ? t('people.following') : t('people.follow')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
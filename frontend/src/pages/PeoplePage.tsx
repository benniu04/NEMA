import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useSettings } from '../context/SettingsContext';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import API_BASE_URL from '../config/api';
import { Search, Users, Sparkles, Loader2, Activity, Star, MessageSquare, Heart, Film, Plus } from 'lucide-react';

interface UserSuggestion {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  isFollowing?: boolean;
  stats?: {
    followersCount?: number;
    filmsWatched?: number;
  };
}

interface ActivityItem {
  _id: string;
  type: string;
  userId: {
    username?: string;
    displayName?: string;
    avatar?: string;
  };
  movieId?: {
    _id: string;
    title?: string;
    posterUrl?: string;
  };
  content?: string;
  rating?: number;
  createdAt: string;
}

interface UserCardProps {
  user: UserSuggestion;
  currentUserId: string;
  onFollow: (userId: string, isFollowing: boolean) => void;
  loading: boolean;
  t: (key: string) => string;
}

interface ActivityCardProps {
  activity: ActivityItem;
  t: (key: string) => string;
}

const PeoplePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: userLoading, followUser, unfollowUser } = useUser();
  const { t } = useSettings();
  
  const [activeTab, setActiveTab] = useState('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSuggestion[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

  // Feed state
  const [feedActivities, setFeedActivities] = useState<ActivityItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedOffset, setFeedOffset] = useState(0);

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/people' } } });
    }
  }, [isAuthenticated, userLoading, navigate]);

  // Load suggested users
  useEffect(() => {
    if (isAuthenticated) {
      loadSuggestedUsers();
    }
  }, [isAuthenticated]);

  // Load feed when tab switches to feed
  useEffect(() => {
    if (activeTab === 'feed' && isAuthenticated && feedActivities.length === 0) {
      loadFeed(true);
    }
  }, [activeTab, isAuthenticated]);

  const loadSuggestedUsers = async () => {
    try {
      setLoadingSuggested(true);
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/api/users/suggested`, {
        credentials: 'include',
        headers
      });
      if (response.ok) {
        const data = await response.json();
        setSuggestedUsers(data);
      }
    } catch (error) {
      console.error('Failed to load suggested users:', error);
    } finally {
      setLoadingSuggested(false);
    }
  };

  const loadFeed = async (reset = false) => {
    if (feedLoading) return;

    setFeedLoading(true);
    const offset = reset ? 0 : feedOffset;

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/api/users/feed?limit=20&offset=${offset}`, {
        credentials: 'include',
        headers
      });

      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setFeedActivities(data.activities);
        } else {
          setFeedActivities(prev => [...prev, ...data.activities]);
        }
        setFeedHasMore(data.hasMore);
        setFeedOffset(offset + data.activities.length);
      }
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setFeedLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true);
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(
          `${API_BASE_URL}/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`,
          { 
            credentials: 'include',
            headers
          }
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleFollow = async (userId: string, currentlyFollowing: boolean) => {
    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    
    try {
      const result = currentlyFollowing 
        ? await unfollowUser(userId)
        : await followUser(userId);
      
      if (result.success) {
        // Update local state
        setSearchResults(prev => prev.map(u => 
          u.id === userId ? { ...u, isFollowing: !currentlyFollowing } : u
        ));
        setSuggestedUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (userLoading || !user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>{t('people.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <NavBar />
      
      <main className="flex-grow pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-light mb-2">{t('people.discoverPeople') || 'People'}</h1>
            <p className="text-white/60">{t('people.findConnect') || 'Find and connect with other film enthusiasts'}</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10 mb-8">
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                activeTab === 'discover'
                  ? 'text-white border-amber-500'
                  : 'text-white/50 border-transparent hover:text-white/70'
              }`}
            >
              <Users className="w-4 h-4" />
              {t('people.discover') || 'Discover'}
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                activeTab === 'feed'
                  ? 'text-white border-amber-500'
                  : 'text-white/50 border-transparent hover:text-white/70'
              }`}
            >
              <Activity className="w-4 h-4" />
              {t('people.activityFeed') || 'Activity Feed'}
            </button>
          </div>

          {/* Discover Tab Content */}
          {activeTab === 'discover' && (
            <>
              {/* Search Bar */}
              <div className="mb-12">
                <div className="relative">
                  <div className="flex items-center gap-3 rounded border border-white/20 bg-white/5 px-4 py-3 focus-within:border-white/40 focus-within:bg-white/10 transition-all">
                    <Search className="h-5 w-5 text-white/50" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('people.searchPlaceholder')}
                      className="w-full bg-transparent text-white placeholder-white/40 focus:outline-none"
                    />
                    {searching && <Loader2 className="h-5 w-5 animate-spin text-white/50" />}
                  </div>
                </div>

                {/* Search Results */}
                {searchQuery && (
                  <div className="mt-4">
                    {searchResults.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-white/50">{searchResults.length} {searchResults.length === 1 ? t('people.result') : t('people.results')}</p>
                        {searchResults.map((foundUser) => (
                          <UserCard
                            key={foundUser.id}
                            user={foundUser}
                            currentUserId={user.id}
                            onFollow={handleFollow}
                            loading={followLoading[foundUser.id] || false}
                            t={t}
                          />
                        ))}
                      </div>
                    ) : !searching && (
                      <p className="text-white/40 text-center py-8">{t('people.noUsersFound')}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Suggested Users */}
              {!searchQuery && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <h2 className="text-xl font-light">{t('people.suggestedForYou')}</h2>
                  </div>

                  {loadingSuggested ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-white/50 mx-auto" />
                    </div>
                  ) : suggestedUsers.length > 0 ? (
                    <div className="space-y-3">
                      {suggestedUsers.map((suggestedUser) => (
                        <UserCard
                          key={suggestedUser.id}
                          user={suggestedUser}
                          currentUserId={user.id}
                          onFollow={handleFollow}
                          loading={followLoading[suggestedUser.id] || false}
                          t={t}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-white/10 border-dashed rounded">
                      <Users className="h-12 w-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white/40 mb-2">{t('people.noSuggestions')}</p>
                      <p className="text-white/30 text-sm">{t('people.noSuggestionsDescription')}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Activity Feed Tab Content */}
          {activeTab === 'feed' && (
            <div>
              {feedLoading && feedActivities.length === 0 ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-white/50 mx-auto" />
                </div>
              ) : feedActivities.length > 0 ? (
                <div className="space-y-4">
                  {feedActivities.map((activity) => (
                    <ActivityCard key={activity._id} activity={activity} t={t} />
                  ))}
                  {feedHasMore && (
                    <div className="text-center pt-4">
                      <button
                        onClick={() => loadFeed(false)}
                        disabled={feedLoading}
                        className="px-6 py-2 text-sm border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-colors disabled:opacity-50"
                      >
                        {feedLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        ) : (
                          t('people.loadMore') || 'Load More'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 border border-white/10 border-dashed rounded">
                  <Activity className="h-12 w-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40 mb-2">{t('people.noActivity') || 'No activity yet'}</p>
                  <p className="text-white/30 text-sm">{t('people.noActivityDescription') || 'Follow some people to see their activity here'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// User Card Component
const UserCard: React.FC<UserCardProps> = ({ user, currentUserId, onFollow, loading, t }) => {
  const isCurrentUser = user.id === currentUserId;

  return (
    <div className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all rounded">
      {/* Avatar */}
      <Link to={`/profile/${user.username}`} className="flex-shrink-0">
        <div className="w-16 h-16 rounded-full bg-white/10 overflow-hidden">
          {user.avatar ? (
            <img src={user.avatar} alt={user.displayName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-light text-white/40">
              {user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </Link>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <Link to={`/profile/${user.username}`} className="block group">
          <h3 className="text-white font-medium group-hover:text-amber-500 transition-colors truncate">
            {user.displayName || user.username}
          </h3>
        </Link>
        <p className="text-white/50 text-sm truncate">@{user.username}</p>
        {user.bio && (
          <p className="text-white/60 text-sm mt-1 line-clamp-1">{user.bio}</p>
        )}
        <div className="flex gap-4 mt-2 text-xs text-white/40">
          <span>{user.stats?.followersCount || 0} {t('people.followers')}</span>
          <span>{user.stats?.filmsWatched || 0} {t('people.films')}</span>
        </div>
      </div>

      {/* Follow Button */}
      {!isCurrentUser && (
        <button
          onClick={() => onFollow(user.id, user.isFollowing || false)}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium rounded transition-all ${
            user.isFollowing
              ? 'bg-white/10 border border-white/20 text-white hover:bg-white/5'
              : 'bg-amber-500 text-black hover:bg-amber-600'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? t('people.loading') : user.isFollowing ? t('people.following') : t('people.follow')}
        </button>
      )}
    </div>
  );
};

// Activity Card Component
const ActivityCard: React.FC<ActivityCardProps> = ({ activity, t }) => {
  const activityUser = activity.userId;
  const movie = activity.movieId;

  const getActivityIcon = () => {
    switch (activity.type) {
      case 'review':
        return <Star className="w-4 h-4 text-amber-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'watchlist_add':
        return <Plus className="w-4 h-4 text-green-400" />;
      case 'favorite_add':
        return <Heart className="w-4 h-4 text-red-400 fill-current" />;
      case 'watched':
        return <Film className="w-4 h-4 text-purple-400" />;
      default:
        return <Activity className="w-4 h-4 text-white/50" />;
    }
  };

  const getActivityText = () => {
    const userName = activityUser?.displayName || activityUser?.username || 'Someone';
    const movieTitle = movie?.title || 'a film';

    switch (activity.type) {
      case 'review':
        return (
          <>
            <span className="font-medium text-white">{userName}</span>
            <span className="text-white/60"> reviewed </span>
            <span className="font-medium text-amber-500">{movieTitle}</span>
            {activity.rating && (
              <span className="text-white/60"> - {activity.rating}/10</span>
            )}
          </>
        );
      case 'comment':
        return (
          <>
            <span className="font-medium text-white">{userName}</span>
            <span className="text-white/60"> commented on </span>
            <span className="font-medium text-amber-500">{movieTitle}</span>
          </>
        );
      case 'watchlist_add':
        return (
          <>
            <span className="font-medium text-white">{userName}</span>
            <span className="text-white/60"> added </span>
            <span className="font-medium text-amber-500">{movieTitle}</span>
            <span className="text-white/60"> to their watchlist</span>
          </>
        );
      case 'favorite_add':
        return (
          <>
            <span className="font-medium text-white">{userName}</span>
            <span className="text-white/60"> added </span>
            <span className="font-medium text-amber-500">{movieTitle}</span>
            <span className="text-white/60"> to favorites</span>
          </>
        );
      case 'watched':
        return (
          <>
            <span className="font-medium text-white">{userName}</span>
            <span className="text-white/60"> watched </span>
            <span className="font-medium text-amber-500">{movieTitle}</span>
          </>
        );
      default:
        return (
          <>
            <span className="font-medium text-white">{userName}</span>
            <span className="text-white/60"> did something with </span>
            <span className="font-medium text-amber-500">{movieTitle}</span>
          </>
        );
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    const intervals = [
      { label: 'y', seconds: 31536000 },
      { label: 'mo', seconds: 2592000 },
      { label: 'd', seconds: 86400 },
      { label: 'h', seconds: 3600 },
      { label: 'm', seconds: 60 },
    ];
    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) return `${count}${interval.label}`;
    }
    return 'now';
  };

  return (
    <div className="flex gap-4 p-4 bg-white/5 hover:bg-white/8 border border-white/10 rounded transition-all">
      {/* User Avatar */}
      <Link to={`/profile/${activityUser?.username}`} className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden">
          {activityUser?.avatar ? (
            <img src={activityUser.avatar} alt={activityUser.displayName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-light text-white/40">
              {activityUser?.displayName?.charAt(0).toUpperCase() || activityUser?.username?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>
      </Link>

      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {getActivityIcon()}
          <p className="text-sm">{getActivityText()}</p>
        </div>

        {activity.content && (
          <p className="text-white/60 text-sm mt-2 line-clamp-2">{activity.content}</p>
        )}

        <p className="text-white/40 text-xs mt-2">{timeAgo(activity.createdAt)}</p>
      </div>

      {/* Movie Poster */}
      {movie && (
        <Link to={`/video/${movie._id}`} className="flex-shrink-0">
          <div className="w-16 h-24 bg-white/10 rounded overflow-hidden">
            {movie.posterUrl ? (
              <img src={movie.posterUrl} alt={movie.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="w-6 h-6 text-white/20" />
              </div>
            )}
          </div>
        </Link>
      )}
    </div>
  );
};

export default PeoplePage;


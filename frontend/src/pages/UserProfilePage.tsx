import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import API_BASE_URL from '../config/api';
import { Film, Star, Users, Calendar, UserPlus, UserMinus, Ban, MoreVertical, MessageCircle } from 'lucide-react';
import { Movie } from '../types';

interface ProfileUser {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  favoriteGenres?: string[];
  createdAt?: string;
  stats?: {
    filmsWatched?: number;
    reviewsWritten?: number;
    followersCount?: number;
    followingCount?: number;
  };
}

const UserProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, followUser, unfollowUser, blockUser, unblockUser, isBlocked, refreshUser } = useUser();

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  // If viewing own profile, redirect to /profile
  useEffect(() => {
    if (currentUser && username === currentUser.username) {
      navigate('/profile');
    }
  }, [currentUser, username, navigate]);

  // Load user profile
  useEffect(() => {
    loadUserProfile();
  }, [username]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/users/profile/${username}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('User not found');
        } else {
          setError('Failed to load profile');
        }
        return;
      }
      
      const data = await response.json();
      setProfileUser(data);
      
      // Check if current user is following this user
      if (isAuthenticated && currentUser) {
        setIsFollowing(currentUser.following?.some((item: any) => {
          const id = typeof item === 'string' ? item : item?.id || item?._id;
          return id === data.id;
        }) || false);
      }
      
      // Load favorites if available
      await loadFavorites(data.id);
      
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async (userId: string) => {
    try {
      setLoadingFavorites(true);
      // Try to get user's favorites from their public profile
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/favorites`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
      setFavorites([]);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (!profileUser) return;
    
    setFollowLoading(true);
    try {
      const result = isFollowing 
        ? await unfollowUser(profileUser.id)
        : await followUser(profileUser.id);
      
      if (result.success) {
        setIsFollowing(!isFollowing);
        // Update follower count
        setProfileUser(prev => prev ? ({
          ...prev,
          stats: {
            ...prev.stats,
            followersCount: (prev.stats?.followersCount || 0) + (isFollowing ? -1 : 1)
          }
        }) : null);
      } else {
        alert(result.error || 'Failed to update follow status');
      }
    } catch (error) {
      console.error('Follow error:', error);
      alert('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!profileUser) return;

    const userIsBlocked = isBlocked(profileUser.id);

    // Confirm before blocking
    if (!userIsBlocked) {
      const confirmed = window.confirm(
        `Are you sure you want to block @${profileUser.username}? They will no longer be able to follow you, message you, or see your profile.`
      );
      if (!confirmed) return;
    }

    setBlockLoading(true);
    setShowMenu(false);

    try {
      const result = userIsBlocked
        ? await unblockUser(profileUser.id)
        : await blockUser(profileUser.id);

      if (result.success) {
        if (!userIsBlocked) {
          // User was just blocked - they're no longer following and we're not following them
          setIsFollowing(false);
          setProfileUser(prev => prev ? ({
            ...prev,
            stats: {
              ...prev.stats,
              followersCount: Math.max((prev.stats?.followersCount || 0) - (isFollowing ? 1 : 0), 0)
            }
          }) : null);
        }
        // Refresh current user to update their follower/following counts
        await refreshUser();
      } else {
        alert(result.error || 'Failed to update block status');
      }
    } catch (error) {
      console.error('Block error:', error);
      alert('Failed to update block status');
    } finally {
      setBlockLoading(false);
    }
  };

  // Check if this user is blocked
  const userIsBlocked = profileUser ? isBlocked(profileUser.id) : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <NavBar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <NavBar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">👤</div>
            <h1 className="text-2xl mb-2">{error || 'User Not Found'}</h1>
            <p className="text-white/60 mb-6">This user doesn't exist or their profile is unavailable</p>
            <Link 
              to="/people" 
              className="inline-block px-6 py-2 bg-amber-500 text-black hover:bg-amber-600 transition-colors"
            >
              Browse People
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <NavBar />
      
      <main className="flex-grow">
        {/* Banner Placeholder */}
        <div className="relative h-48 md:h-64 bg-gradient-to-br from-amber-900/20 via-black to-black">
          <div className="absolute inset-0 bg-[url('/film-grain.png')] opacity-10 mix-blend-overlay"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="relative -mt-16 md:-mt-20 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-white/5 border-4 border-black overflow-hidden shadow-xl rounded">
                  {profileUser.avatar ? (
                    <img src={profileUser.avatar} alt={profileUser.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-light text-white/40">
                      {profileUser.displayName?.charAt(0).toUpperCase() || profileUser.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 pb-2">
                <h1 className="text-3xl md:text-4xl font-light mb-1">{profileUser.displayName || profileUser.username}</h1>
                <p className="text-white/50 text-sm mb-4">@{profileUser.username}</p>
                
                {/* Bio */}
                {profileUser.bio && (
                  <p className="text-white/70 text-sm leading-relaxed mb-4 max-w-2xl">{profileUser.bio}</p>
                )}
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-white/5 border border-white/10 px-4 py-3 rounded">
                    <div className="flex items-center gap-2 text-white/50 mb-1">
                      <Film className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider">Films</span>
                    </div>
                    <span className="text-2xl text-white font-light">{profileUser.stats?.filmsWatched || 0}</span>
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 px-4 py-3 rounded">
                    <div className="flex items-center gap-2 text-white/50 mb-1">
                      <Star className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider">Reviews</span>
                    </div>
                    <span className="text-2xl text-white font-light">{profileUser.stats?.reviewsWritten || 0}</span>
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 px-4 py-3 rounded">
                    <div className="flex items-center gap-2 text-white/50 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider">Followers</span>
                    </div>
                    <span className="text-2xl text-white font-light">{profileUser.stats?.followersCount || 0}</span>
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 px-4 py-3 rounded">
                    <div className="flex items-center gap-2 text-white/50 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider">Following</span>
                    </div>
                    <span className="text-2xl text-white font-light">{profileUser.stats?.followingCount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isAuthenticated && currentUser && currentUser.username !== profileUser.username && (
                <div className="flex items-center gap-2 mb-2">
                  {/* Show blocked state or follow button */}
                  {userIsBlocked ? (
                    <button
                      onClick={handleBlock}
                      disabled={blockLoading}
                      className="flex items-center gap-2 px-6 py-3 text-sm font-medium rounded transition-all bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30"
                    >
                      {blockLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          <Ban className="w-4 h-4" />
                          Unblock
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded transition-all ${
                          isFollowing
                            ? 'bg-white/10 border border-white/20 text-white hover:bg-white/5 hover:border-red-500/40 hover:text-red-400'
                            : 'bg-amber-500 text-black hover:bg-amber-600'
                        } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {followLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            Loading...
                          </>
                        ) : isFollowing ? (
                          <>
                            <UserMinus className="w-4 h-4" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            Follow
                          </>
                        )}
                      </button>

                      {/* More options menu */}
                      <div className="relative">
                        <button
                          onClick={() => setShowMenu(!showMenu)}
                          className="p-3 bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded transition-all"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {showMenu && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowMenu(false)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-black border border-white/20 rounded shadow-xl z-50">
                              <button
                                onClick={handleBlock}
                                disabled={blockLoading}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors"
                              >
                                <Ban className="w-4 h-4" />
                                Block @{profileUser.username}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Member Since */}
          {profileUser.createdAt && (
            <div className="mb-8 pb-8 border-b border-white/10">
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <Calendar className="w-4 h-4" />
                <span>
                  Member since {new Date(profileUser.createdAt).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Favorite Films Section */}
          <div className="mb-12 pb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-light">Favorite Films</h2>
              {favorites.length > 0 && (
                <span className="text-sm text-white/40">{favorites.length} {favorites.length === 1 ? 'film' : 'films'}</span>
              )}
            </div>

            {loadingFavorites ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-12 border border-white/10 border-dashed rounded">
                <Film className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/30">No favorite films yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {favorites.map((movie) => (
                  <Link
                    key={movie._id}
                    to={`/video/${movie._id}`}
                    className="group"
                  >
                    <div className="aspect-[2/3] bg-white/5 overflow-hidden mb-2 rounded shadow-lg group-hover:shadow-xl group-hover:shadow-amber-500/20 transition-all">
                      {movie.posterUrl ? (
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          <Film className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-white/70 group-hover:text-white transition-colors line-clamp-2">
                      {movie.title}
                    </p>
                    {movie.releaseDate && (
                      <p className="text-xs text-white/40">
                        {new Date(movie.releaseDate).getFullYear()}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Additional Info Section */}
          {profileUser.favoriteGenres && profileUser.favoriteGenres.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-light mb-4">Favorite Genres</h2>
              <div className="flex flex-wrap gap-2">
                {profileUser.favoriteGenres.map((genre, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/70 text-sm rounded"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UserProfilePage;


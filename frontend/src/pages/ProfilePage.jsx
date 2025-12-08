import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import API_BASE_URL from '../config/api.js';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile, loading, isAuthenticated, refreshUser } = useUser();
  
  const [activeTab, setActiveTab] = useState('activity');
  const [activities, setActivities] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/profile' } } });
    }
  }, [isAuthenticated, loading, navigate]);

  // Load user data
  useEffect(() => {
    if (user) {
      setBio(user.bio || '');
      loadActivities();
      loadFavorites();
    }
  }, [user]);

  const loadActivities = async () => {
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

  const loadFavorites = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/favorites`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleBioSave = async () => {
    const result = await updateProfile({ bio });
    if (result.success) {
      setIsEditingBio(false);
    }
  };

  const handleImageUpload = async (file, type) => {
    if (!file) return;

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
      }
    } catch (error) {
      console.error(`Failed to upload ${type}:`, error);
    } finally {
      setIsUploading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'review':
        return '★';
      case 'comment':
        return '💬';
      case 'watchlist_add':
        return '📌';
      case 'favorite_add':
        return '❤️';
      case 'watched':
        return '✓';
      default:
        return '•';
    }
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'review':
        return `reviewed ${activity.movieId?.title}`;
      case 'comment':
        return `commented on ${activity.movieId?.title}`;
      case 'watchlist_add':
        return `added ${activity.movieId?.title} to watchlist`;
      case 'favorite_add':
        return `added ${activity.movieId?.title} to favorites`;
      case 'watched':
        return `watched ${activity.movieId?.title}`;
      default:
        return '';
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <NavBar />
      
      <main className="flex-grow">
        {/* Banner */}
        <div className="relative h-64 bg-white/5 group">
          {user.banner ? (
            <img 
              src={user.banner} 
              alt="Banner" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <button
            onClick={() => bannerInputRef.current.click()}
            className="absolute top-4 right-4 px-3 py-1.5 bg-black/70 text-white text-sm border border-white/20 hover:bg-black/90 transition-all opacity-0 group-hover:opacity-100"
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Change Banner'}
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(e.target.files[0], 'banner')}
          />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="relative -mt-16 mb-8">
            <div className="flex items-end gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-32 h-32 bg-white/5 border-4 border-black overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-light text-white/40">
                      {user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current.click()}
                  className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  disabled={isUploading}
                >
                  Change
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files[0], 'avatar')}
                />
              </div>

              {/* User Info */}
              <div className="flex-1 pb-2">
                <h1 className="text-3xl font-light mb-1">{user.displayName || user.username}</h1>
                <p className="text-white/50 text-sm mb-3">@{user.username}</p>
                
                {/* Stats */}
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-white font-medium">{user.stats?.filmsWatched || 0}</span>
                    <span className="text-white/50 ml-1">Films</span>
                  </div>
                  <div>
                    <span className="text-white font-medium">{user.stats?.reviewsWritten || 0}</span>
                    <span className="text-white/50 ml-1">Reviews</span>
                  </div>
                  <div>
                    <span className="text-white font-medium">{user.watchlist?.length || 0}</span>
                    <span className="text-white/50 ml-1">Watchlist</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors text-sm mb-2"
              >
                Sign Out
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
                  placeholder="Tell us about yourself..."
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleBioSave}
                    className="px-4 py-1.5 bg-white text-black text-sm hover:bg-white/90 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setBio(user.bio || '');
                      setIsEditingBio(false);
                    }}
                    className="px-4 py-1.5 border border-white/20 text-sm hover:border-white/40 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="group">
                {bio ? (
                  <p className="text-white/70 text-sm leading-relaxed">{bio}</p>
                ) : (
                  <p className="text-white/30 text-sm italic">No bio yet</p>
                )}
                <button
                  onClick={() => setIsEditingBio(true)}
                  className="text-white/40 hover:text-white/60 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Edit bio
                </button>
              </div>
            )}
          </div>

          {/* Favorite Films */}
          {favorites.length > 0 && (
            <div className="mb-12">
              <h2 className="text-sm uppercase tracking-wider text-white/50 mb-4">Favorite Films</h2>
              <div className="grid grid-cols-4 gap-3">
                {favorites.map((movie) => (
                  <Link 
                    key={movie._id}
                    to={`/video/${movie._id}`}
                    className="group"
                  >
                    <div className="aspect-[2/3] bg-white/5 overflow-hidden">
                      {movie.posterUrl ? (
                        <img 
                          src={movie.posterUrl} 
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-white/10 mb-8">
            <div className="flex gap-8">
              {['activity', 'films', 'watchlist'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm uppercase tracking-wider transition-colors relative ${
                    activeTab === tab 
                      ? 'text-white' 
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'activity' && (
            <div className="space-y-4 pb-12">
              {activities.length === 0 ? (
                <p className="text-white/30 text-center py-12">No recent activity</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity._id} className="flex gap-4 pb-4 border-b border-white/5">
                    <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1">
                      <p className="text-white/70 text-sm">
                        <span className="text-white">{user.displayName || user.username}</span>{' '}
                        {getActivityText(activity)}
                      </p>
                      <p className="text-white/40 text-xs mt-1">
                        {new Date(activity.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      {activity.rating && (
                        <p className="text-white/60 text-sm mt-2">★ {activity.rating}/10</p>
                      )}
                    </div>
                    {activity.movieId?.posterUrl && (
                      <Link to={`/video/${activity.movieId._id}`}>
                        <img 
                          src={activity.movieId.posterUrl} 
                          alt={activity.movieId.title}
                          className="w-12 h-16 object-cover hover:opacity-80 transition-opacity"
                        />
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'films' && (
            <div className="pb-12">
              <p className="text-white/30 text-center py-12">Films watched will appear here</p>
            </div>
          )}

          {activeTab === 'watchlist' && (
            <div className="pb-12">
              {(!user.watchlist || user.watchlist.length === 0) ? (
                <div className="text-center py-12">
                  <p className="text-white/30 mb-4">Your watchlist is empty</p>
                  <Link 
                    to="/catalog"
                    className="inline-block px-6 py-2 bg-white text-black hover:bg-white/90 transition-colors"
                  >
                    Browse Films
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {user.watchlist.map((movie) => (
                    <Link 
                      key={movie._id || movie}
                      to={`/video/${movie._id || movie}`}
                      className="group"
                    >
                      <div className="aspect-[2/3] bg-white/5 overflow-hidden mb-2">
                        {movie.posterUrl ? (
                          <img 
                            src={movie.posterUrl} 
                            alt={movie.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-white/70 group-hover:text-white transition-colors truncate">
                        {movie.title || 'Untitled'}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;

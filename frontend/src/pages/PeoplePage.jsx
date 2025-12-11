import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import API_BASE_URL from '../config/api.js';
import { Search, Users, Sparkles, Loader2 } from 'lucide-react';

const PeoplePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: userLoading, followUser, unfollowUser, isFollowing } = useUser();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [followLoading, setFollowLoading] = useState({});

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

  const loadSuggestedUsers = async () => {
    try {
      setLoadingSuggested(true);
      const response = await fetch(`${API_BASE_URL}/api/users/suggested`, {
        credentials: 'include'
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
        const response = await fetch(
          `${API_BASE_URL}/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`,
          { credentials: 'include' }
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

  const handleFollow = async (userId, currentlyFollowing) => {
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
          <p>Loading...</p>
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
            <h1 className="text-4xl font-light mb-2">Discover People</h1>
            <p className="text-white/60">Find and connect with film enthusiasts</p>
          </div>

          {/* Search Bar */}
          <div className="mb-12">
            <div className="relative">
              <div className="flex items-center gap-3 rounded border border-white/20 bg-white/5 px-4 py-3 focus-within:border-white/40 focus-within:bg-white/10 transition-all">
                <Search className="h-5 w-5 text-white/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username or name..."
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
                    <p className="text-sm text-white/50">{searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}</p>
                    {searchResults.map((foundUser) => (
                      <UserCard 
                        key={foundUser.id} 
                        user={foundUser} 
                        currentUserId={user.id}
                        onFollow={handleFollow}
                        loading={followLoading[foundUser.id]}
                      />
                    ))}
                  </div>
                ) : !searching && (
                  <p className="text-white/40 text-center py-8">No users found</p>
                )}
              </div>
            )}
          </div>

          {/* Suggested Users */}
          {!searchQuery && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-light">Suggested For You</h2>
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
                      loading={followLoading[suggestedUser.id]}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-white/10 border-dashed rounded">
                  <Users className="h-12 w-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40 mb-2">No suggestions yet</p>
                  <p className="text-white/30 text-sm">Add some favorite films to get personalized recommendations</p>
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

// User Card Component
const UserCard = ({ user, currentUserId, onFollow, loading }) => {
  const isCurrentUser = user.id === currentUserId;
  
  return (
    <div className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all rounded">
      {/* Avatar */}
      <Link to={`/profile/${user.username}`} className="flex-shrink-0">
        <div className="w-16 h-16 rounded-full bg-white/10 overflow-hidden">
          {user.avatar ? (
            <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
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
          <span>{user.stats?.followersCount || 0} followers</span>
          <span>{user.stats?.filmsWatched || 0} films</span>
        </div>
      </div>

      {/* Follow Button */}
      {!isCurrentUser && (
        <button
          onClick={() => onFollow(user.id, user.isFollowing)}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium rounded transition-all ${
            user.isFollowing
              ? 'bg-white/10 border border-white/20 text-white hover:bg-white/5'
              : 'bg-amber-500 text-black hover:bg-amber-600'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Loading...' : user.isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  );
};

export default PeoplePage;

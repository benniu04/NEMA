import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import API_BASE_URL from '../config/api.js';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [movies, setMovies] = useState([]);
  const [editingMovie, setEditingMovie] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rating: 0,
    releaseDate: '',
    genre: '',
    director: '',
    cast: '',
    language: 'English',
    videoUrls: {
      '720p': '',
      '1080p': ''
    },
    thumbnailUrl: '',
    posterUrl: '',
    isFeatured: false,
    tags: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    'video-720p': 0,
    'video-1080p': 0,
    'thumbnail': 0,
    'poster': 0
  });

  // Check authentication using httpOnly cookies
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          if (userData.isAdmin) {
            setAuthChecked(true);
            fetchMovies();
            return;
          }
        }
        
        // Not authenticated, redirect to login
        navigate('/admin/login');
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/admin/login');
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      console.log('Fetching movies from:', `${API_BASE_URL}/api/movies`);
      
      const response = await fetch(`${API_BASE_URL}/api/movies`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched movies:', data);
      
      setMovies(data);
    } catch (err) {
      console.error('Error fetching movies:', err);
      setError(`Failed to load movies: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      rating: 0,
      releaseDate: '',
      genre: '',
      director: '',
      cast: '',
      language: 'English',
      videoUrls: { '720p': '', '1080p': '' },
      thumbnailUrl: '',
      posterUrl: '',
      isFeatured: false,
      tags: ''
    });
    setEditingMovie(null);
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    resetForm();
    setActiveTab('manage');
  };

  // Analytics functions
  const getAnalytics = () => {
    if (movies.length === 0) return null;

    // Genre analysis
    const genreCount = {};
    movies.forEach(movie => {
      if (Array.isArray(movie.genre)) {
        movie.genre.forEach(g => {
          genreCount[g] = (genreCount[g] || 0) + 1;
        });
      }
    });
    const topGenres = Object.entries(genreCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // Director analysis
    const directorCount = {};
    movies.forEach(movie => {
      directorCount[movie.director] = (directorCount[movie.director] || 0) + 1;
    });
    const topDirectors = Object.entries(directorCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    // Language analysis
    const languageCount = {};
    movies.forEach(movie => {
      languageCount[movie.language] = (languageCount[movie.language] || 0) + 1;
    });

    // Rating analysis
    const ratings = movies.map(m => parseFloat(m.rating)).filter(r => !isNaN(r));
    const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0;
    const highRatedMovies = movies.filter(m => parseFloat(m.rating) >= 8).length;

    // Release year analysis
    const currentYear = new Date().getFullYear();
    const recentMovies = movies.filter(m => new Date(m.releaseDate).getFullYear() >= currentYear - 2).length;
    const yearCount = {};
    movies.forEach(movie => {
      const year = new Date(movie.releaseDate).getFullYear();
      yearCount[year] = (yearCount[year] || 0) + 1;
    });

    // Quality analysis
    const moviesWithVideo = movies.filter(m => m.videoUrls?.['720p'] || m.videoUrls?.['1080p']).length;
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

  const handleEdit = (movie) => {
    setEditingMovie(movie);
    setFormData({
      ...movie,
      genre: Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre,
      cast: Array.isArray(movie.cast) ? movie.cast.join(', ') : movie.cast,
      tags: Array.isArray(movie.tags) ? movie.tags.join(', ') : movie.tags,
      releaseDate: new Date(movie.releaseDate).toISOString().split('T')[0]
    });
    setActiveTab('upload');
  };

  const handleDelete = async (movieId) => {
    if (!window.confirm('Are you sure you want to delete this movie?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/movies/${movieId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete movie');
      
      setSuccess('Movie deleted successfully');
      fetchMovies();
    } catch (err) {
      setError('Failed to delete movie');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const processedData = {
        ...formData,
        genre: formData.genre.split(',').map(g => g.trim()),
        cast: formData.cast.split(',').map(c => c.trim()),
        tags: formData.tags.split(',').map(t => t.trim())
      };

      const url = editingMovie 
        ? `${API_BASE_URL}/api/movies/${editingMovie._id}`
        : `${API_BASE_URL}/api/movies`;
      
      const method = editingMovie ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(processedData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save movie');
      }

      setSuccess(editingMovie ? 'Movie updated successfully!' : 'Movie uploaded successfully!');
      resetForm();
      fetchMovies();
      setActiveTab('manage');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFileUpload = async (file, type, quality) => {
    if (!file) return;
    
    setUploading(true);
    const progressKey = type === 'video' ? `video-${quality}` : type;
    setUploadProgress(prev => ({ ...prev, [progressKey]: 0 }));

    try {
      const formData = new FormData();
      const endpoint = type === 'video' ? 'video' : 'image';
      formData.append(type === 'video' ? 'video' : 'image', file);
      if (type === 'video') formData.append('quality', quality);
      if (type === 'image') formData.append('type', type === 'thumbnail' ? 'thumbnail' : 'poster');

      const response = await fetch(`${API_BASE_URL}/api/upload/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const responseText = await response.text();
      const data = JSON.parse(responseText);

      if (!response.ok) throw new Error(data.message || 'Upload failed');
      
      if (type === 'video') {
        // Store the S3 key
        setFormData(prev => ({
          ...prev,
          videoUrls: { ...prev.videoUrls, [quality]: data.key }
        }));
      } else {
        // Store the S3 key for images
        const keyField = type === 'thumbnail' ? 'thumbnailKey' : 'posterKey';
        setFormData(prev => ({
          ...prev,
          [keyField]: data.key
        }));
      }

      setUploadProgress(prev => ({ ...prev, [progressKey]: 100 }));
      setSuccess(`${type === 'video' ? 'Video' : type} uploaded successfully!`);
    } catch (error) {
      setError(`Failed to upload ${type}: ${error.message}`);
      setUploadProgress(prev => ({ ...prev, [progressKey]: 0 }));
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    navigate('/admin/login');
  };

  const TabButton = ({ tabKey, label, icon }) => (
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
      <NavBar />
      
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
                label={editingMovie ? "Edit Movie" : "Upload New"} 
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
                      {movies.filter(m => new Date(m.createdAt || m.releaseDate) > new Date(Date.now() - 30*24*60*60*1000)).length}
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
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">Rating (0-10) *</label>
                      <input
                        type="number"
                        name="rating"
                        value={formData.rating}
                        onChange={handleChange}
                        min="0"
                        max="10"
                        step="0.1"
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
                      rows="4"
                      className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  {/* File Upload Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">720p Video File</label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileUpload(e.target.files[0], 'video', '720p')}
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-amber-500/20 file:text-amber-100"
                      />
                      {uploadProgress['video-720p'] > 0 && uploadProgress['video-720p'] < 100 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress['video-720p']}%` }}></div>
                          </div>
                          <p className="text-xs text-amber-100/60 mt-1">Uploading 720p video...</p>
                        </div>
                      )}
                      {formData.videoUrls['720p'] && <p className="text-xs text-green-400 mt-1">✓ 720p video uploaded</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">1080p Video File</label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileUpload(e.target.files[0], 'video', '1080p')}
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-amber-500/20 file:text-amber-100"
                      />
                      {uploadProgress['video-1080p'] > 0 && uploadProgress['video-1080p'] < 100 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress['video-1080p']}%` }}></div>
                          </div>
                          <p className="text-xs text-amber-100/60 mt-1">Uploading 1080p video...</p>
                        </div>
                      )}
                      {formData.videoUrls['1080p'] && <p className="text-xs text-green-400 mt-1">✓ 1080p video uploaded</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-amber-100/60 mb-2">Thumbnail File</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files[0], 'thumbnail')}
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-amber-500/20 file:text-amber-100"
                      />
                      {uploadProgress['thumbnail'] > 0 && uploadProgress['thumbnail'] < 100 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress['thumbnail']}%` }}></div>
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
                        onChange={(e) => handleFileUpload(e.target.files[0], 'poster')}
                        className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-amber-500/20 file:text-amber-100"
                      />
                      {uploadProgress['poster'] > 0 && uploadProgress['poster'] < 100 && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress['poster']}%` }}></div>
                          </div>
                          <p className="text-xs text-amber-100/60 mt-1">Uploading poster...</p>
                        </div>
                      )}
                      {formData.posterUrl && <p className="text-xs text-green-400 mt-1">✓ Poster uploaded</p>}
                    </div>
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
                      disabled={uploading}
                      className="px-6 py-3 bg-amber-500 text-black rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      {editingMovie ? 'Update Movie' : 'Upload Movie'}
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
                            {movie.isFeatured && (
                              <span className="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-100">
                                Featured
                              </span>
                            )}
                          </div>
                          <p className="text-amber-100/70 text-sm mb-1">{movie.director}</p>
                          <p className="text-amber-100/60 text-sm mb-3">{new Date(movie.releaseDate).getFullYear()}</p>
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
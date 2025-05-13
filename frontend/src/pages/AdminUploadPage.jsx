import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';

const AdminUploadPage = () => {
  const navigate = useNavigate();
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

  // Check if user is logged in and is admin
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const user = JSON.parse(localStorage.getItem('adminUser'));
    
    if (!token || !user?.isAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Convert comma-separated strings to arrays
      const processedData = {
        ...formData,
        genre: formData.genre.split(',').map(g => g.trim()),
        cast: formData.cast.split(',').map(c => c.trim()),
        tags: formData.tags.split(',').map(t => t.trim())
      };

      const response = await fetch('http://localhost:5000/api/movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(processedData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to upload movie');
      }

      const data = await response.json();
      setSuccess('Movie uploaded successfully!');
      setFormData({
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
    } catch (err) {
      setError(err.message);
      if (err.message === 'Authentication required') {
        navigate('/admin/login');
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <NavBar />
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8 mt-10">
          <h1 className="text-3xl font-light">Upload New Movie</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-amber-100/20 rounded text-amber-100/60 hover:bg-white/5"
          >
            Logout
          </button>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-amber-100/60 mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full bg-white/5 border border-amber-100/20 rounded px-4 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-100/60 mb-2">
                Director *
              </label>
              <input
                type="text"
                name="director"
                value={formData.director}
                onChange={handleChange}
                required
                className="w-full bg-white/5 border border-amber-100/20 rounded px-4 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-100/60 mb-2">
                Release Date *
              </label>
              <input
                type="date"
                name="releaseDate"
                value={formData.releaseDate}
                onChange={handleChange}
                required
                className="w-full bg-white/5 border border-amber-100/20 rounded px-4 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-100/60 mb-2">
                Rating (0-10) *
              </label>
              <input
                type="number"
                name="rating"
                value={formData.rating}
                onChange={handleChange}
                min="0"
                max="10"
                step="0.1"
                required
                className="w-full bg-white/5 border border-amber-100/20 rounded px-4 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-100/60 mb-2">
                Genre (comma-separated) *
              </label>
              <input
                type="text"
                name="genre"
                value={formData.genre}
                onChange={handleChange}
                required
                placeholder="Action, Adventure, Sci-Fi"
                className="w-full bg-white/5 border border-amber-100/20 rounded px-4 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-100/60 mb-2">
                Language
              </label>
              <input
                type="text"
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="w-full bg-white/5 border border-amber-100/20 rounded px-4 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-100/60 mb-2">
                Cast (comma-separated)
              </label>
              <input
                type="text"
                name="cast"
                value={formData.cast}
                onChange={handleChange}
                placeholder="Actor 1, Actor 2, Actor 3"
                className="w-full bg-white/5 border border-amber-100/20 rounded px-4 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-100/60 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="tag1, tag2, tag3"
                className="w-full bg-white/5 border border-amber-100/20 rounded px-4 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-100/60 mb-2">
                720p Video URL
              </label>
              <input
                type="url"
                name="videoUrls.720p"
                value={formData.videoUrls['720p']}
                onChange={handleChange}
                className="w-full bg-white/5 border border-amber-100/20 rounded px-4 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-100/60 mb-2">
                1080p Video URL
              </label>
              <input
                type="url"
                name="videoUrls.1080p"
                value={formData.videoUrls['1080p']}
                onChange={handleChange}
                className="w-full bg-white/5 border border-amber-100/20 rounded px-4 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-100/60 mb-2">
                Thumbnail URL
              </label>
              <input
                type="url"
                name="thumbnailUrl"
                value={formData.thumbnailUrl}
                onChange={handleChange}
                className="w-full bg-white/5 border border-amber-100/20 rounded px-4 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-100/60 mb-2">
                Poster URL
              </label>
              <input
                type="url"
                name="posterUrl"
                value={formData.posterUrl}
                onChange={handleChange}
                className="w-full bg-white/5 border border-amber-100/20 rounded px-4 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-100/60 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
              className="w-full bg-white/5 border border-amber-100/20 rounded px-4 py-2 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isFeatured"
              checked={formData.isFeatured}
              onChange={handleChange}
              className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-amber-100/20 rounded bg-white/5"
            />
            <label className="ml-2 block text-sm text-amber-100/60">
              Feature this movie
            </label>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 border border-amber-100/20 rounded text-amber-100/60 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 text-black rounded hover:bg-amber-600"
            >
              Upload Movie
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminUploadPage; 
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import API_BASE_URL from '../../config/api.js'

const CatalogPage = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Fetch movies from backend
  useEffect(() => {
    let isMounted = true;

    const fetchMovies = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/movies`);
        if (!response.ok) {
          throw new Error('Failed to fetch movies');
        }
        const data = await response.json();
        
        if (isMounted) {
          setMovies(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load movies. Please try again later.');
          setLoading(false);
        }
      }
    };

    fetchMovies();

    return () => {
      isMounted = false;
    };
  }, []);

  // Get unique values for filters
  const categories = ["All", ...new Set(movies.flatMap(movie => movie.genre))];
  const years = ["All", ...new Set(movies.map(movie => new Date(movie.releaseDate).getFullYear().toString()))];
  const languages = ["All", ...new Set(movies.map(movie => movie.language))];

  // Filter and sort movies
  const filteredMovies = movies.filter(movie => {
    const matchesCategory = selectedCategory === "All" || movie.genre.includes(selectedCategory);
    const matchesYear = selectedYear === "All" || new Date(movie.releaseDate).getFullYear().toString() === selectedYear;
    const matchesLanguage = selectedLanguage === "All" || movie.language === selectedLanguage;
    const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         movie.director.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesYear && matchesLanguage && matchesSearch;
  });

  const sortedMovies = [...filteredMovies].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.releaseDate) - new Date(a.releaseDate);
    if (sortBy === "oldest") return new Date(a.releaseDate) - new Date(b.releaseDate);
    if (sortBy === "title") return a.title.localeCompare(b.title);
    return 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <NavBar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-amber-100/60">Loading movies...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <NavBar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <NavBar />
      
      <div className="relative min-h-screen pt-20">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 -left-40 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          {/* Header Section */}
          <section id="catalog-header" className="text-center mb-16">
            <div className="mb-4">
              <span className="text-amber-100/80 tracking-[0.3em] uppercase text-sm font-light">Film Collection</span>
            </div>
            <h1 className="text-6xl font-light mb-4 tracking-[0.2em] uppercase">Catalog</h1>
            <div className="w-24 h-[1px] bg-amber-100/30 mx-auto mb-8"></div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-light tracking-wide">
              Explore our curated collection of independent films from emerging filmmakers worldwide.
            </p>
          </section>

          {/* Filters Section */}
          <section id="filters" className="mb-12">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              <input
                type="text"
                placeholder="Search films..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 bg-white/5 border border-amber-100/20 rounded-none px-4 py-3 focus:outline-none focus:border-amber-100/40 transition-colors"
              />
              <div className="flex flex-wrap gap-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-white/5 border border-amber-100/20 rounded-none px-4 py-3 focus:outline-none focus:border-amber-100/40 transition-colors"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-white/5 border border-amber-100/20 rounded-none px-4 py-3 focus:outline-none focus:border-amber-100/40 transition-colors"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-white/5 border border-amber-100/20 rounded-none px-4 py-3 focus:outline-none focus:border-amber-100/40 transition-colors"
                >
                  {languages.map(language => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white/5 border border-amber-100/20 rounded-none px-4 py-3 focus:outline-none focus:border-amber-100/40 transition-colors"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title A-Z</option>
                </select>
              </div>
            </div>
          </section>

          {/* Movies Grid */}
          <section id="movies-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedMovies && sortedMovies.length > 0 ? (
              sortedMovies.map((movie) => (
                <Link 
                  key={movie._id}
                  to={`/video/${movie._id}`}
                  className="group relative aspect-[16/9] bg-gray-800 border border-amber-100/20 rounded-none overflow-hidden cursor-pointer min-h-[200px]"
                  style={{ 
                    backgroundImage: `url(${movie.thumbnailUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 to-purple-900/20"></div>
                  
                  <div className="absolute bottom-0 p-4 bg-black/80 w-full">
                    <h3 className="text-lg font-light mb-1 text-white">{movie.title}</h3>
                    <p className="text-amber-100/80 text-sm">{movie.director} • {new Date(movie.releaseDate).getFullYear()}</p>
                    <p className="text-amber-100/60 text-xs">{movie.genre.join(', ')}</p>
                    {movie.rating && (
                      <p className="text-amber-100/60 text-xs mt-1">Rating: {movie.rating}/10</p>
                    )}
                  </div>
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-amber-100/60 text-lg">No films found matching your criteria.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default CatalogPage;
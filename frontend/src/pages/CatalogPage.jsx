import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'
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

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategory("All");
    setSelectedYear("All");
    setSelectedLanguage("All");
    setSearchQuery("");
    setSortBy("newest");
  };

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
          <section id="catalog-header" className="text-center mb-10">
            <div className="mb-3">
              <span className="text-amber-100/80 tracking-[0.3em] uppercase text-xs md:text-sm font-extralight">Film Collection</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-light mb-3 tracking-[0.2em] uppercase">Catalog</h1>
            <div className="w-20 h-[1px] bg-amber-100/30 mx-auto mb-4"></div>
            <p className="text-white/90 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-light tracking-wide">
              Browse the archive and discover your next favorite film.
            </p>
          </section>

          {/* Mobile Filters (Top) */}
          <section id="filters" className="relative mb-8 lg:hidden">
            <div className="bg-white/5 border border-amber-100/10 backdrop-blur-sm p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                {/* Compact Search Bar */}
                <div className="relative w-full lg:w-80">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-amber-100/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-amber-100/20 rounded-none px-3 pl-10 py-2 text-sm font-light focus:outline-none focus:border-amber-100/40 transition-colors placeholder-amber-100/30"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-amber-100/40 hover:text-amber-100 transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Compact Filters */}
                <div className="flex flex-wrap gap-3 items-center flex-1">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-white/5 border border-amber-100/20 rounded-none px-3 py-2 text-sm font-light focus:outline-none focus:border-amber-100/40 transition-colors"
                  >
                    {categories.map(category => (
                      <option key={category} value={category} className="bg-black text-white">
                        {category}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-white/5 border border-amber-100/20 rounded-none px-3 py-2 text-sm font-light focus:outline-none focus:border-amber-100/40 transition-colors"
                  >
                    {years.map(year => (
                      <option key={year} value={year} className="bg-black text-white">
                        {year}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-white/5 border border-amber-100/20 rounded-none px-3 py-2 text-sm font-light focus:outline-none focus:border-amber-100/40 transition-colors"
                  >
                    {languages.map(language => (
                      <option key={language} value={language} className="bg-black text-white">
                        {language}
                      </option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white/5 border border-amber-100/20 rounded-none px-3 py-2 text-sm font-light focus:outline-none focus:border-amber-100/40 transition-colors"
                  >
                    <option value="newest" className="bg-black text-white">Newest</option>
                    <option value="oldest" className="bg-black text-white">Oldest</option>
                    <option value="title" className="bg-black text-white">A-Z</option>
                  </select>
                </div>

                {/* Compact Status and Clear */}
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-amber-100/50 whitespace-nowrap">
                    {filteredMovies.length} films
                  </span>
                  {(selectedCategory !== "All" || selectedYear !== "All" || selectedLanguage !== "All" || searchQuery) && (
                    <button
                      onClick={clearFilters}
                      className="text-amber-100/60 hover:text-amber-100 underline transition-colors whitespace-nowrap"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Desktop Layout with Sticky Sidebar */}
          <div className="mt-6 flex gap-8">
            {/* Sidebar Filters (Desktop) */}
            <aside className="hidden lg:block w-72 shrink-0 sticky top-24 h-fit">
              <div className="bg-white/5 border border-amber-100/10 backdrop-blur-sm p-5">
                <div className="mb-4">
                  <label className="block text-sm text-amber-100/60 mb-2">Search</label>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-amber-100/20 rounded-none px-3 py-2 text-sm font-light focus:outline-none focus:border-amber-100/40 transition-colors placeholder-amber-100/30"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-amber-100/60 mb-2">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-white/5 border border-amber-100/20 rounded-none px-3 py-2 text-sm font-light focus:outline-none focus:border-amber-100/40 transition-colors"
                    >
                      {categories.map(category => (
                        <option key={category} value={category} className="bg-black text-white">{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-amber-100/60 mb-2">Year</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full bg-white/5 border border-amber-100/20 rounded-none px-3 py-2 text-sm font-light focus:outline-none focus:border-amber-100/40 transition-colors"
                    >
                      {years.map(year => (
                        <option key={year} value={year} className="bg-black text-white">{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-amber-100/60 mb-2">Language</label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full bg-white/5 border border-amber-100/20 rounded-none px-3 py-2 text-sm font-light focus:outline-none focus:border-amber-100/40 transition-colors"
                    >
                      {languages.map(language => (
                        <option key={language} value={language} className="bg-black text-white">{language}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-amber-100/60 mb-2">Sort</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-white/5 border border-amber-100/20 rounded-none px-3 py-2 text-sm font-light focus:outline-none focus:border-amber-100/40 transition-colors"
                    >
                      <option value="newest" className="bg-black text-white">Newest</option>
                      <option value="oldest" className="bg-black text-white">Oldest</option>
                      <option value="title" className="bg-black text-white">A-Z</option>
                    </select>
                  </div>
                  {(selectedCategory !== "All" || selectedYear !== "All" || selectedLanguage !== "All" || searchQuery) && (
                    <button
                      onClick={clearFilters}
                      className="text-amber-100/70 hover:text-amber-100 underline text-sm"
                    >
                      Clear Filters
                    </button>
                  )}
                  <div className="text-amber-100/50 text-xs">{filteredMovies.length} films</div>
                </div>
              </div>
            </aside>

            {/* Results Area */}
            <div className="flex-1">
              {/* Featured Highlight */}
              {sortedMovies.length > 0 && (
                <Link
                  to={`/video/${sortedMovies[0]._id}`}
                  className="block relative aspect-[21/9] mb-8 overflow-hidden border border-white/10 bg-black/40 group"
                  style={{ backgroundImage: `url(${sortedMovies[0].thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-6 max-w-xl">
                    <h3 className="text-2xl md:text-3xl font-light text-white/95 mb-2">{sortedMovies[0].title}</h3>
                    <p className="text-white/70 text-sm md:text-base mb-3">{sortedMovies[0].director} • {new Date(sortedMovies[0].releaseDate).getFullYear()}</p>
                    <div className="flex gap-2">
                      {Array.isArray(sortedMovies[0].genre) && sortedMovies[0].genre.slice(0,3).map((g,i)=> (
                        <span key={i} className="px-2 py-0.5 text-xs bg-white/10 text-white/80">{g}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              )}

              {/* Movies Grid */}
              <section id="movies-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sortedMovies && sortedMovies.length > 1 ? (
                  sortedMovies.slice(1).map((movie) => (
                    <div key={movie._id} className="group relative">
                      <Link 
                        to={`/video/${movie._id}`}
                        className="block relative aspect-[16/9] bg-black/40 border border-white/10 rounded-none overflow-hidden cursor-pointer transform transition-all duration-500 hover:scale-[1.02] hover:border-amber-100/30"
                        style={{ 
                          backgroundImage: `url(${movie.thumbnailUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 flex items-center justify-center border-2 border-white/70 rounded-full bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                            <svg className="w-7 h-7 text-white ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      </Link>
                      <div className="mt-4 px-2">
                        <h3 className="text-lg font-light text-white/90 mb-1 line-clamp-1">{movie.title}</h3>
                        <p className="text-amber-100/70 text-sm">{movie.director} • {new Date(movie.releaseDate).getFullYear()}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-amber-100/60 text-xs">{movie.genre[0]}</span>
                        </div>
                      </div>
                    </div>
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
      </div>
    </div>
  );
};

export default CatalogPage;
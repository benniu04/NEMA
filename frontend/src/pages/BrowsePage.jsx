import React, { useState, useEffect, useRef } from 'react'
import NavBar from '../components/NavBar'

const films = [
  {
    id: 1,
    title: "The Solo",
    director: "Ryan Ma",
    year: 2024,
    image: "Ryan-Ma-2.jpeg",
    description: "A powerful superhero origin story that follows Carol Danvers as she becomes one of the universe's most powerful heroes.",
    duration: "2h 4m",
    rating: "PG-13",
    genre: "Action, Adventure, Sci-Fi",
    category: "Feature Film",
    language: "English",
    country: "USA",
    trailerUrl: "/videos/the-solo-trailer.mp4",
    filmUrl: "/videos/the-solo-full.mp4",
    trailerThumbnail: "trailer-thumb-1.jpg"
  },
  {
    id: 2,
    title: "Pacific Rim",
    director: "Jean Dupont",
    year: 2024,
    image: "wallpaper-2.jpg",
    description: "As a war between humankind and monstrous sea creatures wages on, a former pilot and a trainee are paired up to drive a seemingly obsolete special weapon in a desperate effort to save the world from the apocalypse.",
    duration: "2h 11m",
    rating: "PG-13",
    genre: "Action, Adventure, Sci-Fi",
    category: "Feature Film",
    language: "English",
    country: "USA"
  },
  {
    id: 3,
    title: "TRON: Legacy",
    director: "Marcus Johnson",
    year: 2024,
    image: "wallpaper-3.jpg",
    description: "The son of a virtual world designer goes looking for his father and ends up inside the digital world that his father designed. He meets his father's corrupted creation and a unique ally who was born inside the digital world.",
    duration: "2h 5m",
    rating: "PG",
    genre: "Action, Adventure, Sci-Fi",
    category: "Feature Film",
    language: "English",
    country: "USA"
  }
];

const categories = [
  { id: "all", name: "All Films", icon: "🎬" },
  { id: "feature", name: "Feature Films", icon: "🎥" },
  { id: "short", name: "Short Films", icon: "⏱️" },
  { id: "documentary", name: "Documentaries", icon: "📹" },
  { id: "animation", name: "Animation", icon: "🎨" }
];

const filters = {
  year: ["All", "2024", "2023", "2022", "2021"],
  language: ["All", "English", "Spanish", "French", "German", "Japanese", "Korean"],
  country: ["All", "USA", "UK", "France", "Germany", "Japan", "South Korea"],
  duration: ["All", "Under 30 min", "30-60 min", "1-2 hours", "Over 2 hours"],
  rating: ["All", "G", "PG", "PG-13", "R"]
};

const BrowsePage = () => {
  const [visibleSections, setVisibleSections] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeFilters, setActiveFilters] = useState({
    year: "All",
    language: "All",
    country: "All",
    duration: "All",
    rating: "All"
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [selectedFilm, setSelectedFilm] = useState(null);
  const trailerModalRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setVisibleSections(prev => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }));
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => observer.observe(section));

    return () => {
      sections.forEach(section => observer.unobserve(section));
    };
  }, []);

  const filteredFilms = films.filter(film => {
    const matchesCategory = selectedCategory === "all" || film.category.toLowerCase().includes(selectedCategory);
    const matchesYear = activeFilters.year === "All" || film.year.toString() === activeFilters.year;
    const matchesLanguage = activeFilters.language === "All" || film.language === activeFilters.language;
    const matchesCountry = activeFilters.country === "All" || film.country === activeFilters.country;
    const matchesSearch = film.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         film.director.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesYear && matchesLanguage && matchesCountry && matchesSearch;
  });

  const sortedFilms = [...filteredFilms].sort((a, b) => {
    if (sortBy === "newest") return b.year - a.year;
    if (sortBy === "oldest") return a.year - b.year;
    if (sortBy === "title") return a.title.localeCompare(b.title);
    return 0;
  });

  const handleFilterChange = (filterType, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleTrailerClick = (e, film) => {
    e.stopPropagation();
    setSelectedTrailer(film.trailerUrl);
    setShowTrailer(true);
    setIsPlaying(false);
  };

  const handleWatchFilm = (e, film) => {
    e.stopPropagation();
    setSelectedFilm(film);
    setSelectedTrailer(film.filmUrl);
    setShowTrailer(true);
    setIsPlaying(true);
  };

  const closeTrailer = () => {
    setShowTrailer(false);
    setSelectedTrailer(null);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleVideoEnd = () => {
    if (!isPlaying) {
      closeTrailer();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (trailerModalRef.current && !trailerModalRef.current.contains(event.target)) {
        closeTrailer();
      }
    };

    if (showTrailer) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTrailer]);

  return (
    <div className="min-h-screen bg-[#0A192F] text-white">
      <NavBar />
      
      <div className="relative min-h-screen pt-20">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 -left-40 w-80 h-80 bg-[#FFD700]/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-[#0A192F]/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          {/* Header Section */}
          <section id="catalog-header" className={`mb-16 transition-opacity duration-1000 ${
            visibleSections['catalog-header'] ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div>
                <div className="mb-4">
                  <span className="text-[#FFD700]/80 tracking-[0.3em] uppercase text-sm font-light">Film Collection</span>
                </div>
                <h1 className="text-6xl font-light mb-4 tracking-[0.2em] uppercase text-[#E6F1FF]">Browse</h1>
                <div className="w-24 h-[1px] bg-[#FFD700]/30 mb-8"></div>
                <p className="text-xl text-[#8892B0] max-w-2xl leading-relaxed font-light tracking-wide">
                  Explore our curated collection of independent films from emerging filmmakers worldwide.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "text-[#FFD700]" : "text-[#8892B0]"}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "text-[#FFD700]" : "text-[#8892B0]"}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </section>

          {/* Categories Navigation */}
          <section id="categories" className={`mb-12 transition-opacity duration-1000 ${
            visibleSections['categories'] ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-6 py-3 whitespace-nowrap transition-all duration-300 ${
                    selectedCategory === category.id
                      ? "bg-[#FFD700]/10 border-[#FFD700]/30 text-[#FFD700]"
                      : "border-[#FFD700]/10 hover:border-[#FFD700]/20 text-[#8892B0] hover:text-[#E6F1FF]"
                  } border rounded-none`}
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Search and Filter Bar */}
          <section id="search-filter" className={`mb-12 transition-opacity duration-1000 ${
            visibleSections['search-filter'] ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1 w-full">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search films by title, director, or genre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#112240] border border-[#FFD700]/20 rounded-none px-4 py-3 pl-12 focus:outline-none focus:border-[#FFD700]/40 transition-colors text-[#E6F1FF] placeholder-[#8892B0]"
                  />
                  <svg className="w-5 h-5 text-[#8892B0] absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center gap-2 px-6 py-3 border border-[#FFD700]/20 rounded-none hover:border-[#FFD700]/40 transition-colors text-[#E6F1FF]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#112240] border border-[#FFD700]/20 rounded-none px-6 py-3 focus:outline-none focus:border-[#FFD700]/40 transition-colors text-[#E6F1FF]"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title A-Z</option>
                </select>
              </div>
            </div>

            {/* Filter Panel */}
            {isFilterOpen && (
              <div className="mt-4 p-6 bg-[#112240] border border-[#FFD700]/20 rounded-none">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  {Object.entries(filters).map(([filterType, options]) => (
                    <div key={filterType}>
                      <label className="block text-sm text-[#FFD700]/60 mb-2 capitalize">{filterType}</label>
                      <select
                        value={activeFilters[filterType]}
                        onChange={(e) => handleFilterChange(filterType, e.target.value)}
                        className="w-full bg-[#0A192F] border border-[#FFD700]/20 rounded-none px-4 py-2 focus:outline-none focus:border-[#FFD700]/40 transition-colors text-[#E6F1FF]"
                      >
                        {options.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Films Display */}
          <section id="films-display" className={`transition-opacity duration-1000 ${
            visibleSections['films-display'] ? 'opacity-100' : 'opacity-0'
          }`}>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sortedFilms.map((film) => (
                  <div 
                    key={film.id}
                    className="group relative aspect-[16/9] bg-cover bg-center rounded-none overflow-hidden cursor-pointer"
                    style={{ backgroundImage: `url(${film.image})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A192F]/90 via-[#0A192F]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 p-8">
                        <h3 className="text-2xl font-light mb-2 tracking-wide text-[#E6F1FF]">{film.title}</h3>
                        <p className="text-[#FFD700]/60 mb-2">{film.director} • {film.year}</p>
                        <p className="text-[#8892B0] text-sm mb-4">{film.duration} • {film.rating}</p>
                        <p className="text-[#8892B0] text-sm mb-6">{film.genre}</p>
                        <div className="flex gap-4">
                          <button 
                            onClick={(e) => handleTrailerClick(e, film)}
                            className="text-[#FFD700] hover:text-[#FFD700]/80 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Watch Trailer
                          </button>
                          <button 
                            onClick={(e) => handleWatchFilm(e, film)}
                            className="text-[#FFD700] hover:text-[#FFD700]/80 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            </svg>
                            Watch Film
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedFilms.map((film) => (
                  <div 
                    key={film.id}
                    className="group flex gap-6 p-6 bg-[#112240] border border-[#FFD700]/20 rounded-none hover:border-[#FFD700]/40 transition-all cursor-pointer"
                  >
                    <div 
                      className="w-48 aspect-[16/9] bg-cover bg-center relative cursor-pointer group"
                      style={{ backgroundImage: `url(${film.image})` }}
                      onClick={(e) => handleTrailerClick(e, film)}
                    >
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-[#FFD700] flex items-center gap-2">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Watch Trailer</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-light mb-2 tracking-wide text-[#E6F1FF]">{film.title}</h3>
                      <p className="text-[#FFD700]/60 mb-2">{film.director} • {film.year}</p>
                      <p className="text-[#8892B0] text-sm mb-4">{film.duration} • {film.rating} • {film.genre}</p>
                      <p className="text-[#8892B0] mb-6">{film.description}</p>
                      <button 
                        onClick={(e) => handleWatchFilm(e, film)}
                        className="border-2 border-[#FFD700]/30 px-6 py-2 rounded-none hover:bg-[#FFD700]/10 transition-all duration-300 text-[#FFD700]/90 tracking-wider text-sm uppercase flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                        Watch Full Film
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results Message */}
            {sortedFilms.length === 0 && (
              <div className="text-center py-16">
                <p className="text-[#FFD700]/60 text-lg mb-4">No films found matching your criteria.</p>
                <button 
                  onClick={() => {
                    setSelectedCategory("all");
                    setActiveFilters({
                      year: "All",
                      language: "All",
                      country: "All",
                      duration: "All",
                      rating: "All"
                    });
                    setSearchQuery("");
                  }}
                  className="text-[#E6F1FF] hover:text-[#FFD700] transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Video Modal */}
      {(showTrailer && selectedTrailer) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0A192F]/95 backdrop-blur-sm">
          <div 
            ref={trailerModalRef}
            className="relative w-full max-w-5xl bg-black"
          >
            <button 
              onClick={closeTrailer}
              className="absolute -top-12 right-0 text-[#8892B0] hover:text-[#E6F1FF] transition-colors z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="relative aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full"
                src={selectedTrailer}
                poster={isPlaying ? undefined : selectedFilm?.trailerThumbnail}
                controls
                autoPlay={!isPlaying}
                playsInline
                onEnded={handleVideoEnd}
              >
                Your browser does not support the video tag.
              </video>
              
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.play();
                        setIsPlaying(true);
                      }
                    }}
                    className="text-[#FFD700] hover:text-[#FFD700]/80 transition-colors"
                  >
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {isPlaying && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-light text-[#E6F1FF]">{selectedFilm?.title}</h3>
                  <button
                    onClick={() => {
                      setSelectedTrailer(selectedFilm?.trailerUrl);
                      setIsPlaying(false);
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        videoRef.current.play();
                      }
                    }}
                    className="text-[#FFD700] hover:text-[#FFD700]/80 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Watch Trailer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default BrowsePage
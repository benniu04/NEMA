import React, { useState, useEffect } from 'react'
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
    country: "USA"
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

const categories = ["All", "Feature Film", "Short Film", "Documentary", "Animation"];
const years = ["All", "2024", "2023", "2022", "2021"];
const languages = ["All", "English", "Spanish", "French", "German"];
const countries = ["All", "USA", "UK", "France", "Germany"];

const CatalogPage = () => {
  const [visibleSections, setVisibleSections] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

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
    const matchesCategory = selectedCategory === "All" || film.category === selectedCategory;
    const matchesYear = selectedYear === "All" || film.year.toString() === selectedYear;
    const matchesLanguage = selectedLanguage === "All" || film.language === selectedLanguage;
    const matchesCountry = selectedCountry === "All" || film.country === selectedCountry;
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
          <section id="catalog-header" className={`text-center mb-16 transition-opacity duration-1000 ${
            visibleSections['catalog-header'] ? 'opacity-100' : 'opacity-0'
          }`}>
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
          <section id="filters" className={`mb-12 transition-opacity duration-1000 ${
            visibleSections['filters'] ? 'opacity-100' : 'opacity-0'
          }`}>
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

          {/* Films Grid */}
          <section id="films-grid" className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-1000 ${
            visibleSections['films-grid'] ? 'opacity-100' : 'opacity-0'
          }`}>
            {sortedFilms.map((film) => (
              <div 
                key={film.id}
                className="group relative aspect-[16/9] bg-cover bg-center rounded-none overflow-hidden cursor-pointer"
                style={{ backgroundImage: `url(${film.image})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 p-8">
                    <h3 className="text-2xl font-light mb-2 tracking-wide">{film.title}</h3>
                    <p className="text-amber-100/60 mb-2">{film.director} • {film.year}</p>
                    <p className="text-amber-100/60 text-sm">{film.duration} • {film.rating}</p>
                    <p className="text-amber-100/60 text-sm mt-2">{film.genre}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* No Results Message */}
          {sortedFilms.length === 0 && (
            <div className="text-center py-12">
              <p className="text-amber-100/60 text-lg">No films found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CatalogPage
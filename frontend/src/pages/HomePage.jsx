import React, { useEffect, useState, useRef } from 'react'
import NavBar from '../components/NavBar'

const featuredFilms = [
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
    cast: ["Brie Larson", "Samuel L. Jackson", "Ben Mendelsohn"],
    category: "Feature Film",
    language: "English",
    country: "USA",
    awards: ["Best Director", "Best Cinematography"],
    featured: true,
    trailerUrl: "",
    streamingUrl: "/watch/the-solo",
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
    cast: ["Idris Elba", "Charlie Hunnam", "Rinko Kikuchi"],
    category: "Feature Film",
    language: "English",
    country: "USA",
    awards: ["Best Visual Effects"],
    featured: true,
    trailerUrl: "https://www.youtube.com/embed/example2",
    streamingUrl: "/watch/pacific-rim",
    trailerThumbnail: "trailer-thumb-2.jpg"
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
    cast: ["Jeff Bridges", "Garrett Hedlund", "Olivia Wilde"],
    category: "Feature Film",
    language: "English",
    country: "USA",
    awards: ["Best Sound Design"],
    featured: true,
    trailerUrl: "https://www.youtube.com/embed/example3",
    streamingUrl: "/watch/tron-legacy",
    trailerThumbnail: "trailer-thumb-3.jpg"
  }
];

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
    awards: ["Best Director", "Best Cinematography"],
    featured: true,
    trailerUrl: "https://www.youtube.com/embed/example1",
    streamingUrl: "/watch/the-solo",
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
    country: "USA",
    awards: ["Best Visual Effects"],
    featured: true,
    trailerUrl: "https://www.youtube.com/embed/example2",
    streamingUrl: "/watch/pacific-rim",
    trailerThumbnail: "trailer-thumb-2.jpg"
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
    country: "USA",
    awards: ["Best Sound Design"],
    featured: true,
    trailerUrl: "https://www.youtube.com/embed/example3",
    streamingUrl: "/watch/tron-legacy",
    trailerThumbnail: "trailer-thumb-3.jpg"
  },
  // Add more sample films for demonstration
  {
    id: 4,
    title: "The Last Journey",
    director: "Sarah Chen",
    year: 2024,
    image: "documentary-1.jpg",
    description: "A documentary exploring the lives of nomadic communities in Mongolia.",
    duration: "1h 45m",
    rating: "PG",
    genre: "Documentary",
    category: "Documentary",
    language: "English",
    country: "Mongolia",
    featured: false
  },
  {
    id: 5,
    title: "Echoes of Time",
    director: "Michael Rodriguez",
    year: 2024,
    image: "drama-1.jpg",
    description: "A family drama spanning three generations.",
    duration: "2h 15m",
    rating: "PG-13",
    genre: "Drama",
    category: "Drama",
    language: "English",
    country: "USA",
    featured: false
  },
  {
    id: 6,
    title: "Digital Dreams",
    director: "Emma Thompson",
    year: 2024,
    image: "experimental-1.jpg",
    description: "An experimental film exploring the intersection of technology and human consciousness.",
    duration: "45m",
    rating: "Not Rated",
    genre: "Experimental",
    category: "Experimental",
    language: "English",
    country: "UK",
    featured: false
  },
  {
    id: 7,
    title: "Whispers of the Wind",
    director: "Yuki Tanaka",
    year: 2024,
    image: "animation-1.jpg",
    description: "A hand-drawn animated film about a young girl's journey through a magical forest.",
    duration: "1h 30m",
    rating: "G",
    genre: "Animation",
    category: "Animation",
    language: "Japanese",
    country: "Japan",
    featured: false
  }
];

const categoryDefinitions = [
  {
    name: 'Documentary',
    image: 'documentary-wallpaper.jpg',
    description: 'Real stories, real impact',
    matchCategory: 'Documentary'
  },
  {
    name: 'Drama',
    image: 'drama-wallpaper.jpg',
    description: 'Compelling narratives',
    matchCategory: 'Drama'
  },
  {
    name: 'Experimental',
    image: 'experimental-wallpaper.png',
    description: 'Pushing boundaries',
    matchCategory: 'Experimental'
  },
  {
    name: 'Animation',
    image: 'animation-wallpaper.jpg',
    description: 'Creative storytelling',
    matchCategory: 'Animation'
  }
];

const stats = [
  { label: "Films", value: "500+", description: "Curated collection" },
  { label: "Filmmakers", value: "200+", description: "Global community" },
  { label: "Countries", value: "50+", description: "Worldwide reach" },
  { label: "Monthly Views", value: "100K+", description: "Growing audience" }
];

const faqs = [
  {
    question: "What is NEMA?",
    answer: "NEMA is a platform dedicated to showcasing independent films and emerging filmmakers. We curate a diverse collection of unique cinematic voices and stories from around the world."
  },
  {
    question: "How can I submit my film?",
    answer: "Filmmakers can submit their work through our submission portal. We accept feature films, short films, documentaries, and experimental works. Visit our Contact page for submission guidelines and requirements."
  },
  {
    question: "Is NEMA free to use?",
    answer: "NEMA offers both free and premium content. Some films are available to watch for free, while others may require a subscription. We also offer special access for filmmakers and educational institutions."
  },
  {
    question: "How are films selected for the platform?",
    answer: "Our curation team reviews all submissions based on artistic merit, storytelling quality, and technical execution. We prioritize unique voices and perspectives that contribute to the diversity of independent cinema."
  },
  {
    question: "Can I download films to watch offline?",
    answer: "Currently, films are only available for streaming on our platform. This helps us protect filmmakers' rights and ensure proper attribution for their work."
  }
];

const HomePage = () => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [selectedFilm, setSelectedFilm] = useState(null);
  const [visibleSections, setVisibleSections] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const featuredFilmsRef = useRef(null);
  const [openFaq, setOpenFaq] = useState(null);
  const trailerModalRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const handleFilmClick = (film) => {
    setSelectedFilm(film);
  };

  const handleCloseModal = () => {
    setSelectedFilm(null);
  };

  const scrollToFeatured = () => {
    featuredFilmsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const getCategoryCounts = () => {
    return categoryDefinitions.map(category => ({
      ...category,
      count: films.filter(film => film.category === category.matchCategory).length
    }));
  };

  const categories = getCategoryCounts();

  const handleTrailerClick = (e, film) => {
    e.stopPropagation();
    setSelectedTrailer(film.trailerUrl);
    setShowTrailer(true);
  };

  const handleWatchFilm = (e, film) => {
    e.stopPropagation();
    window.location.href = film.streamingUrl;
  };

  const closeTrailer = () => {
    setShowTrailer(false);
    setSelectedTrailer(null);
  };

  // Close trailer when clicking outside
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
      
      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A192F]/50 to-[#0A192F] z-10"></div>
        <div 
          className="absolute inset-0 bg-[#0A192F] bg-cover bg-center opacity-50"
          style={{ 
            backgroundImage: "url('hero-bg.jpg')",
            transform: `translateY(${scrollPosition * 0.5}px)`
          }}
        ></div>
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            <div className="mb-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <span className="text-[#FFD700]/80 tracking-[0.3em] uppercase text-sm font-light">Independent Cinema</span>
            </div>
            <h1 className="text-7xl font-light mb-6 tracking-tight animate-fade-in" style={{ animationDelay: '0.4s' }}>
              Discover Unique<br />
              <span className="text-[#FFD700]/90">Cinematic Voices</span>
            </h1>
            <div className="w-24 h-[1px] bg-[#FFD700]/30 mb-8 animate-expand" style={{ animationDelay: '0.6s' }}></div>
            <p className="text-2xl text-[#8892B0] mb-8 max-w-2xl leading-relaxed font-light tracking-wide animate-fade-in" style={{ animationDelay: '0.8s' }}>
              A curated collection of independent films and emerging filmmakers from around the world.
            </p>
            <div className="flex gap-6 animate-fade-in" style={{ animationDelay: '1s' }}>
              <button 
                onClick={scrollToFeatured}
                className="border-2 border-[#FFD700]/30 px-8 py-4 rounded-none hover:bg-[#FFD700]/10 transition-all duration-300 text-[#FFD700]/90 tracking-wider text-lg uppercase"
              >
                Explore Films
              </button>
              <button 
                onClick={() => window.location.href = '/about'}
                className="border-2 border-[#FFD700]/30 px-8 py-4 rounded-none hover:bg-[#FFD700]/10 transition-all duration-300 text-[#FFD700]/90 tracking-wider text-lg uppercase"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Films Section */}
      <section 
        ref={featuredFilmsRef}
        id="featured" 
        className={`relative py-32 transition-opacity duration-1000 ${
          visibleSections['featured'] ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <div className="mb-4">
              <span className="text-[#FFD700]/80 tracking-[0.3em] uppercase text-sm font-light">Featured Collection</span>
            </div>
            <h2 className="text-4xl font-light mb-6 tracking-tight text-[#E6F1FF]">Featured Films</h2>
            <div className="w-24 h-[1px] bg-[#FFD700]/30 mb-8"></div>
            <p className="text-xl text-[#8892B0] max-w-2xl leading-relaxed font-light tracking-wide">
              Discover our handpicked selection of exceptional independent films that showcase unique storytelling and artistic vision.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {featuredFilms.map((film) => (
              <div 
                key={film.id} 
                className="group relative aspect-[16/9] bg-cover bg-center rounded-none overflow-hidden cursor-pointer"
                style={{ backgroundImage: `url(${film.image})` }}
                onClick={() => handleFilmClick(film)}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A192F]/90 via-[#0A192F]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 p-8">
                    <div className="mb-4">
                      <span className="text-[#FFD700]/60 text-sm tracking-wide">{film.category}</span>
                    </div>
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
        </div>
      </section>

      {/* Categories Section */}
      <section 
        id="categories" 
        className={`relative py-32 transition-opacity duration-1000 ${
          visibleSections['categories'] ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <div className="mb-4">
              <span className="text-[#FFD700]/80 tracking-[0.3em] uppercase text-sm font-light">Explore</span>
            </div>
            <h2 className="text-4xl font-light mb-6 tracking-tight text-[#E6F1FF]">Film Categories</h2>
            <div className="w-24 h-[1px] bg-[#FFD700]/30 mb-8"></div>
            <p className="text-xl text-[#8892B0] max-w-2xl leading-relaxed font-light tracking-wide">
              Discover films across different genres and styles, each offering a unique perspective on storytelling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category) => (
              <div 
                key={category.name}
                className="group relative aspect-square bg-cover bg-center rounded-none overflow-hidden cursor-pointer"
                style={{ backgroundImage: `url(${category.image})` }}
                onMouseEnter={() => setActiveCategory(category.name)}
                onMouseLeave={() => setActiveCategory(null)}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A192F]/90 via-[#0A192F]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                    <h3 className="text-2xl font-light mb-2 tracking-wide text-[#E6F1FF]">{category.name}</h3>
                    <p className="text-[#FFD700]/60 mb-4">{category.count} {category.count === 1 ? 'Film' : 'Films'}</p>
                    <p className="text-[#8892B0] mb-6">{category.description}</p>
                    <button className="text-[#FFD700] hover:text-[#FFD700]/80 transition-colors flex items-center gap-2">
                      Explore
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        id="cta" 
        className={`relative py-32 transition-opacity duration-1000 ${
          visibleSections['cta'] ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-4">
            <span className="text-[#FFD700]/80 tracking-[0.3em] uppercase text-sm font-light">Join Our Community</span>
          </div>
          <h2 className="text-4xl font-light mb-6 tracking-tight text-[#E6F1FF]">Support Independent Cinema</h2>
          <div className="w-24 h-[1px] bg-[#FFD700]/30 mx-auto mb-8"></div>
          <p className="text-xl text-[#8892B0] mb-12 max-w-2xl mx-auto leading-relaxed font-light tracking-wide">
            Whether you're a filmmaker looking to share your work or a viewer seeking unique 
            cinematic experiences, NEMA welcomes you to be part of our story.
          </p>
          <div className="flex gap-6 justify-center">
            <button 
              onClick={() => window.location.href = '/browse'}
              className="border-2 border-[#FFD700]/30 px-8 py-4 rounded-none hover:bg-[#FFD700]/10 transition-all duration-300 text-[#FFD700]/90 tracking-wider text-lg uppercase"
            >
              Start Watching
            </button>
            <button 
              onClick={() => window.location.href = '/contact'}
              className="border-2 border-[#FFD700]/30 px-8 py-4 rounded-none hover:bg-[#FFD700]/10 transition-all duration-300 text-[#FFD700]/90 tracking-wider text-lg uppercase"
            >
              Submit Your Film
            </button>
          </div>
        </div>
      </section>

      {/* Film Info Modal */}
      {selectedFilm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F]/90 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div 
            className="relative bg-[#112240] border border-[#FFD700]/20 rounded-none max-w-4xl w-full p-8"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-[#8892B0] hover:text-[#E6F1FF] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div 
                  className="aspect-[16/9] bg-cover bg-center relative cursor-pointer group"
                  style={{ backgroundImage: `url(${selectedFilm.image})` }}
                  onClick={(e) => handleTrailerClick(e, selectedFilm)}
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
                <button 
                  onClick={(e) => handleWatchFilm(e, selectedFilm)}
                  className="w-full border-2 border-[#FFD700]/30 px-8 py-4 rounded-none hover:bg-[#FFD700]/10 transition-all duration-300 text-[#FFD700]/90 tracking-wider text-lg uppercase flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                  Watch Full Film
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="mb-4">
                    <span className="text-[#FFD700]/60 text-sm tracking-wide">{selectedFilm.category}</span>
                  </div>
                  <h2 className="text-4xl font-light tracking-tight mb-2 text-[#E6F1FF]">{selectedFilm.title}</h2>
                  <p className="text-[#FFD700]/60 mb-2">{selectedFilm.director} • {selectedFilm.year}</p>
                  <p className="text-[#8892B0] text-sm mb-4">{selectedFilm.duration} • {selectedFilm.rating} • {selectedFilm.genre}</p>
                </div>
                
                <p className="text-[#8892B0] leading-relaxed">{selectedFilm.description}</p>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[#E6F1FF] mb-2">Cast</h3>
                    <p className="text-[#8892B0]">{selectedFilm.cast.join(', ')}</p>
                  </div>
                  
                  {selectedFilm.awards && (
                    <div>
                      <h3 className="text-[#E6F1FF] mb-2">Awards</h3>
                      <ul className="list-disc list-inside text-[#8892B0]">
                        {selectedFilm.awards.map((award, index) => (
                          <li key={index}>{award}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <section 
        id="faq" 
        className={`relative min-h-screen py-20 px-4 flex items-center overflow-hidden transition-opacity duration-1000 ${
          visibleSections['faq'] ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div 
          className="absolute inset-0 bg-[#0A192F] bg-cover bg-center opacity-30"
          style={{ transform: `translateY(${scrollPosition * 0.1}px)` }}
        ></div>
        <div className="relative z-20 max-w-4xl mx-auto w-full">
          <div className="text-center mb-16">
            <div className="mb-4">
              <span className="text-[#FFD700]/80 tracking-[0.3em] uppercase text-sm font-light">Common Questions</span>
            </div>
            <h2 className="text-4xl font-light mb-4 tracking-[0.2em] uppercase text-[#E6F1FF]">FAQ</h2>
            <div className="w-24 h-[1px] bg-[#FFD700]/30 mx-auto mb-8"></div>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="border border-[#FFD700]/20 rounded-none overflow-hidden"
              >
                <button
                  className="w-full px-8 py-6 text-left flex justify-between items-center hover:bg-[#112240] transition-colors"
                  onClick={() => toggleFaq(index)}
                >
                  <span className="text-lg font-light tracking-wide text-[#E6F1FF]">{faq.question}</span>
                  <span className={`transform transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`}>
                    <svg className="w-6 h-6 text-[#FFD700]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === index ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <div className="px-8 py-6 text-[#8892B0] border-t border-[#FFD700]/20">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trailer Modal */}
      {showTrailer && selectedTrailer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0A192F]/95 backdrop-blur-sm">
          <div 
            ref={trailerModalRef}
            className="relative w-full max-w-5xl aspect-video bg-black"
          >
            <button 
              onClick={closeTrailer}
              className="absolute -top-12 right-0 text-[#8892B0] hover:text-[#E6F1FF] transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <iframe
              className="w-full h-full"
              src={`${selectedTrailer}?autoplay=1`}
              title="Film Trailer"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage
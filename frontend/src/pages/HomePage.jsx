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
    cast: ["Brie Larson", "Samuel L. Jackson", "Ben Mendelsohn"]
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
    cast: ["Idris Elba", "Charlie Hunnam", "Rinko Kikuchi"]
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
    cast: ["Jeff Bridges", "Garrett Hedlund", "Olivia Wilde"]
  }
]

const HomePage = () => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [selectedFilm, setSelectedFilm] = useState(null);
  const [visibleSections, setVisibleSections] = useState({});

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

  return (
    <div className="min-h-screen bg-black text-white">
      <NavBar />
      {/* Hero Section */}
      <section id="hero" className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black z-10"></div>
        <div 
          className="absolute inset-0 bg-black bg-cover bg-center opacity-50 animate-fade-in"
          style={{ transform: `translateY(${scrollPosition * 0.5}px)` }}
        ></div>
        <div className="relative z-20 text-center px-4">
          <div className="mb-4 animate-slide-down" style={{ animationDelay: '0.2s' }}>
            <span className="text-amber-100/80 tracking-[0.3em] uppercase text-sm font-light">Independent Cinema</span>
          </div>
          <h1 className="text-8xl font-light mb-4 tracking-[0.2em] uppercase animate-slide-up" style={{ animationDelay: '0.4s' }}>
            NEMA
          </h1>
          <div className="w-24 h-[1px] bg-amber-100/30 mx-auto mb-8 animate-expand" style={{ animationDelay: '0.6s' }}></div>
          <p className="text-2xl text-gray-300 mb-6 max-w-2xl mx-auto leading-relaxed font-light tracking-wide animate-fade-in" style={{ animationDelay: '0.8s' }}>
            Discover independent films and short stories from emerging filmmakers worldwide.
          </p>
          <p className="text-gray-400 mb-12 max-w-xl mx-auto font-light animate-fade-in" style={{ animationDelay: '1s' }}>
            A curated collection of unique voices and perspectives in contemporary cinema.
          </p>
          <div className="flex gap-6 justify-center animate-fade-in" style={{ animationDelay: '1.2s' }}>
            <button className="border-2 border-white/30 px-10 py-4 rounded-none hover:bg-white/10 transition-all duration-300 text-white/90 tracking-wider text-lg uppercase">
              Start Watching
            </button>
            <button className="border-2 border-amber-100/30 px-10 py-4 rounded-none hover:bg-amber-100/10 transition-all duration-300 text-amber-100/90 tracking-wider text-lg uppercase">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section 
        id="featured" 
        className={`relative min-h-screen py-20 px-4 flex items-center overflow-hidden transition-opacity duration-1000 ${
          visibleSections['featured'] ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div 
          className="absolute inset-0 featured-bg bg-cover bg-center opacity-30"
          style={{ transform: `translateY(${scrollPosition * 0.3}px)` }}
        ></div>
        <div className="relative z-20 max-w-7xl mx-auto w-full">
          <h2 className="text-3xl font-semibold mb-16 text-center">Featured Films</h2>
          <div className="flex gap-8 overflow-x-auto pb-8">
            {featuredFilms.map((film) => (
              <div 
                key={film.id} 
                className="group relative w-[400px] h-[500px] flex-shrink-0 bg-cover bg-center rounded-lg overflow-hidden cursor-pointer"
                style={{ backgroundImage: `url(${film.image})` }}
                onClick={() => handleFilmClick(film)}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 p-8">
                    <h3 className="text-2xl font-medium mb-2">{film.title}</h3>
                    <p className="text-base text-gray-300">{film.director} • {film.year}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Film Info Overlay */}
      {selectedFilm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div 
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            style={{ 
              backgroundImage: `url(${selectedFilm.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.1
            }}
          ></div>
          <div 
            className="relative bg-black/40 backdrop-blur-md border border-white/10 rounded-lg max-w-2xl w-full p-8"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="space-y-6">
              <div>
                <h2 className="text-4xl font-light tracking-tight mb-2">{selectedFilm.title}</h2>
                <p className="text-white/60 text-sm">{selectedFilm.director} • {selectedFilm.year}</p>
              </div>
              
              <p className="text-white/80 leading-relaxed">{selectedFilm.description}</p>
              
              <div className="flex gap-4 text-sm text-white/60">
                <span>{selectedFilm.duration}</span>
                <span>•</span>
                <span>{selectedFilm.genre}</span>
              </div>
              
              <div className="pt-4 border-t border-white/10">
                <button className="text-white/80 hover:text-white transition-colors">
                  Watch Film →
                </button>
              </div>
              <div className="pt-4 border-t border-white/10">
                <button className="text-white/80 hover:text-white transition-colors">
                  People →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories Section */}
      <section 
        id="categories" 
        className={`relative min-h-screen py-20 px-4 flex items-center overflow-hidden transition-opacity duration-1000 ${
          visibleSections['categories'] ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div 
          className="absolute inset-0 categories-bg bg-cover bg-center opacity-30"
          style={{ transform: `translateY(${scrollPosition * 0.2}px)` }}
        ></div>
        <div className="relative z-20 max-w-7xl mx-auto w-full">
          <h2 className="text-3xl font-semibold mb-8 text-center">Explore Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            {[
              {
                name: 'Documentary',
                image: 'documentary-wallpaper.jpg'
              },
              {
                name: 'Drama',
                image: 'drama-wallpaper.jpg'
              },
              {
                name: 'Experimental',
                image: 'experimental-wallpaper.png'
              },
              {
                name: 'Animation',
                image: 'animation-wallpaper.jpg'
              }
            ].map((category) => (
              <div 
                key={category.name} 
                className="aspect-square bg-cover bg-center rounded-lg overflow-hidden group cursor-pointer relative"
                style={{ 
                  backgroundImage: `url(${category.image})`
                }}
              >
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-medium">{category.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        id="cta" 
        className={`relative min-h-screen py-20 px-4 flex items-center overflow-hidden transition-opacity duration-1000 ${
          visibleSections['cta'] ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30"
          style={{ transform: `translateY(${scrollPosition * 0.1}px)` }}
        ></div>
        <div className="relative z-20 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">Support Independent Cinema</h2>
          <p className="text-gray-400 mb-12">
            Join our community of filmmakers and film enthusiasts. Watch, share, and discover unique stories from around the world.
          </p>
          <button className="border-2 border-white px-8 py-3 rounded-md hover:bg-white hover:text-black transition-colors">
            Join Now
          </button>
        </div>
      </section>
    </div>
  )
}

export default HomePage
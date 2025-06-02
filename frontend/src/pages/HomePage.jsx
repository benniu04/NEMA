import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { Play, ChevronDown, ArrowRight } from 'lucide-react'
import API_BASE_URL from '../../config/api.js'

// Testimonials from directors and filmmakers
const testimonials = [
  {
    quote: "NEMA's platform gave my indie film the visibility it deserved. They truly care about authentic storytelling.",
    author: "Isabella Chen",
    role: "Independent Filmmaker"
  },
  {
    quote: "A revolutionary space for emerging voices in cinema. NEMA connects artists with audiences who appreciate artistic vision.",
    author: "Marcus Rivera",
    role: "Director & Producer"
  },
  {
    quote: "The curation at NEMA is unmatched. They're preserving the art of filmmaking in the digital age.",
    author: "Sophia Williams",
    role: "Film Critic"
  }
];

const categories = [
  {
    name: 'Documentary',
    image: 'documentary-wallpaper.jpg',
    description: 'True stories that challenge perspectives'
  },
  {
    name: 'Drama',
    image: 'drama-wallpaper.jpg',
    description: 'Emotional narratives that reflect human experience'
  },
  {
    name: 'Experimental',
    image: 'experimental-wallpaper.png',
    description: 'Breaking conventions of traditional filmmaking'
  },
  {
    name: 'Animation',
    image: 'animation-wallpaper.jpg',
    description: 'Imaginative worlds brought to life'
  }
];

const HomePage = () => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [visibleSections, setVisibleSections] = useState({});
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const heroVideoRef = useRef(null);
  const heroRef = useRef(null);
  const featuredFilmsRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchFeaturedMovies = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/movies?limit=3`);
        if (!response.ok) {
          throw new Error('Failed to fetch featured movies');
        }
        const data = await response.json();
        setFeaturedMovies(data);
      } catch (err) {
        console.error('Error fetching featured movies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedMovies();
  }, []);

  const scrollToFeatured = () => {
    featuredFilmsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  // Testimonial carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
    }, 8000); // Increased to 8 seconds for a more relaxed pace
    
    return () => clearInterval(interval);
  }, []);

  // Play hero background video on load
  useEffect(() => {
    if (heroVideoRef.current) {
      heroVideoRef.current.play().catch(error => {
        console.log("Autoplay prevented:", error);
      });
    }
  }, []);

  // Parallax effect for hero section
  useEffect(() => {
    const handleParallax = () => {
      if (heroRef.current) {
        const scrollPosition = window.scrollY;
        const heroHeight = heroRef.current.offsetHeight;
        const parallaxElements = heroRef.current.querySelectorAll('.parallax');
        
        parallaxElements.forEach((el, index) => {
          const speed = 0.2 + (index * 0.1);
          const yPos = -(scrollPosition * speed);
          el.style.transform = `translate3d(0, ${yPos}px, 0)`;
        });
      }
    };

    window.addEventListener('scroll', handleParallax);
    return () => window.removeEventListener('scroll', handleParallax);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <NavBar />
      
      {/* Hero Section with Cinematic Background */}
      <section 
        ref={heroRef}
        id="hero" 
        className="relative h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Video Background */}
        {/* Uncomment when you have a video available */}
        {/* <video 
          ref={heroVideoRef}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          loop 
          muted 
          playsInline
        >
          <source src="/hero-background.mp4" type="video/mp4" />
        </video> */}
        
        {/* Cinematic Letterbox Bars */}
        <div className="absolute top-0 left-0 right-0 h-[4vh] bg-black z-40"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[4vh] bg-black z-40"></div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black z-10"></div>
        
        {/* Film Grain Effect */}
        <div className="absolute inset-0 bg-[url('/film-grain.png')] opacity-[0.03] mix-blend-overlay z-10 pointer-events-none"></div>
        
        {/* Parallax Background */}
        <div 
          className="absolute inset-0 bg-[url('/hero-bg.jpg')] bg-cover bg-center opacity-60 parallax"
        ></div>
        
        {/* Content */}
        <div className="relative z-20 text-center px-4 max-w-5xl mx-auto">
          <div className="mb-6 opacity-0 animate-fade-in" style={{ animationDelay: '0.2s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            <span className="text-amber-100/80 tracking-[0.6em] uppercase text-sm font-extralight">Independent Cinema</span>
          </div>
          
          {/* Main Logo/Title */}
          <h1 className="text-7xl md:text-9xl font-extralight mb-6 tracking-[0.3em] uppercase opacity-0 animate-fade-in" style={{ animationDelay: '0.4s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            NEMA
          </h1>
          
          {/* Cinematic Line */}
          <div className="w-0 h-[1px] bg-amber-100/30 mx-auto mb-10 opacity-0 animate-expand" style={{ animationDelay: '0.6s', animationDuration: '1.5s', animationFillMode: 'forwards' }}></div>
          
          {/* Tagline */}
          <p className="text-2xl md:text-3xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed font-extralight tracking-wide opacity-0 animate-fade-in" style={{ animationDelay: '0.8s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            Discover storytelling beyond boundaries.
          </p>
          
          {/* Subtitle */}
          <p className="text-white/60 mb-12 max-w-xl mx-auto font-light opacity-0 animate-fade-in" style={{ animationDelay: '1s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            A curated collection of unique voices and perspectives in contemporary cinema.
          </p>
          
          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center opacity-0 animate-fade-in" style={{ animationDelay: '1.2s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            <Link to="/catalog" className="group relative overflow-hidden border border-white/20 px-10 py-4 transition-all duration-500 text-white/90 tracking-wider text-base uppercase">
              <span className="relative z-10">Explore Films</span>
              <span className="absolute inset-0 bg-white/5 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></span>
            </Link>
            {featuredMovies.length > 0 && (
              <Link 
                to={`/video/${featuredMovies[0]._id}`} 
                className="group relative overflow-hidden border border-amber-100/20 px-10 py-4 transition-all duration-500 text-amber-100/90 tracking-wider text-base uppercase"
              >
                <span className="relative z-10">Featured Film</span>
                <span className="absolute inset-0 bg-amber-100/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></span>
              </Link>
            )}
          </div>
          
          {/* Scroll Indicator - Repositioned */}
          <div className="mt-16 opacity-0 animate-fade-in" style={{ animationDelay: '1.4s', animationDuration: '1.5s', animationFillMode: 'forwards' }}>
            <button 
              onClick={scrollToFeatured}
              className="flex flex-col items-center cursor-pointer mx-auto hover:opacity-80 transition-opacity duration-300"
            >
              <span className="text-white/50 text-xs tracking-widest uppercase mb-2">Explore</span>
              <ChevronDown className="w-6 h-6 text-white/50 animate-bounce" />
            </button>
          </div>
        </div>
      </section>

      {/* Featured Films Section */}
      <section 
        ref={featuredFilmsRef}
        id="featured" 
        className={`relative py-32 px-6 flex items-center overflow-hidden transition-opacity duration-1000 ${
          visibleSections['featured'] ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Dynamic Background with Parallax */}
        <div 
          className="absolute inset-0 featured-bg bg-cover bg-fixed bg-center opacity-20"
          style={{ transform: `translateY(${scrollPosition * 0.1}px)` }}
        ></div>
        
        {/* Cinematic Light Rays */}
        <div className="absolute top-0 left-0 right-0 h-[30vh] bg-gradient-to-b from-amber-900/10 to-transparent"></div>
        
        {/* Content Container */}
        <div className="relative z-20 max-w-7xl mx-auto w-full">
          {/* Section Title with Film-Style Marker */}
          <div className="flex flex-col items-center mb-20">
            <div className="mb-4">
              <span className="text-amber-100/80 tracking-[0.3em] uppercase text-sm font-extralight">Curator's Selection</span>
            </div>
            <h2 className="text-4xl font-extralight tracking-wide mb-4">Featured Films</h2>
            <div className="w-16 h-[1px] bg-amber-100/30"></div>
          </div>
          
          {/* Film Reel Layout */}
          <div className="featured-films-container">
            <div className="flex gap-8 overflow-x-auto pb-12 md:pb-6 featured-scrollbar snap-x snap-mandatory">
              {loading ? (
                <div className="text-amber-100/60">Loading featured films...</div>
              ) : (
                featuredMovies.map((movie) => (
                  <Link 
                    key={movie._id} 
                    to={`/video/${movie._id}`}
                    className="group relative w-[400px] md:w-[500px] h-[225px] md:h-[280px] flex-shrink-0 overflow-hidden cursor-pointer transform transition-all duration-700 hover:scale-[1.02] snap-center"
                  >
                    {/* Image with proper aspect ratio */}
                    <img 
                      src={movie.thumbnailUrl} 
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Film Frame Border */}
                    <div className="absolute inset-0 border border-white/10 opacity-70 group-hover:opacity-0 transition-opacity duration-500"></div>
                    
                    {/* Film Information Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700">
                      <div className="absolute bottom-0 p-6">
                        <div className="mb-2 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                          <div className="flex flex-wrap gap-2">
                            {movie.genre.map((g, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 text-xs bg-amber-100/10 text-amber-100/80 rounded-sm"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                        <h3 className="text-xl md:text-2xl font-extralight mb-2 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-200">{movie.title}</h3>
                        <p className="text-sm text-white/70 mb-4 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-300">
                          {movie.director} • {new Date(movie.releaseDate).getFullYear()}
                        </p>
                        <p className="text-xs text-white/50 mb-4 line-clamp-2 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-400">
                          {movie.description}
                        </p>
                        
                        {/* Watch Button */}
                        <div className="inline-flex items-center gap-2 text-amber-100/80 group-hover:text-amber-100 transition-colors transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 duration-500 delay-500">
                          <span className="uppercase tracking-widest text-xs font-light">Watch Film</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="w-16 h-16 flex items-center justify-center border border-white/30 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-700 transform translate-y-4 group-hover:translate-y-0 group-hover:scale-110">
                        <Play className="w-6 h-6 text-white/90 ml-1" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section 
        id="testimonials" 
        className={`relative py-32 px-6 overflow-hidden transition-all duration-1000 ${
          visibleSections['testimonials'] ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-black/80"></div>
        
        {/* Film Strip Decorative Element */}
        <div className="absolute top-0 left-0 right-0 h-[30px] bg-[url('/film-strip.png')] bg-repeat-x opacity-30"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[30px] bg-[url('/film-strip.png')] bg-repeat-x opacity-30"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Big Quote Mark */}
          <div className="mb-8 text-8xl text-amber-100/10 font-serif">"</div>
          
          {/* Testimonial Carousel */}
          <div className="relative h-48">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out flex flex-col items-center justify-center ${
                  index === currentTestimonial 
                    ? 'opacity-100 transform translate-x-0 z-10' 
                    : index < currentTestimonial 
                      ? 'opacity-0 transform -translate-x-10 z-0' 
                      : 'opacity-0 transform translate-x-10 z-0'
                }`}
              >
                <p className="text-xl md:text-2xl text-white/90 mb-8 italic leading-relaxed font-light">
                  {testimonial.quote}
                </p>
                <div className="text-amber-100/80 font-normal">
                  {testimonial.author} <span className="text-white/50 font-light ml-2">• {testimonial.role}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Carousel Indicators */}
          <div className="flex justify-center gap-3 mt-16">
            {testimonials.map((_, index) => (
              <button 
                key={index} 
                className={`h-[2px] rounded-none transition-all duration-500 ${
                  index === currentTestimonial ? 'bg-amber-100/70 w-8' : 'bg-white/20 w-4'
                }`}
                onClick={() => setCurrentTestimonial(index)}
                aria-label={`View testimonial ${index + 1}`}
              ></button>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section 
        id="categories" 
        className={`relative py-32 px-6 flex items-center overflow-hidden transition-opacity duration-1000 ${
          visibleSections['categories'] ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Dynamic Background with Parallax */}
        <div 
          className="absolute inset-0 categories-bg bg-cover bg-fixed bg-center opacity-15"
          style={{ transform: `translateY(${scrollPosition * 0.05}px)` }}
        ></div>
        
        {/* Content Container */}
        <div className="relative z-20 max-w-7xl mx-auto w-full">
          {/* Section Title */}
          <div className="flex flex-col items-center mb-20">
            <div className="mb-4">
              <span className="text-amber-100/80 tracking-[0.3em] uppercase text-sm font-extralight">Discover</span>
            </div>
            <h2 className="text-4xl font-extralight tracking-wide mb-4">Film Categories</h2>
            <div className="w-16 h-[1px] bg-amber-100/30"></div>
          </div>
          
          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {categories.map((category) => (
              <div 
                key={category.name} 
                className="relative aspect-[5/6] bg-cover bg-center overflow-hidden cursor-pointer group transform transition-all duration-700 hover:z-10 hover:scale-[1.03]"
                style={{ 
                  backgroundImage: `url(${category.image})`
                }}
              >
                {/* Overlay with Film Texture */}
                <div className="absolute inset-0 bg-black/60 mix-blend-multiply group-hover:bg-black/40 transition-colors duration-700"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                
                {/* Category Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <h3 className="text-2xl font-extralight mb-2 group-hover:text-amber-100/90 transition-colors duration-500">
                    {category.name}
                  </h3>
                  <p className="text-white/70 text-sm mb-4 max-w-[90%] opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-700 delay-100">
                    {category.description}
                  </p>
                  <div className="w-10 h-[1px] bg-amber-100/50 group-hover:w-16 transition-all duration-700 delay-200"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        id="cta" 
        className={`relative py-36 px-6 flex items-center overflow-hidden transition-opacity duration-1000 ${
          visibleSections['cta'] ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Background with Parallax Effect */}
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80')] bg-cover bg-fixed bg-center opacity-15"
        ></div>
        
        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-radial-at-center from-transparent via-black/30 to-black"></div>
        
        {/* Content Container */}
        <div className="relative z-20 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-extralight mb-6 tracking-wide">Support Independent Cinema</h2>
          <div className="w-16 h-[1px] bg-amber-100/30 mx-auto mb-8"></div>
          <p className="text-xl text-white/80 mb-12 leading-relaxed max-w-3xl mx-auto font-light">
            Join our community of filmmakers and film enthusiasts. Watch, share, and discover unique stories that define our time.
          </p>
          <Link to="/about" className="group relative overflow-hidden inline-flex items-center gap-2 border border-amber-100/30 px-12 py-4 transition-all duration-500 text-amber-100/90 tracking-wider text-base uppercase">
            <span className="relative z-10">Join Our Community</span>
            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform duration-500" />
            <span className="absolute inset-0 bg-amber-100/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></span>
          </Link>
        </div>
      </section>
      
      {/* Footer with Film Reel Design */}
      <footer className="relative py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-8 md:mb-0">
            <div className="text-3xl font-extralight tracking-[0.2em] text-white/90 mb-4">NEMA</div>
            <p className="text-white/50 text-sm">© 2025 NEMA Archives. All rights reserved.</p>
          </div>
          <div className="flex gap-10 text-white/60">
            <Link to="/about" className="hover:text-amber-100/90 transition-colors duration-300 text-sm tracking-wide">About</Link>
            <Link to="/catalog" className="hover:text-amber-100/90 transition-colors duration-300 text-sm tracking-wide">Films</Link>
            <Link to="/contact" className="hover:text-amber-100/90 transition-colors duration-300 text-sm tracking-wide">Contact</Link>
            <a href="https://www.instagram.com/nemaarchives/" className="hover:text-amber-100/90 transition-colors duration-300 text-sm tracking-wide">Instagram</a>
          </div>
        </div>
      </footer>
      
      {/* Global Cinema Effects */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-30 mix-blend-overlay bg-[url('/film-grain.png')]"></div>
      <div className="fixed inset-0 pointer-events-none z-[99] opacity-15 bg-gradient-to-br from-amber-900/20 via-transparent to-indigo-900/20"></div>
      <div className="fixed inset-0 pointer-events-none z-[98] opacity-30 mix-blend-multiply box-shadow: inset 0 0 200px rgba(0,0,0,0.7)"></div>
    </div>
  )
}

export default HomePage
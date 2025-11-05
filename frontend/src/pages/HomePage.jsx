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

const HomePage = () => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [visibleSections, setVisibleSections] = useState({});
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [featuredMovies, setFeaturedMovies] = useState([])
  const [allMovies, setAllMovies] = useState([])
  const [loading, setLoading] = useState(true)
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
    const fetchData = async () => {
      try {
        const [featuredRes, allRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/movies?limit=3`),
          fetch(`${API_BASE_URL}/api/movies`)
        ])

        if (!featuredRes.ok) throw new Error('Failed to fetch featured movies')
        if (!allRes.ok) throw new Error('Failed to fetch movies')

        const [featuredData, allData] = await Promise.all([
          featuredRes.json(),
          allRes.json()
        ])

        setFeaturedMovies(Array.isArray(featuredData) ? featuredData : [])
        setAllMovies(Array.isArray(allData) ? allData : [])
      } catch (err) {
        console.error('Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black z-10"></div>
        
        {/* Film Grain Effect */}
        <div className="absolute inset-0 bg-[url('/film-grain.png')] opacity-[0.03] mix-blend-overlay z-10 pointer-events-none"></div>
        
        {/* Parallax Background */}
        <div 
          className="absolute z-0 inset-0 bg-[url('/hero-image.png')] bg-cover bg-center opacity-60 parallax"
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

      {/* Highlights (grid) */}
      <section 
        ref={featuredFilmsRef}
        id="featured" 
        className={`relative py-24 px-6 transition-opacity duration-1000 ${
          visibleSections['featured'] ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="relative z-20 max-w-7xl mx-auto w-full">
          <div className="flex flex-col items-center mb-10">
            <div className="mb-2">
              <span className="text-amber-100/80 tracking-[0.3em] uppercase text-sm font-extralight">Curator's Selection</span>
            </div>
            <h2 className="text-4xl font-extralight tracking-wide">Featured</h2>
            <div className="w-16 h-[1px] bg-amber-100/30 mt-4"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(loading ? [] : featuredMovies).map((movie) => (
              <Link 
                key={movie._id} 
                to={`/video/${movie._id}`}
                className="group relative aspect-[16/9] overflow-visible bg-black/40 transform transition-all duration-500 hover:scale-[1.02]"
                style={{ backgroundImage: `url(${movie.thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              >
                {/* Animated corner borders */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Top-left corner */}
                  <div className="absolute top-0 left-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 to-transparent group-hover:w-full transition-all duration-500"></div>
                    <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-amber-400 to-transparent group-hover:h-full transition-all duration-500"></div>
                  </div>
                  {/* Top-right corner */}
                  <div className="absolute top-0 right-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ transitionDelay: '50ms' }}>
                    <div className="absolute top-0 right-0 w-full h-0.5 bg-gradient-to-l from-amber-400 to-transparent group-hover:w-full transition-all duration-500"></div>
                    <div className="absolute top-0 right-0 w-0.5 h-full bg-gradient-to-b from-amber-400 to-transparent group-hover:h-full transition-all duration-500"></div>
                  </div>
                  {/* Bottom-left corner */}
                  <div className="absolute bottom-0 left-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ transitionDelay: '100ms' }}>
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 to-transparent group-hover:w-full transition-all duration-500"></div>
                    <div className="absolute bottom-0 left-0 w-0.5 h-full bg-gradient-to-t from-amber-400 to-transparent group-hover:h-full transition-all duration-500"></div>
                  </div>
                  {/* Bottom-right corner */}
                  <div className="absolute bottom-0 right-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ transitionDelay: '150ms' }}>
                    <div className="absolute bottom-0 right-0 w-full h-0.5 bg-gradient-to-l from-amber-400 to-transparent group-hover:w-full transition-all duration-500"></div>
                    <div className="absolute bottom-0 right-0 w-0.5 h-full bg-gradient-to-t from-amber-400 to-transparent group-hover:h-full transition-all duration-500"></div>
                  </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Static play button with cool design */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {/* Hexagonal outer frame */}
                    <div className="absolute inset-0 w-20 h-20 -ml-2 -mt-2 flex items-center justify-center">
                      <svg className="w-20 h-20 text-amber-400/40" viewBox="0 0 100 100">
                        <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    
                    {/* Main circular button */}
                    <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-black/80 backdrop-blur-sm border-2 border-white/90 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                      {/* Inner gradient accent */}
                      <div className="absolute inset-1 rounded-full bg-gradient-to-br from-amber-500/10 to-transparent"></div>
                      
                      {/* Play icon */}
                      <svg className="w-7 h-7 text-white ml-0.5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="absolute bottom-0 p-4">
                  <h3 className="text-xl font-light text-white/95 line-clamp-1">{movie.title}</h3>
                  <p className="text-white/70 text-sm">{movie.director} • {new Date(movie.releaseDate).getFullYear()}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Vertical Sections */}
      <section className="px-6 py-4">
        {allMovies && allMovies.length > 0 && (
          <>
            {(() => {
              // Calculate date one week ago
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              
              const newReleases = [...allMovies]
                .filter(m => {
                  if (!m.createdAt) return false;
                  const uploadDate = new Date(m.createdAt);
                  return uploadDate >= oneWeekAgo; // Only show films uploaded in last 7 days
                })
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 9)
              
              const topRated = [...allMovies]
                .filter(m => typeof m.rating === 'number')
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 9)

              const Section = ({ title, items }) => (
                <div className="max-w-7xl mx-auto mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-light tracking-wide">{title}</h3>
                    <Link to="/catalog" className="text-amber-100/70 text-sm hover:text-amber-100 transition">See all</Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((movie) => (
                      <Link 
                        key={movie._id} 
                        to={`/video/${movie._id}`} 
                        className="group relative aspect-[16/9] overflow-visible bg-black/40 transform transition-all duration-500 hover:scale-[1.02]"
                      >
                        {/* Animated corner borders */}
                        <div className="absolute inset-0 pointer-events-none">
                          {/* Top-left corner */}
                          <div className="absolute top-0 left-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 to-transparent group-hover:w-full transition-all duration-500"></div>
                            <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-amber-400 to-transparent group-hover:h-full transition-all duration-500"></div>
                          </div>
                          {/* Top-right corner */}
                          <div className="absolute top-0 right-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ transitionDelay: '50ms' }}>
                            <div className="absolute top-0 right-0 w-full h-0.5 bg-gradient-to-l from-amber-400 to-transparent group-hover:w-full transition-all duration-500"></div>
                            <div className="absolute top-0 right-0 w-0.5 h-full bg-gradient-to-b from-amber-400 to-transparent group-hover:h-full transition-all duration-500"></div>
                          </div>
                          {/* Bottom-left corner */}
                          <div className="absolute bottom-0 left-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ transitionDelay: '100ms' }}>
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 to-transparent group-hover:w-full transition-all duration-500"></div>
                            <div className="absolute bottom-0 left-0 w-0.5 h-full bg-gradient-to-t from-amber-400 to-transparent group-hover:h-full transition-all duration-500"></div>
                          </div>
                          {/* Bottom-right corner */}
                          <div className="absolute bottom-0 right-0 w-8 h-8 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ transitionDelay: '150ms' }}>
                            <div className="absolute bottom-0 right-0 w-full h-0.5 bg-gradient-to-l from-amber-400 to-transparent group-hover:w-full transition-all duration-500"></div>
                            <div className="absolute bottom-0 right-0 w-0.5 h-full bg-gradient-to-t from-amber-400 to-transparent group-hover:h-full transition-all duration-500"></div>
                          </div>
                        </div>

                        <img src={movie.thumbnailUrl} alt={movie.title} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        
                        {/* Hover gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Static play button with cool design */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            {/* Hexagonal outer frame */}
                            <div className="absolute inset-0 w-20 h-20 -ml-2 -mt-2 flex items-center justify-center">
                              <svg className="w-20 h-20 text-amber-400/40" viewBox="0 0 100 100">
                                <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                              </svg>
                            </div>
                            
                            {/* Main circular button */}
                            <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-black/80 backdrop-blur-sm border-2 border-white/90 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                              {/* Inner gradient accent */}
                              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-amber-500/10 to-transparent"></div>
                              
                              {/* Play icon */}
                              <svg className="w-7 h-7 text-white ml-0.5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        
                        <div className="absolute bottom-0 p-4">
                          <h4 className="text-lg font-light text-white/95 line-clamp-1">{movie.title}</h4>
                          <p className="text-white/70 text-sm">{movie.director} • {new Date(movie.releaseDate).getFullYear()}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )

              return (
                <>
                  {newReleases.length > 0 && (
                    <Section title="New Releases" items={newReleases} />
                  )}
                  <Section title="Top Rated" items={topRated} />
                </>
              )
            })()}
          </>
        )}
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

      {/* CTA Section */}
      <section 
        id="cta" 
        className={`relative py-36 px-6 flex items-center overflow-hidden transition-opacity duration-1000 ${
          visibleSections['cta'] ? 'opacity-100' : 'opacity-0'
        }`}
      >
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
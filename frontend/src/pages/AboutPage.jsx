import React, { useEffect, useState } from 'react'
import NavBar from '../components/NavBar'

const AboutPage = () => {
  const [visibleSections, setVisibleSections] = useState({});

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

  return (
    <div className="min-h-screen bg-black text-white">
      <NavBar />
      
      <div className="relative min-h-screen pt-20">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 -left-40 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        </div>

        {/* Main Content */}
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <section id="about-hero" className={`text-center mb-24 transition-opacity duration-1000 ${
            visibleSections['about-hero'] ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="mb-4">
              <span className="text-amber-100/80 tracking-[0.3em] uppercase text-sm font-light">Our Story</span>
            </div>
            <h1 className="text-6xl font-light mb-4 tracking-[0.2em] uppercase">About NEMA</h1>
            <div className="w-24 h-[1px] bg-amber-100/30 mx-auto mb-8"></div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-light tracking-wide">
              A celebration of artistic vision, storytelling, and the power of independent filmmaking.
            </p>
          </section>

          {/* Mission Cards */}
          <section id="mission" className={`grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 transition-opacity duration-1000 ${
            visibleSections['mission'] ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="bg-white/5 border border-amber-100/20 rounded-none p-8">
              <h3 className="text-xl font-light tracking-wide mb-4">Our Vision</h3>
              <p className="text-amber-100/60 leading-relaxed">
                To create a space where independent filmmakers can showcase their work 
                and connect with audiences who appreciate artistic storytelling.
              </p>
            </div>
            <div className="bg-white/5 border border-amber-100/20 rounded-none p-8">
              <h3 className="text-xl font-light tracking-wide mb-4">Our Mission</h3>
              <p className="text-amber-100/60 leading-relaxed">
                Supporting emerging talent, fostering creativity, and making independent 
                cinema accessible to viewers worldwide.
              </p>
            </div>
            <div className="bg-white/5 border border-amber-100/20 rounded-none p-8">
              <h3 className="text-xl font-light tracking-wide mb-4">Our Values</h3>
              <p className="text-amber-100/60 leading-relaxed">
                Artistic integrity, creative freedom, cultural diversity, and the 
                belief that every story deserves to be told.
              </p>
            </div>
          </section>

          {/* Story Section */}
          <section id="story" className={`grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-24 transition-opacity duration-1000 ${
            visibleSections['story'] ? 'opacity-100' : 'opacity-0'
          }`}>
            <div>
              <h2 className="text-3xl font-light tracking-wide mb-6">Our Journey</h2>
              <div className="space-y-6 text-amber-100/60 leading-relaxed">
                <p>
                  Founded by a collective of filmmakers and cinema enthusiasts, NEMA 
                  emerged from a shared passion for authentic storytelling and artistic expression.
                </p>
                <p>
                  We believe in the power of independent cinema to challenge perspectives, 
                  spark conversations, and connect people across cultures.
                </p>
              </div>
            </div>
            <div className="relative aspect-square">
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('Logo.png')" }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-purple-500/10"></div>
              <div className="absolute inset-4 border border-amber-100/20"></div>
            </div>
          </section>

          {/* Stats Section */}
          <section id="stats" className={`grid grid-cols-2 md:grid-cols-4 gap-8 mb-24 transition-opacity duration-1000 ${
            visibleSections['stats'] ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="text-center">
              <div className="text-4xl font-light mb-2 text-amber-100/80">500+</div>
              <div className="text-amber-100/60 tracking-wide">Films Hosted</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light mb-2 text-amber-100/80">200+</div>
              <div className="text-amber-100/60 tracking-wide">Filmmakers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light mb-2 text-amber-100/80">50+</div>
              <div className="text-amber-100/60 tracking-wide">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light mb-2 text-amber-100/80">100K+</div>
              <div className="text-amber-100/60 tracking-wide">Monthly Views</div>
            </div>
          </section>

          {/* Join Section */}
          <section id="join" className={`text-center transition-opacity duration-1000 ${
            visibleSections['join'] ? 'opacity-100' : 'opacity-0'
          }`}>
            <h2 className="text-3xl font-light tracking-wide mb-6">Join Our Community</h2>
            <p className="text-amber-100/60 max-w-2xl mx-auto mb-8 leading-relaxed">
              Whether you're a filmmaker looking to share your work or a viewer seeking unique 
              cinematic experiences, NEMA welcomes you to be part of our story.
            </p>
            <button className="border-2 border-amber-100/30 px-10 py-4 rounded-none hover:bg-amber-100/10 transition-all duration-300 text-amber-100/90 tracking-wider text-lg uppercase">
              Get Started →
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}

export default AboutPage
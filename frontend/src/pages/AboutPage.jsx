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
    <div className="min-h-screen bg-[#0A192F] text-white">
      <NavBar />
      
      {/* Hero Section */}
      <section id="about-hero" className={`relative min-h-[80vh] flex items-center transition-opacity duration-1000 ${
        visibleSections['about-hero'] ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A192F]/50 to-[#0A192F]"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            <h1 className="text-7xl font-light mb-8 tracking-tight">
              Independent Cinema,<br />
              <span className="text-[#FFD700]/90">Reimagined</span>
            </h1>
            <p className="text-xl text-[#8892B0] leading-relaxed max-w-2xl">
              A platform dedicated to showcasing the art of independent filmmaking, 
              connecting visionary storytellers with audiences who appreciate authentic cinema.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section id="mission" className={`py-32 transition-opacity duration-1000 ${
        visibleSections['mission'] ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-4xl font-light mb-8 text-[#E6F1FF]">Our Mission</h2>
              <div className="space-y-6 text-[#8892B0] leading-relaxed">
                <p>
                  We believe in the power of independent cinema to challenge perspectives, 
                  spark conversations, and connect people across cultures.
                </p>
                <p>
                  Our platform serves as a bridge between emerging filmmakers and global audiences, 
                  creating a space where artistic vision thrives and stories find their voice.
                </p>
              </div>
            </div>
            <div className="relative aspect-[4/3]">
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('Logo.png')" }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-[#FFD700]/10 to-[#0A192F]/10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section id="values" className={`py-32 bg-[#112240] transition-opacity duration-1000 ${
        visibleSections['values'] ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light mb-4 text-[#E6F1FF]">Our Values</h2>
            <p className="text-[#8892B0] max-w-2xl mx-auto">
              Guided by our commitment to artistic integrity and creative freedom
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="p-8 hover:bg-[#1D2D50] transition-colors duration-300">
              <h3 className="text-2xl font-light mb-4 text-[#FFD700]">Artistic Integrity</h3>
              <p className="text-[#8892B0] leading-relaxed">
                We champion films that stay true to their creative vision, 
                supporting filmmakers who push boundaries and challenge conventions.
              </p>
            </div>
            <div className="p-8 hover:bg-[#1D2D50] transition-colors duration-300">
              <h3 className="text-2xl font-light mb-4 text-[#FFD700]">Creative Freedom</h3>
              <p className="text-[#8892B0] leading-relaxed">
                Our platform provides filmmakers with the freedom to express 
                their unique perspectives without commercial constraints.
              </p>
            </div>
            <div className="p-8 hover:bg-[#1D2D50] transition-colors duration-300">
              <h3 className="text-2xl font-light mb-4 text-[#FFD700]">Cultural Diversity</h3>
              <p className="text-[#8892B0] leading-relaxed">
                We celebrate stories from around the world, fostering a global 
                community of filmmakers and film enthusiasts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className={`py-32 transition-opacity duration-1000 ${
        visibleSections['stats'] ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            <div>
              <div className="text-5xl font-light mb-2 text-[#FFD700]">500+</div>
              <div className="text-[#8892B0]">Films Hosted</div>
            </div>
            <div>
              <div className="text-5xl font-light mb-2 text-[#FFD700]">200+</div>
              <div className="text-[#8892B0]">Filmmakers</div>
            </div>
            <div>
              <div className="text-5xl font-light mb-2 text-[#FFD700]">50+</div>
              <div className="text-[#8892B0]">Countries</div>
            </div>
            <div>
              <div className="text-5xl font-light mb-2 text-[#FFD700]">100K+</div>
              <div className="text-[#8892B0]">Monthly Views</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className={`py-32 transition-opacity duration-1000 ${
        visibleSections['cta'] ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-light mb-8 text-[#E6F1FF]">Join Our Community</h2>
          <p className="text-xl text-[#8892B0] mb-12 max-w-2xl mx-auto">
            Whether you're a filmmaker looking to share your work or a viewer seeking unique 
            cinematic experiences, NEMA welcomes you to be part of our story.
          </p>
          <button className="border-2 border-[#FFD700]/30 px-12 py-4 rounded-none hover:bg-[#FFD700]/10 transition-all duration-300 text-[#FFD700] tracking-wider text-lg uppercase">
            Get Started →
          </button>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
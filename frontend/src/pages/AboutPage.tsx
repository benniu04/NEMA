import React, { useEffect, useState } from 'react';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

const AboutPage: React.FC = () => {
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({});

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
      
      <div className="relative min-h-screen pt-16">
        {/* Cinematic Hero */}
        <section id="about-hero" className={`relative h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
          visibleSections['about-hero'] ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="absolute inset-0 bg-[url('/hero-2.jpeg')] bg-cover bg-center opacity-40"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black"></div>
          <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
            <div className="mb-4">
              <span className="text-amber-100/80 tracking-[0.4em] uppercase text-xs md:text-sm font-extralight">Independent Cinema</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-light tracking-[0.2em] uppercase mb-4">About NEMA</h1>
            <div className="w-24 h-px bg-amber-100/30 mx-auto mb-6"></div>
            <p className="text-white/90 text-lg md:text-xl font-light tracking-wide">
              Curating voices beyond the mainstream — a home for bold, independent films.
            </p>
          </div>
        </section>

        {/* Mission / Vision / Values - Glass Panels */}
        <section id="mission" className={`relative max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity duration-1000 ${
          visibleSections['mission'] ? 'opacity-100' : 'opacity-0'
        }`}>
          {[
            { title: 'Vision', desc: 'A global stage for uncompromising cinema and new narratives.' },
            { title: 'Mission', desc: 'Champion emerging filmmakers and give audiences access to boundary-pushing stories.' },
            { title: 'Values', desc: 'Artistic integrity, inclusivity, cultural preservation, and experimentation.' }
          ].map((card, idx) => (
            <div key={idx} className="panel border border-amber-100/20 p-8 bg-white/5">
              <h3 className="text-2xl font-light tracking-wide mb-3">{card.title}</h3>
              <p className="text-amber-100/70 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </section>

        {/* Timeline */}
        <section id="timeline" className={`relative max-w-5xl mx-auto px-6 py-12 transition-opacity duration-1000 ${
          visibleSections['timeline'] ? 'opacity-100' : 'opacity-0'
        }`}>
          <h2 className="text-3xl font-light tracking-wide text-center mb-10">Milestones</h2>
          <div className="relative pl-6">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-amber-100/20"></div>
            {[
              { year: '2025 May', text: 'NEMA founded by filmmakers and curators.' },
              { year: '2025 June', text: 'First film submitted to NEMA.' },
              { year: '2025 Sep', text: 'Onboarding more films.' }
            ].map((item, i) => (
              <div key={i} className="mb-8 flex items-start gap-4">
                <div className="mt-1 w-2 h-2 rounded-full bg-amber-400"></div>
                <div>
                  <div className="text-amber-100/80 text-sm tracking-widest uppercase">{item.year}</div>
                  <div className="text-white/90 text-lg">{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section id="team" className={`relative max-w-7xl mx-auto px-6 py-12 transition-opacity duration-1000 ${
          visibleSections['team'] ? 'opacity-100' : 'opacity-0'
        }`}>
          <h2 className="text-3xl font-light tracking-wide text-center mb-10">Curators</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Benjamin Niu', role: 'Full Stack Developer', img: '/BenNiuLinkedIn.jpeg' },
              { name: 'Michael Kim', role: 'Founder', img: '/Michael.jpg' },
              { name: 'Rohan Biju', role: 'Co-Founder', img: '/Rohan.jpg' },
              { name: 'Alex Lynn', role: 'Finance Coordinator', img: '/Alex.jpg' }
            ].map((p, idx) => (
              <div key={idx} className="bg-white/5 border border-amber-100/10 p-4 text-center">
                <div className="aspect-square bg-cover bg-center mb-3" style={{ backgroundImage: `url(${p.img})` }}></div>
                <div className="text-white/90">{p.name}</div>
                <div className="text-amber-100/60 text-sm">{p.role}</div>
              </div>
            ))}
          </div>
        </section>
        <Footer />
      </div>
    </div>
  );
};

export default AboutPage;


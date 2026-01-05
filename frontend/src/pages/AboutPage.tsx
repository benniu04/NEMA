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
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <NavBar />

      <div className="relative min-h-screen pt-24">
        {/* Hero Section */}
        <section
          id="about-hero"
          className={`relative h-[50vh] md:h-[60vh] flex items-center justify-center overflow-hidden transition-all duration-1000 ${
            visibleSections['about-hero'] ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-[url('/hero-2.jpeg')] bg-cover bg-center opacity-50" />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black" />

          {/* Hero Content */}
          <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
            <div
              className={`mb-4 transition-all duration-1000 ${
                visibleSections['about-hero'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '0.2s' }}
            >
              <span className="text-amber-200/90 tracking-[0.4em] uppercase text-xs md:text-sm font-light">
                Independent Cinema
              </span>
            </div>

            <h1
              className={`text-5xl md:text-7xl font-extralight tracking-[0.25em] uppercase mb-4 transition-all duration-1000 ${
                visibleSections['about-hero'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '0.4s' }}
            >
              About
            </h1>

            {/* Divider */}
            <div className="relative h-px w-32 mx-auto mb-6 overflow-hidden">
              <div
                className={`absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/60 to-transparent transition-all duration-1000 ${
                  visibleSections['about-hero'] ? 'scale-x-100' : 'scale-x-0'
                }`}
                style={{ transitionDelay: '0.6s' }}
              />
            </div>

            <p
              className={`text-white/80 text-base md:text-lg font-light tracking-wider max-w-xl mx-auto transition-all duration-1000 ${
                visibleSections['about-hero'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '0.8s' }}
            >
              Curating voices beyond the mainstream — a home for bold, independent films
            </p>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <div className="w-px h-12 bg-gradient-to-b from-amber-200/50 to-transparent" />
          </div>
        </section>

        {/* Mission / Vision / Values */}
        <section
          id="mission"
          className={`relative max-w-3xl mx-auto px-6 py-20 text-center transition-all duration-1000 ${
            visibleSections['mission'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="mb-16">
            <h2 className="text-2xl font-extralight tracking-[0.2em] uppercase text-white/90 mb-2">Who We Are</h2>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent mx-auto" />
          </div>

          <div className="space-y-16">
            <div
              className={`transition-all duration-700 ${
                visibleSections['mission'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '0.1s' }}
            >
              <h3 className="text-amber-200/80 tracking-[0.2em] uppercase text-sm mb-4">Vision</h3>
              <p className="text-white/80 text-xl md:text-2xl font-light leading-relaxed">
                A global stage for uncompromising cinema and new narratives.
              </p>
            </div>

            <div className="w-16 h-px bg-amber-200/30 mx-auto" />

            <div
              className={`transition-all duration-700 ${
                visibleSections['mission'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '0.2s' }}
            >
              <h3 className="text-amber-200/80 tracking-[0.2em] uppercase text-sm mb-4">Mission</h3>
              <p className="text-white/80 text-xl md:text-2xl font-light leading-relaxed">
                Champion emerging filmmakers and give audiences access to boundary-pushing stories.
              </p>
            </div>

            <div className="w-16 h-px bg-amber-200/30 mx-auto" />

            <div
              className={`transition-all duration-700 ${
                visibleSections['mission'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '0.3s' }}
            >
              <h3 className="text-amber-200/80 tracking-[0.2em] uppercase text-sm mb-4">Values</h3>
              <p className="text-white/80 text-xl md:text-2xl font-light leading-relaxed">
                Artistic integrity, inclusivity, cultural preservation, and experimentation.
              </p>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section
          id="timeline"
          className={`relative max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8 transition-all duration-1000 ${
            visibleSections['timeline'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center mb-12">
            <h2 className="text-2xl font-extralight tracking-[0.2em] uppercase text-white/90 mb-2">Milestones</h2>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent mx-auto" />
          </div>

          <div className="relative pl-8">
            {/* Timeline Line */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-amber-200/40 via-amber-200/20 to-transparent" />

            {[
              { year: '2025 May', text: 'NEMA founded by filmmakers and curators.' },
              { year: '2025 June', text: 'First film submitted to NEMA.' },
              { year: '2025 Sep', text: 'Onboarding more films.' }
            ].map((item, i) => (
              <div
                key={i}
                className={`mb-10 flex items-start gap-6 transition-all duration-700 ${
                  visibleSections['timeline'] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                }`}
                style={{ transitionDelay: `${0.1 + i * 0.15}s` }}
              >
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-amber-200/80" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-amber-200/30 scale-150" />
                </div>
                <div>
                  <div className="text-amber-200/70 text-sm tracking-[0.15em] uppercase mb-1">{item.year}</div>
                  <div className="text-white/80 text-lg font-light">{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section
          id="team"
          className={`relative max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8 transition-all duration-1000 ${
            visibleSections['team'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center mb-12">
            <h2 className="text-2xl font-extralight tracking-[0.2em] uppercase text-white/90 mb-2">Curators</h2>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent mx-auto" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Benjamin Niu', role: 'Full Stack Developer', img: '/BenNiuLinkedIn.jpeg' },
              { name: 'Michael Kim', role: 'Founder', img: '/Michael.jpg' },
              { name: 'Rohan Biju', role: 'Co-Founder', img: '/Rohan.jpg' },
              { name: 'Alex Lynn', role: 'Finance Coordinator', img: '/Alex.jpg' }
            ].map((p, idx) => (
              <div
                key={idx}
                className={`relative bg-black/60 backdrop-blur-xl border border-amber-100/10 p-5 text-center transition-all duration-700 ${
                  visibleSections['team'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${0.1 + idx * 0.1}s` }}
              >
                <div
                  className="aspect-square bg-cover bg-center mb-4 border border-amber-100/10"
                  style={{ backgroundImage: `url(${p.img})` }}
                />
                <div className="text-white/90 font-light tracking-wide">{p.name}</div>
                <div className="text-amber-100/60 text-sm tracking-wide mt-1">{p.role}</div>
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

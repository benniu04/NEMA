import React, { useState, useEffect } from 'react';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

interface FormData {
  name: string;
  email: string;
  message: string;
}

interface SubmitStatus {
  type: string;
  message: string;
}

const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    message: ''
  });
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>({ type: '', message: '' });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: '', message: '' });

    try {
      console.log('Sending form data:', formData); // Debug log

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_key: '71ef79fd-30fc-43fd-a768-f5d55d5be598',
          name: formData.name,
          email: formData.email,
          message: formData.message,
          subject: `New message from ${formData.name} - NEMA Contact Form`
        })
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus({
          type: 'success',
          message: 'Message sent successfully!'
        });
        setFormData({ name: '', email: '', message: '' });
      } else {
        // Show the actual error from Web3Forms
        setSubmitStatus({
          type: 'error',
          message: result.message || 'Failed to send message'
        });
      }
    } catch (error: any) {
      console.error('Fetch error:', error); // Debug log
      setSubmitStatus({
        type: 'error',
        message: `Error: ${error.message}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const isValid = (
    formData.name.trim().length > 1 &&
    emailRegex.test(formData.email) &&
    formData.message.trim().length >= 10
  );

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <NavBar />

      <div className="relative min-h-screen pt-24">
        {/* Cinematic Hero with Particles */}
        <section
          id="contact-header"
          className={`relative h-[50vh] md:h-[60vh] flex items-center justify-center overflow-hidden transition-all duration-1000 ${
            visibleSections['contact-header'] ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Background */}
          <div
            className="absolute inset-0 bg-[url('/hero-1.jpeg')] bg-cover bg-center opacity-50"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black" />

          {/* Hero Content */}
          <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
            <div
              className={`mb-4 transition-all duration-1000 ${
                visibleSections['contact-header'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '0.2s' }}
            >
              <span className="text-amber-200/90 tracking-[0.4em] uppercase text-xs md:text-sm font-light">
                Get in Touch
              </span>
            </div>

            <h1
              className={`text-5xl md:text-7xl font-extralight tracking-[0.25em] uppercase mb-4 transition-all duration-1000 ${
                visibleSections['contact-header'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '0.4s' }}
            >
              Contact
            </h1>

            {/* Animated Divider */}
            <div className="relative h-px w-32 mx-auto mb-6 overflow-hidden">
              <div
                className={`absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/60 to-transparent transition-all duration-1000 ${
                  visibleSections['contact-header'] ? 'scale-x-100' : 'scale-x-0'
                }`}
                style={{ transitionDelay: '0.6s' }}
              />
            </div>

            <p
              className={`text-white/80 text-base md:text-lg font-light tracking-wider max-w-xl mx-auto transition-all duration-1000 ${
                visibleSections['contact-header'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '0.8s' }}
            >
              Submit your film, collaborate with us, or simply say hello
            </p>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <div className="w-px h-12 bg-gradient-to-b from-amber-200/50 to-transparent" />
          </div>
        </section>

        {/* Content Section */}
        <section
          id="contact-content"
          className={`relative max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8 transition-all duration-1000 ${
            visibleSections['contact-content'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-1/4 w-px h-32 bg-gradient-to-b from-amber-200/20 to-transparent" />
          <div className="absolute top-0 right-1/4 w-px h-48 bg-gradient-to-b from-amber-200/10 to-transparent" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            {/* Form Panel */}
            <form
              onSubmit={handleSubmit}
              className="lg:col-span-2 space-y-8 relative"
            >
              <div className="relative bg-black/80 backdrop-blur-xl border border-amber-100/10 p-8">
                {/* Form Header */}
                <div className="mb-8">
                  <h2 className="text-2xl font-extralight tracking-[0.15em] uppercase text-white/90 mb-2">
                    Send a Message
                  </h2>
                  <div className="w-16 h-px bg-gradient-to-r from-amber-200/50 to-transparent" />
                </div>

                {submitStatus.message && (
                  <div
                    className={`p-4 mb-6 border backdrop-blur-sm transition-all duration-300 ${
                      submitStatus.type === 'success'
                        ? 'border-green-500/30 bg-green-500/10 text-green-100'
                        : 'border-red-500/30 bg-red-500/10 text-red-100'
                    }`}
                  >
                    {submitStatus.message}
                  </div>
                )}

                {/* Form Fields with Staggered Animation */}
                <div className="space-y-6">
                  <div
                    className={`transition-all duration-700 ${
                      visibleSections['contact-content'] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                    }`}
                    style={{ transitionDelay: '0.1s' }}
                  >
                    <label htmlFor="name" className="block text-sm text-amber-200/70 mb-3 tracking-[0.1em] uppercase">
                      Name
                    </label>
                    <div className="relative group/input">
                      <input
                        type="text"
                        id="name"
                        name="name"
                        aria-label="Your name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full bg-white/5 border border-amber-100/20 px-5 py-4 focus:outline-none focus:border-amber-200/50 focus:bg-white/10 transition-all duration-300 text-white placeholder-white/30"
                        placeholder="Your name"
                      />
                      <div className="absolute bottom-0 left-0 h-px w-0 bg-amber-200/50 group-focus-within/input:w-full transition-all duration-500" />
                    </div>
                  </div>

                  <div
                    className={`transition-all duration-700 ${
                      visibleSections['contact-content'] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                    }`}
                    style={{ transitionDelay: '0.2s' }}
                  >
                    <label htmlFor="email" className="block text-sm text-amber-200/70 mb-3 tracking-[0.1em] uppercase">
                      Email
                    </label>
                    <div className="relative group/input">
                      <input
                        type="email"
                        id="email"
                        name="email"
                        aria-label="Your email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-white/5 border border-amber-100/20 px-5 py-4 focus:outline-none focus:border-amber-200/50 focus:bg-white/10 transition-all duration-300 text-white placeholder-white/30"
                        placeholder="you@example.com"
                      />
                      <div className="absolute bottom-0 left-0 h-px w-0 bg-amber-200/50 group-focus-within/input:w-full transition-all duration-500" />
                    </div>
                    {!emailRegex.test(formData.email) && formData.email && (
                      <div className="text-xs text-red-400/80 mt-2 tracking-wide">Please enter a valid email.</div>
                    )}
                  </div>

                  <div
                    className={`transition-all duration-700 ${
                      visibleSections['contact-content'] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                    }`}
                    style={{ transitionDelay: '0.3s' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <label htmlFor="message" className="block text-sm text-amber-200/70 tracking-[0.1em] uppercase">
                        Message
                      </label>
                      <span className="text-xs text-amber-100/40 tracking-wider">{`${formData.message.length}/1000`}</span>
                    </div>
                    <div className="relative group/input">
                      <textarea
                        id="message"
                        name="message"
                        aria-label="Your message"
                        value={formData.message}
                        onChange={handleChange}
                        rows={6}
                        maxLength={1000}
                        className="w-full bg-white/5 border border-amber-100/20 px-5 py-4 focus:outline-none focus:border-amber-200/50 focus:bg-white/10 transition-all duration-300 text-white placeholder-white/30 resize-none"
                        placeholder="What's on your mind?"
                      />
                      <div className="absolute bottom-0 left-0 h-px w-0 bg-amber-200/50 group-focus-within/input:w-full transition-all duration-500" />
                    </div>
                    {formData.message.trim().length > 0 && formData.message.trim().length < 10 && (
                      <div className="text-xs text-amber-100/50 mt-2 tracking-wide">Please add a bit more detail (10+ characters).</div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div
                  className={`mt-8 transition-all duration-700 ${
                    visibleSections['contact-content'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: '0.4s' }}
                >
                  <button
                    type="submit"
                    disabled={isSubmitting || !isValid}
                    className={`relative w-full border border-amber-200/30 px-10 py-5 text-amber-100/90 tracking-[0.2em] text-sm uppercase ${
                      isSubmitting || !isValid
                        ? 'opacity-40 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </div>
            </form>

            {/* Info Sidebar */}
            <div className="space-y-6">
              {/* Contact Info Card */}
              <div
                className={`relative transition-all duration-700 ${
                  visibleSections['contact-content'] ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                }`}
                style={{ transitionDelay: '0.2s' }}
              >
                <div className="relative bg-black/60 backdrop-blur-xl border border-amber-100/10 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-px bg-amber-200/40" />
                    <h3 className="text-lg font-extralight tracking-[0.15em] uppercase text-white/90">Contact</h3>
                  </div>
                  <div className="space-y-4 text-amber-100/70">
                    <a
                      href="mailto:nemaarchives@gmail.com"
                      className="flex items-center gap-3"
                    >
                      <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm tracking-wide">nemaarchives@gmail.com</span>
                    </a>
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm tracking-wide">Boston, MA</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Links Card */}
              <div
                className={`relative transition-all duration-700 ${
                  visibleSections['contact-content'] ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                }`}
                style={{ transitionDelay: '0.3s' }}
              >
                <div className="relative bg-black/60 backdrop-blur-xl border border-amber-100/10 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-px bg-amber-200/40" />
                    <h3 className="text-lg font-extralight tracking-[0.15em] uppercase text-white/90">Follow</h3>
                  </div>
                  <div className="flex gap-4">
                    <a
                      href="https://www.linkedin.com/company/nemaaa/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-12 h-12 border border-amber-100/20"
                    >
                      <svg className="w-5 h-5 text-amber-100/60" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                    <a
                      href="https://www.instagram.com/nemaarchives/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-12 h-12 border border-amber-100/20"
                    >
                      <svg className="w-5 h-5 text-amber-100/60" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Submit Film CTA */}
              <div
                className={`transition-all duration-700 ${
                  visibleSections['contact-content'] ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                }`}
                style={{ transitionDelay: '0.4s' }}
              >
                <button
                  type="button"
                  onClick={() => window.open('https://forms.gle/T5LT1u6NZ6Yc3T44A', '_blank', 'noopener,noreferrer')}
                  disabled={isSubmitting}
                  className={`relative w-full bg-amber-900/20 border border-amber-200/30 px-6 py-5 ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-5 h-5 text-amber-200/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                    <span className="text-amber-100/90 tracking-[0.15em] text-sm uppercase font-light">Submit Your Film</span>
                  </div>
                </button>
              </div>

              {/* Decorative Quote */}
              <div
                className={`pt-4 transition-all duration-700 ${
                  visibleSections['contact-content'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '0.5s' }}
              >
                <blockquote className="text-white/40 text-sm italic font-light tracking-wide leading-relaxed">
                  "Every frame tells a story. Let's tell yours together."
                </blockquote>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default ContactPage;


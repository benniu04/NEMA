import React, { useState, useEffect } from 'react'
import NavBar from '../components/NavBar'
import Footer from '../components/Footer'

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [visibleSections, setVisibleSections] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
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
    } catch (error) {
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
    <div className="min-h-screen bg-black text-white">
      <NavBar />
      
      <div className="relative min-h-screen pt-16">
        {/* Cinematic Hero */}
        <section id="contact-header" className={`relative h-[40vh] md:h-[50vh] flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
          visibleSections['contact-header'] ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="absolute inset-0 bg-[url('/hero-1.jpeg')] bg-cover bg-center opacity-40"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black"></div>
          <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
            <div className="mb-3">
              <span className="text-amber-100/80 tracking-[0.3em] uppercase text-xs md:text-sm font-extralight">Get in Touch</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-light tracking-[0.2em] uppercase mb-3">Contact Us</h1>
            <div className="w-20 h-px bg-amber-100/30 mx-auto mb-4"></div>
            <p className="text-white/90 text-base md:text-lg font-light tracking-wide">
              Submit, collaborate, or say hello — we’d love to hear from you.
            </p>
          </div>
        </section>

        {/* Content */}
        <section id="contact-content" className={`relative max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8 transition-opacity duration-1000 ${
          visibleSections['contact-content'] ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {/* Form Panel */}
            <form onSubmit={handleSubmit} className="md:col-span-2 space-y-6 bg-white/5 border border-amber-100/10 backdrop-blur-sm p-6">
              {submitStatus.message && (
                <div className={`p-4 border ${
                  submitStatus.type === 'success' 
                    ? 'border-green-500/30 bg-green-500/10 text-green-100' 
                    : 'border-red-500/30 bg-red-500/10 text-red-100'
                }`}>
                  {submitStatus.message}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm text-amber-100/70 mb-2 tracking-wide">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  aria-label="Your name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-amber-100/20 rounded-none px-4 py-3 focus:outline-none focus:border-amber-100/40 transition-colors"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm text-amber-100/70 mb-2 tracking-wide">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  aria-label="Your email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-amber-100/20 rounded-none px-4 py-3 focus:outline-none focus:border-amber-100/40 transition-colors"
                  placeholder="you@example.com"
                />
                {!emailRegex.test(formData.email) && formData.email && (
                  <div className="text-xs text-red-300 mt-1">Please enter a valid email.</div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="message" className="block text-sm text-amber-100/70 tracking-wide">Message</label>
                  <span className="text-xs text-amber-100/50">{`${formData.message.length}/1000`}</span>
                </div>
                <textarea
                  id="message"
                  name="message"
                  aria-label="Your message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="6"
                  maxLength={1000}
                  className="w-full bg-white/5 border border-amber-100/20 rounded-none px-4 py-3 focus:outline-none focus:border-amber-100/40 transition-colors"
                  placeholder="What's on your mind?"
                ></textarea>
                {formData.message.trim().length > 0 && formData.message.trim().length < 10 && (
                  <div className="text-xs text-amber-100/60 mt-1">Please add a bit more detail (10+ characters).</div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isValid}
                className={`w-full border-2 border-amber-100/30 px-10 py-4 rounded-none transition-all duration-300 text-amber-100/90 tracking-wider text-lg uppercase ${
                  isSubmitting || !isValid
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-amber-100/10'
                }`}
              >
                {isSubmitting ? 'Sending...' : 'Send Message →'}
              </button>
            </form>

            {/* Info Sidebar */}
            <div className="space-y-6">
              <div className="bg-white/5 border border-amber-100/20 p-6">
                <h3 className="text-xl font-light tracking-wide mb-4">Contact</h3>
                <div className="space-y-3 text-amber-100/80">
                  <a href="mailto:nemaarchives@gmail.com" className="block hover:text-amber-100 transition-colors">nemaarchives@gmail.com</a>
                  <p>Boston, MA</p>
                </div>
              </div>
              <div className="bg-white/5 border border-amber-100/20 p-6">
                <h3 className="text-xl font-light tracking-wide mb-4">Follow</h3>
                <div className="flex space-x-6 text-amber-100/80">
                  <a href="https://www.linkedin.com/company/nemaaa/" className="hover:text-amber-100 transition-colors">LinkedIn</a>
                  <a href="https://www.instagram.com/nemaarchives/" className="hover:text-amber-100 transition-colors">Instagram</a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.open('https://forms.gle/T5LT1u6NZ6Yc3T44A', '_blank', 'noopener,noreferrer')}
                disabled={isSubmitting}
                className={`w-full border-2 border-amber-100/30 px-6 py-3 rounded-none transition-all duration-300 text-amber-100/90 tracking-wider text-base uppercase ${
                  isSubmitting 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-amber-100/10'
                }`}
              >
                Submit Film
              </button>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  )
}

export default ContactPage
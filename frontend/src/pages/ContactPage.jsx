import React, { useState, useEffect } from 'react'
import NavBar from '../components/NavBar'

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

  return (
    <div className="min-h-screen bg-black text-white">
      <NavBar />
      
      <div className="relative min-h-screen pt-20">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 -right-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <section id="contact-header" className={`text-center mb-16 transition-opacity duration-1000 ${
            visibleSections['contact-header'] ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="mb-4">
              <span className="text-amber-100/80 tracking-[0.3em] uppercase text-sm font-light">Get in Touch</span>
            </div>
            <h1 className="text-6xl font-light mb-4 tracking-[0.2em] uppercase">Contact Us</h1>
            <div className="w-24 h-[1px] bg-amber-100/30 mx-auto mb-8"></div>
            <p className="text-xl text-gray-300 max-w-lg mx-auto leading-relaxed font-light tracking-wide">
              Have a film to submit? Want to collaborate? Or just want to say hello? 
              We'd love to hear from you.
            </p>
          </section>

          <section id="contact-content" className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-start transition-opacity duration-1000 ${
            visibleSections['contact-content'] ? 'opacity-100' : 'opacity-0'
          }`}>
            {/* Contact Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
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
                <label htmlFor="name" className="block text-sm text-amber-100/60 mb-2 tracking-wide">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-amber-100/20 rounded-none px-4 py-3 focus:outline-none focus:border-amber-100/40 transition-colors"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm text-amber-100/60 mb-2 tracking-wide">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-amber-100/20 rounded-none px-4 py-3 focus:outline-none focus:border-amber-100/40 transition-colors"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm text-amber-100/60 mb-2 tracking-wide">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="4"
                  className="w-full bg-white/5 border border-amber-100/20 rounded-none px-4 py-3 focus:outline-none focus:border-amber-100/40 transition-colors"
                  placeholder="What's on your mind?"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full border-2 border-amber-100/30 px-10 py-4 rounded-none transition-all duration-300 text-amber-100/90 tracking-wider text-lg uppercase ${
                  isSubmitting 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-amber-100/10'
                }`}
              >
                {isSubmitting ? 'Sending...' : 'Send Message →'}
              </button>
            </form>

            {/* Contact Info */}
            <div className="space-y-8">
              <div className="bg-white/5 border border-amber-100/20 rounded-none p-8">
                <h3 className="text-xl font-light tracking-wide mb-6">Other Ways to Connect</h3>
                <div className="space-y-4">
                  <a href="mailto:hello@nema.com" className="block text-amber-100/60 hover:text-amber-100 transition-colors">
                    nemaarchives@gmail.com
                  </a>
                  <p className="text-amber-100/60">
                    Boston, MA
                  </p>
                </div>
              </div>

              <div className="bg-white/5 border border-amber-100/20 rounded-none p-8">
                <h3 className="text-xl font-light tracking-wide mb-6">Follow Us</h3>
                <div className="flex space-x-6">
                  <a href="https://www.linkedin.com/company/nemaaa/" className="text-amber-100/60 hover:text-amber-100 transition-colors tracking-wide">LinkedIn</a>
                  <a href="https://www.instagram.com/nemaarchives/" className="text-amber-100/60 hover:text-amber-100 transition-colors tracking-wide">Instagram</a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default ContactPage
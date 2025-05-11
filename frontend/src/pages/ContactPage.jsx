import React, { useState, useEffect } from 'react'
import NavBar from '../components/NavBar'

const contactInfo = {
  email: "nemaarchives@gmail.com",
  location: "Boston, MA",
  social: [
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/company/nemaaa/",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      )
    },
    {
      name: "Instagram",
      url: "https://www.instagram.com/nemaarchives/",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      )
    }
  ],
  departments: [
    {
      name: "Film Submissions",
      email: "submissions@nema.com",
      description: "Submit your film for consideration"
    },
    {
      name: "Partnerships",
      email: "partnerships@nema.com",
      description: "Collaborate with us"
    },
    {
      name: "Press",
      email: "press@nema.com",
      description: "Media inquiries and press releases"
    }
  ]
};

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    department: '',
    message: ''
  });
  const [visibleSections, setVisibleSections] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

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
    setSubmitStatus(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log(formData);
      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        subject: '',
        department: '',
        message: ''
      });
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A192F] text-white">
      <NavBar />
      
      <div className="relative min-h-screen pt-20">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-40 h-40 bg-[#FFD700]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 -right-20 w-60 h-60 bg-[#0A192F]/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          {/* Header Section */}
          <section id="contact-header" className={`mb-20 transition-opacity duration-1000 ${
            visibleSections['contact-header'] ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="max-w-3xl">
              <div className="mb-4">
                <span className="text-[#FFD700]/80 tracking-[0.3em] uppercase text-sm font-light">Get in Touch</span>
              </div>
              <h1 className="text-6xl font-light mb-6 tracking-[0.2em] uppercase text-[#E6F1FF]">Contact Us</h1>
              <div className="w-24 h-[1px] bg-[#FFD700]/30 mb-8"></div>
              <p className="text-xl text-[#8892B0] leading-relaxed font-light tracking-wide">
                Have a film to submit? Want to collaborate? Or just want to say hello? 
                We'd love to hear from you.
              </p>
            </div>
          </section>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Form */}
            <section id="contact-form" className={`lg:col-span-2 transition-opacity duration-1000 ${
              visibleSections['contact-form'] ? 'opacity-100' : 'opacity-0'
            }`}>
              <div className="bg-[#112240] border border-[#FFD700]/20 rounded-none p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm text-[#FFD700]/60 mb-2 tracking-wide">Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full bg-[#0A192F] border border-[#FFD700]/20 rounded-none px-4 py-3 focus:outline-none focus:border-[#FFD700]/40 transition-colors text-[#E6F1FF] placeholder-[#8892B0]"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm text-[#FFD700]/60 mb-2 tracking-wide">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full bg-[#0A192F] border border-[#FFD700]/20 rounded-none px-4 py-3 focus:outline-none focus:border-[#FFD700]/40 transition-colors text-[#E6F1FF] placeholder-[#8892B0]"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="subject" className="block text-sm text-[#FFD700]/60 mb-2 tracking-wide">Subject</label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full bg-[#0A192F] border border-[#FFD700]/20 rounded-none px-4 py-3 focus:outline-none focus:border-[#FFD700]/40 transition-colors text-[#E6F1FF] placeholder-[#8892B0]"
                        placeholder="What's this about?"
                      />
                    </div>
                    <div>
                      <label htmlFor="department" className="block text-sm text-[#FFD700]/60 mb-2 tracking-wide">Department</label>
                      <select
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        required
                        className="w-full bg-[#0A192F] border border-[#FFD700]/20 rounded-none px-4 py-3 focus:outline-none focus:border-[#FFD700]/40 transition-colors text-[#E6F1FF]"
                      >
                        <option value="">Select a department</option>
                        {contactInfo.departments.map(dept => (
                          <option key={dept.name} value={dept.name}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm text-[#FFD700]/60 mb-2 tracking-wide">Message</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows="6"
                      className="w-full bg-[#0A192F] border border-[#FFD700]/20 rounded-none px-4 py-3 focus:outline-none focus:border-[#FFD700]/40 transition-colors text-[#E6F1FF] placeholder-[#8892B0]"
                      placeholder="What would you like to tell us?"
                    ></textarea>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`flex items-center gap-2 border-2 border-[#FFD700]/30 px-8 py-3 rounded-none transition-all duration-300 ${
                        isSubmitting 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-[#FFD700]/10'
                      } text-[#FFD700]/90 tracking-wider text-lg uppercase`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </>
                      )}
                    </button>

                    {submitStatus === 'success' && (
                      <span className="text-green-400 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Message sent successfully
                      </span>
                    )}
                    {submitStatus === 'error' && (
                      <span className="text-red-400 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Failed to send message
                      </span>
                    )}
                  </div>
                </form>
              </div>
            </section>

            {/* Contact Info */}
            <section id="contact-info" className={`space-y-8 transition-opacity duration-1000 ${
              visibleSections['contact-info'] ? 'opacity-100' : 'opacity-0'
            }`}>
              {/* General Contact */}
              <div className="bg-[#112240] border border-[#FFD700]/20 rounded-none p-8">
                <h3 className="text-xl font-light tracking-wide mb-6 text-[#E6F1FF]">General Inquiries</h3>
                <div className="space-y-4">
                  <a 
                    href={`mailto:${contactInfo.email}`}
                    className="block text-[#FFD700]/60 hover:text-[#FFD700] transition-colors"
                  >
                    {contactInfo.email}
                  </a>
                  <p className="text-[#8892B0]">
                    {contactInfo.location}
                  </p>
                </div>
              </div>

              {/* Departments */}
              <div className="bg-[#112240] border border-[#FFD700]/20 rounded-none p-8">
                <h3 className="text-xl font-light tracking-wide mb-6 text-[#E6F1FF]">Departments</h3>
                <div className="space-y-6">
                  {contactInfo.departments.map(dept => (
                    <div key={dept.name} className="border-b border-[#FFD700]/10 pb-4 last:border-0 last:pb-0">
                      <h4 className="text-[#FFD700]/80 mb-1">{dept.name}</h4>
                      <p className="text-[#8892B0] text-sm mb-2">{dept.description}</p>
                      <a 
                        href={`mailto:${dept.email}`}
                        className="text-[#FFD700]/60 hover:text-[#FFD700] transition-colors text-sm"
                      >
                        {dept.email}
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-[#112240] border border-[#FFD700]/20 rounded-none p-8">
                <h3 className="text-xl font-light tracking-wide mb-6 text-[#E6F1FF]">Follow Us</h3>
                <div className="flex gap-6">
                  {contactInfo.social.map(platform => (
                    <a
                      key={platform.name}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FFD700]/60 hover:text-[#FFD700] transition-colors"
                    >
                      {platform.icon}
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContactPage
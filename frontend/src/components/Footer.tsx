import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="relative py-12 border-t border-white/10 mt-16">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div>
          <div className="text-2xl md:text-3xl font-light tracking-[0.2em] text-white/90 mb-2">NEMA</div>
          <p className="text-white/50 text-sm">© {new Date().getFullYear()} NEMA Archives. All rights reserved.</p>
        </div>
        <div className="flex gap-8 text-white/70 text-sm">
          <Link to="/about" className="hover:text-white transition">About</Link>
          <Link to="/catalog" className="hover:text-white transition">Films</Link>
          <Link to="/contact" className="hover:text-white transition">Contact</Link>
          <a href="https://www.instagram.com/nemaarchives/" className="hover:text-white transition">Instagram</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


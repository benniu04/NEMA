import React from 'react';
import { Link } from 'react-router-dom';

const NavBar = () => {
  return (
    <nav className="fixed top-0 w-full bg-[#0A192F] backdrop-blur-sm shadow-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link to="/" className="text-xl font-semibold text-white">
              NEMA
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-8">
              <Link to="/" className="text-white hover:text-gray-500 px-3 py-2 text-sm font-medium">
                Home
              </Link>
              <Link to="/about" className="text-white hover:text-gray-500 px-3 py-2 text-sm font-medium">
                About
              </Link>
              <Link to="/browse" className="text-white hover:text-gray-500 px-3 py-2 text-sm font-medium">
                Browse
              </Link>
              <Link to="/contact" className="text-white hover:text-gray-500 px-3 py-2 text-sm font-medium">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;

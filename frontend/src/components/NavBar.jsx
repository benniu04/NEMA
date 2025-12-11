import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SearchBar from './SearchBar';
import { useUser } from '../context/UserContext';

const NavBar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout, loading } = useUser();

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  // Close menus when route changes
  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuOpen && !e.target.closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [userMenuOpen]);

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
  };

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Catalog', path: '/catalog' },
    { name: 'People', path: '/people' },
    { name: 'Contact', path: '/contact' }
  ];

  return (
    <nav className={`fixed top-0 w-full z-[99] transition-all duration-500 ${
      scrolled ? 'bg-black/80 backdrop-blur-md shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-20 gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link 
              to="/" 
              className="text-xl font-light tracking-widest text-white hover:text-amber-100 transition-colors duration-300"
            >
              NEMA
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 flex-1 justify-center">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`group relative px-3 py-2 text-sm font-light tracking-wide transition-colors duration-300 ${
                    isActive ? 'text-amber-100' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {item.name}
                  <span 
                    className={`absolute left-0 bottom-0 w-0 h-[1px] bg-amber-100/50 transition-all duration-300 group-hover:w-full ${
                      isActive ? 'w-full' : ''
                    }`}
                  ></span>
                </Link>
              );
            })}
          </div>

          {/* Desktop search */}
          <div className="hidden md:flex justify-end w-[320px]">
            <SearchBar />
          </div>

          {/* User Auth Section - Desktop */}
          <div className="hidden md:flex items-center ml-4">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse"></div>
            ) : isAuthenticated ? (
              <div className="relative user-menu-container">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-amber-100/20 hover:border-amber-100/40 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-xs font-bold text-black">
                    {user?.displayName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-amber-100/80 max-w-[100px] truncate">
                    {user?.displayName || user?.username}
                  </span>
                  <svg 
                    className={`w-4 h-4 text-amber-100/60 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-black/95 border border-amber-100/20 rounded-lg shadow-xl overflow-hidden">
                    <Link
                      to="/profile"
                      className="block px-4 py-3 text-sm text-amber-100/80 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        My Profile
                      </span>
                    </Link>
                    <Link
                      to="/profile"
                      state={{ tab: 'watchlist' }}
                      className="block px-4 py-3 text-sm text-amber-100/80 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        Watchlist
                      </span>
                    </Link>
                    <div className="border-t border-amber-100/10">
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-3 text-sm text-amber-100/60 hover:bg-white/5 hover:text-red-400 transition-colors text-left"
                      >
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign Out
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm text-amber-100/70 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-sm px-4 py-1.5 bg-amber-500 text-black rounded hover:bg-amber-600 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Toggle mobile menu"
            >
              {menuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className={`md:hidden absolute w-full transition-all duration-300 ease-in-out ${
        menuOpen ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
      }`}>
        <div className="px-2 pt-2 pb-3 space-y-3 sm:px-3 bg-black/90 backdrop-blur-md">
          <div className="px-1">
            <SearchBar isMobile />
          </div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`block px-3 py-2 text-base font-light tracking-wide transition-colors duration-300 ${
                  isActive ? 'text-amber-100' : 'text-white/70 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
          
          {/* Mobile User Auth */}
          <div className="border-t border-amber-100/10 pt-3 mt-2">
            {loading ? (
              <div className="px-3 py-2">
                <div className="w-full h-10 bg-white/10 rounded animate-pulse"></div>
              </div>
            ) : isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-3 py-2 text-amber-100/80 hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-sm font-bold text-black">
                    {user?.displayName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <span>{user?.displayName || user?.username}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-amber-100/60 hover:text-red-400 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-3 px-3">
                <Link
                  to="/login"
                  className="flex-1 text-center py-2 text-amber-100/70 border border-amber-100/20 rounded hover:text-white hover:border-amber-100/40 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex-1 text-center py-2 bg-amber-500 text-black rounded hover:bg-amber-600 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
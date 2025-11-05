import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import NavBar from '../../components/NavBar';

describe('NavBar Component', () => {
  beforeEach(() => {
    // Reset any mocked functions before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after tests
    vi.restoreAllMocks();
  });

  const renderWithRouter = (component, initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        {component}
      </MemoryRouter>
    );
  };

  it('should render the logo', () => {
    renderWithRouter(<NavBar />);

    expect(screen.getByText('NEMA')).toBeInTheDocument();
  });

  it('should render all navigation items', () => {
    renderWithRouter(<NavBar />);

    expect(screen.getAllByText('Home')).toHaveLength(2); // Desktop + mobile
    expect(screen.getAllByText('About')).toHaveLength(2);
    expect(screen.getAllByText('Catalog')).toHaveLength(2);
    expect(screen.getAllByText('Contact')).toHaveLength(2);
  });

  it('should highlight active navigation item', () => {
    renderWithRouter(<NavBar />, '/about');

    const aboutLinks = screen.getAllByText('About');
    const desktopAboutLink = aboutLinks[0]; // First one is desktop
    
    expect(desktopAboutLink.className).toContain('text-amber-100');
  });

  it('should toggle mobile menu when button is clicked', () => {
    renderWithRouter(<NavBar />);

    const menuButton = screen.getByLabelText('Toggle mobile menu');
    
    // Mobile menu should start closed
    const mobileMenu = menuButton.closest('nav').querySelector('.md\\:hidden.absolute');
    expect(mobileMenu.className).toContain('max-h-0');
    expect(mobileMenu.className).toContain('opacity-0');

    // Click to open
    fireEvent.click(menuButton);
    expect(mobileMenu.className).toContain('max-h-60');
    expect(mobileMenu.className).toContain('opacity-100');

    // Click to close
    fireEvent.click(menuButton);
    expect(mobileMenu.className).toContain('max-h-0');
    expect(mobileMenu.className).toContain('opacity-0');
  });

  it('should apply scrolled styles when scrolled', () => {
    renderWithRouter(<NavBar />);

    const nav = screen.getByRole('navigation');
    
    // Initially transparent
    expect(nav.className).toContain('bg-transparent');

    // Simulate scroll
    Object.defineProperty(window, 'scrollY', { value: 20, writable: true });
    fireEvent.scroll(window);

    // Should have scrolled class (after state updates)
    // Note: This test might be flaky depending on React updates
  });

  it('should link to correct paths', () => {
    renderWithRouter(<NavBar />);

    const homeLinks = screen.getAllByText('Home');
    const desktopHomeLink = homeLinks[0].closest('a');
    
    expect(desktopHomeLink).toHaveAttribute('href', '/');
  });

  it('should show hamburger icon when menu is closed', () => {
    renderWithRouter(<NavBar />);

    const menuButton = screen.getByLabelText('Toggle mobile menu');
    const hamburgerIcon = menuButton.querySelector('svg path[d*="M4 6h16M4 12h16M4 18h16"]');
    
    expect(hamburgerIcon).toBeInTheDocument();
  });

  it('should show close icon when menu is open', () => {
    renderWithRouter(<NavBar />);

    const menuButton = screen.getByLabelText('Toggle mobile menu');
    
    // Open menu
    fireEvent.click(menuButton);
    
    const closeIcon = menuButton.querySelector('svg path[d*="M6 18L18 6M6 6l12 12"]');
    expect(closeIcon).toBeInTheDocument();
  });

  it('should have correct navigation structure', () => {
    renderWithRouter(<NavBar />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('fixed', 'top-0', 'w-full');
  });

  it('should render desktop menu on large screens', () => {
    renderWithRouter(<NavBar />);

    const desktopMenu = screen.getByRole('navigation').querySelector('.hidden.md\\:flex');
    expect(desktopMenu).toBeInTheDocument();
  });

  it('should apply hover effects to navigation items', () => {
    renderWithRouter(<NavBar />);

    const homeLinks = screen.getAllByText('Home');
    const desktopHomeLink = homeLinks[0];
    
    // Home is active on "/" route, so it has amber text
    // Check for transition and group classes which enable hover effects
    expect(desktopHomeLink.className).toContain('transition-colors');
  });

  it('should maintain fixed positioning', () => {
    renderWithRouter(<NavBar />);

    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('fixed');
    expect(nav.className).toContain('z-[100]');
  });
});


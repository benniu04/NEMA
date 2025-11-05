import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MovieCard from '../../components/MovieCard';

// Mock LazyImage component
vi.mock('../../components/LazyImage', () => ({
  default: ({ src, alt, className }) => (
    <img src={src} alt={alt} className={className} data-testid="lazy-image" />
  ),
}));

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('MovieCard Component', () => {
  const mockMovie = {
    _id: '123',
    title: 'Test Movie',
    director: 'Test Director',
    releaseDate: '2024-01-01',
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    genre: ['Action', 'Sci-Fi', 'Thriller'],
  };

  it('should render movie card with all information', () => {
    renderWithRouter(<MovieCard movie={mockMovie} />);

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText(/Test Director/)).toBeInTheDocument();
    // Year might vary by timezone, just check it's present
    expect(screen.getByText(/202/)).toBeInTheDocument(); // 2023 or 2024
  });

  it('should render lazy image with correct props', () => {
    renderWithRouter(<MovieCard movie={mockMovie} />);

    const image = screen.getByTestId('lazy-image');
    expect(image).toHaveAttribute('src', mockMovie.thumbnailUrl);
    expect(image).toHaveAttribute('alt', mockMovie.title);
  });

  it('should link to video player page', () => {
    renderWithRouter(<MovieCard movie={mockMovie} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/video/${mockMovie._id}`);
  });

  it('should display genres (max 2)', () => {
    renderWithRouter(<MovieCard movie={mockMovie} />);

    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
    expect(screen.queryByText('Thriller')).not.toBeInTheDocument();
  });

  it('should display year from releaseDate', () => {
    renderWithRouter(<MovieCard movie={mockMovie} />);

    // Year might vary by timezone (2023 or 2024 depending on UTC offset)
    const text = screen.getByText(/Test Director/);
    expect(text.textContent).toMatch(/202[34]/);
  });

  it('should not render if movie is null', () => {
    const { container } = renderWithRouter(<MovieCard movie={null} />);

    expect(container.firstChild).toBeNull();
  });

  it('should not render if movie is undefined', () => {
    const { container } = renderWithRouter(<MovieCard movie={undefined} />);

    expect(container.firstChild).toBeNull();
  });

  it('should handle missing releaseDate gracefully', () => {
    const movieWithoutDate = { ...mockMovie, releaseDate: null };
    renderWithRouter(<MovieCard movie={movieWithoutDate} />);

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.queryByText(/\d{4}/)).not.toBeInTheDocument();
  });

  it('should handle empty genre array', () => {
    const movieWithoutGenres = { ...mockMovie, genre: [] };
    renderWithRouter(<MovieCard movie={movieWithoutGenres} />);

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.queryByText('Action')).not.toBeInTheDocument();
  });

  it('should handle non-array genre gracefully', () => {
    const movieWithInvalidGenre = { ...mockMovie, genre: null };
    renderWithRouter(<MovieCard movie={movieWithInvalidGenre} />);

    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('should display single genre when only one exists', () => {
    const movieWithOneGenre = { ...mockMovie, genre: ['Drama'] };
    renderWithRouter(<MovieCard movie={movieWithOneGenre} />);

    expect(screen.getByText('Drama')).toBeInTheDocument();
  });

  it('should apply hover styles classes', () => {
    renderWithRouter(<MovieCard movie={mockMovie} />);

    const link = screen.getByRole('link');
    expect(link.className).toContain('group');
    expect(link.className).toContain('cursor-pointer');
    // Hover effects are applied via Tailwind classes
    expect(link.className).toContain('overflow-hidden');
  });
});


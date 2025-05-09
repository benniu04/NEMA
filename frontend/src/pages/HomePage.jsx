import React, { useEffect, useState } from 'react'
import NavBar from '../components/NavBar'

const featuredFilms = [
  {
    id: 1,
    title: "Captain Marvel",
    director: "Sarah Chen",
    year: 2024,
    image: "wallpaper-1.jpg"
  },
  {
    id: 2,
    title: "Pacific Rim",
    director: "Jean Dupont",
    year: 2024,
    image: "wallpaper-2.jpg"
  },
  {
    id: 3,
    title: "TRON: Legacy",
    director: "Marcus Johnson",
    year: 2024,
    image: "wallpaper-3.jpg"
  }
]

const HomePage = () => {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <NavBar />
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black z-10"></div>
        <div 
          className="absolute inset-0 bg-black bg-cover bg-center opacity-50"
          style={{ transform: `translateY(${scrollPosition * 0.5}px)` }}
        ></div>
        <div className="relative z-20 text-center px-4">
          <h1 className="text-7xl font-bold mb-6 tracking-tight">
            Welcome to NEMA
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Discover independent films and short stories from emerging filmmakers worldwide.
          </p>
          <button className="bg-white text-black px-8 py-3 rounded-md hover:bg-gray-200 transition-colors">
            Start Watching
          </button>
        </div>
      </section>

      {/* Featured Section */}
      <section className="relative min-h-screen py-20 px-4 flex items-center overflow-hidden">
        <div 
          className="absolute inset-0 featured-bg bg-cover bg-center opacity-30"
          style={{ transform: `translateY(${scrollPosition * 0.3}px)` }}
        ></div>
        <div className="relative z-20 max-w-7xl mx-auto w-full">
          <h2 className="text-3xl font-semibold mb-12 text-center">Featured Films</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredFilms.map((film) => (
              <div key={film.id} className="group relative aspect-video bg-cover bg-center rounded-lg overflow-hidden" style={{ backgroundImage: `url(${film.image})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 p-6">
                    <h3 className="text-xl font-medium mb-2">{film.title}</h3>
                    <p className="text-sm text-gray-300">{film.director} • {film.year}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="relative min-h-screen py-20 px-4 flex items-center overflow-hidden">
        <div 
          className="absolute inset-0 categories-bg bg-cover bg-center opacity-30"
          style={{ transform: `translateY(${scrollPosition * 0.2}px)` }}
        ></div>
        <div className="relative z-20 max-w-7xl mx-auto w-full">
          <h2 className="text-3xl font-semibold mb-8 text-center">Explore Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            {[
              {
                name: 'Documentary',
                image: 'documentary-wallpaper.jpg'
              },
              {
                name: 'Drama',
                image: 'drama-wallpaper.jpg'
              },
              {
                name: 'Experimental',
                image: 'experimental-wallpaper.png'
              },
              {
                name: 'Animation',
                image: 'animation-wallpaper.jpg'
              }
            ].map((category) => (
              <div 
                key={category.name} 
                className="aspect-square bg-cover bg-center rounded-lg overflow-hidden group cursor-pointer relative"
                style={{ 
                  backgroundImage: `url(${category.image})`
                }}
              >
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-medium">{category.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative min-h-screen py-20 px-4 flex items-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30"
          style={{ transform: `translateY(${scrollPosition * 0.1}px)` }}
        ></div>
        <div className="relative z-20 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">Support Independent Cinema</h2>
          <p className="text-gray-400 mb-12">
            Join our community of filmmakers and film enthusiasts. Watch, share, and discover unique stories from around the world.
          </p>
          <button className="border-2 border-white px-8 py-3 rounded-md hover:bg-white hover:text-black transition-colors">
            Join Now
          </button>
        </div>
      </section>
    </div>
  )
}

export default HomePage
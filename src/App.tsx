import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import DramaDetails from './pages/DramaDetails';
import { Play, Search } from 'lucide-react';
import './index.css';
import { Analytics } from "@vercel/analytics/react";

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w200'; // Smaller for suggestions

function Navbar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      
      try {
        const res = await axios.get(`${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
        const koShows = res.data.results.filter((d: any) => d.original_language === 'ko').slice(0, 5);
        setSuggestions(koShows);
      } catch (err) {
        console.error(err);
      }
    };
    
    const delay = setTimeout(fetchSuggestions, 300); // debounce
    return () => clearTimeout(delay);
  }, [query]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (query.trim()) {
      navigate(`/?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate(`/`);
    }
  };
  
  const handleSuggestionClick = (id: number) => {
    setShowSuggestions(false);
    setQuery('');
    navigate(`/drama/${id}`);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <Play color="#ffffff" size={24} fill="#ffffff" />
        <span>SeoulFlix</span>
      </Link>
      <div className="nav-actions">
        <div className="search-container" ref={searchRef}>
          <form onSubmit={handleSearch} style={{ display: 'flex', width: '100%' }}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search dramas..." 
              className="search-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
            />
          </form>
          
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map((show) => (
                <div 
                  key={show.id} 
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(show.id)}
                >
                  {show.poster_path ? (
                    <img src={`${IMG_BASE_URL}${show.poster_path}`} alt={show.name} className="suggestion-img" />
                  ) : (
                    <div className="suggestion-img-placeholder"></div>
                  )}
                  <div className="suggestion-info">
                    <h4>{show.name}</h4>
                    <span>{show.first_air_date?.substring(0, 4) || 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/drama/:id" element={<DramaDetails />} />
          </Routes>
        </main>
        <Analytics />
      </div>
    </Router>
  );
}

export default App;

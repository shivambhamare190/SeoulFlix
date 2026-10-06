import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { Star } from 'lucide-react';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

interface Drama {
  id: number;
  name: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  first_air_date: string;
  overview: string;
  original_language: string;
  popularity: number;
  vote_count: number;
}

interface Category {
  title: string;
  id: string;
  dramas: Drama[];
}

const Home: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Drama | null>(null);
  
  // Infinite scroll state
  const [infiniteDramas, setInfiniteDramas] = useState<Drama[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q');
  
  const observer = useRef<IntersectionObserver | null>(null);
  
  const lastElementRef = useCallback((node: HTMLAnchorElement | null) => {
    if (loadingMore || initialLoading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loadingMore, initialLoading, hasMore]);

  const filterAvailable = (dramas: Drama[]) => {
    return dramas.filter(d => d.original_language === 'ko' && d.poster_path && d.popularity > 5);
  };

  // Reset state when query changes
  useEffect(() => {
    setInfiniteDramas([]);
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
  }, [query]);

  // Fetch initial data (Hero + Categories) only if NOT searching
  useEffect(() => {
    if (query) return;
    
    const fetchCategories = async () => {
      try {
        if (!API_KEY) return;
        const [trending, romance, action, comedy] = await Promise.all([
          axios.get(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&sort_by=popularity.desc&page=1`),
          axios.get(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=10749&sort_by=popularity.desc&page=1`),
          axios.get(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=10759&sort_by=popularity.desc&page=1`),
          axios.get(`${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&with_genres=35&sort_by=popularity.desc&page=1`)
        ]);

        const trendingDramas = filterAvailable(trending.data.results);
        if (trendingDramas.length > 0) setFeatured(trendingDramas[0]);

        setCategories([
          { title: 'Trending Now', id: 'trending', dramas: trendingDramas.slice(0, 12) },
          { title: 'Romantic Favorites', id: 'romance', dramas: filterAvailable(romance.data.results).slice(0, 12) },
          { title: 'Action & Thriller', id: 'action', dramas: filterAvailable(action.data.results).slice(0, 12) },
          { title: 'Comedy Central', id: 'comedy', dramas: filterAvailable(comedy.data.results).slice(0, 12) }
        ]);
      } catch (error: any) {
        console.error("Error fetching categories", error);
      }
    };

    fetchCategories();
  }, [query]);

  // Infinite Scroll Fetcher
  useEffect(() => {
    const fetchInfiniteData = async () => {
      try {
        if (!API_KEY) {
          setErrorMsg("Missing API Key");
          setInitialLoading(false);
          return;
        }
        
        setLoadingMore(true);
        
        let endpoint = '';
        if (query) {
          endpoint = `${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${page}`;
        } else {
          // If no query, infinite scroll discover starting from page 2 (since page 1 is in categories)
          // Actually, we can just start infinite scroll from page 1 for "All Discover" section
          endpoint = `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_original_language=ko&sort_by=popularity.desc&page=${page + 1}`;
        }
        
        const response = await axios.get(endpoint);
        let results = response.data.results;
        
        if (query) {
          results = results.filter((d: Drama) => d.original_language === 'ko');
        } else {
          results = filterAvailable(results);
        }

        setInfiniteDramas(prev => [...prev, ...results]);
        setHasMore(response.data.page < response.data.total_pages);
      } catch (error: any) {
        console.error("Error fetching infinite data", error);
        if (page === 1) setErrorMsg(error.message || JSON.stringify(error));
      } finally {
        setInitialLoading(false);
        setLoadingMore(false);
      }
    };

    fetchInfiniteData();
  }, [query, page]);

  if (initialLoading) return <div className="loader">Loading...</div>;

  if (errorMsg) {
    return (
      <div className="section" style={{ textAlign: 'center', marginTop: '100px', color: '#ff6b6b' }}>
        <h2>Oops!</h2>
        <p>{errorMsg}</p>
      </div>
    );
  }

  const renderGrid = (dramas: Drama[], isInfinite = false) => (
    <div className="grid">
      {dramas.map((drama, index) => {
        const posterSrc = drama.poster_path 
          ? `${IMG_BASE_URL}${drama.poster_path}` 
          : 'https://via.placeholder.com/500x750?text=No+Poster';
          
        const isLastElement = isInfinite && index === dramas.length - 1;
          
        return (
          <Link 
            to={`/drama/${drama.id}`} 
            key={`${drama.id}-${index}`} 
            className="card"
            ref={isLastElement ? lastElementRef : null}
          >
            <div className="card-image-wrap">
              <img src={posterSrc} alt={drama.name} className="card-image" loading="lazy" />
            </div>
            <h3 className="card-title">{drama.name}</h3>
            <div className="card-meta">
              {drama.first_air_date?.substring(0, 4) || 'N/A'} • <Star size={10} fill="currentColor" /> {drama.vote_average?.toFixed(1) || '0'}
            </div>
          </Link>
        )
      })}
    </div>
  );

  return (
    <div>
      {/* Hero Section (Only when not searching) */}
      {featured && !query && (
        <div 
          className="hero"
          style={{ backgroundImage: `url(${BACKDROP_BASE_URL}${featured.backdrop_path})` }}
        >
          <div className="hero-content">
            <h1 className="hero-title">{featured.name}</h1>
            <div className="hero-meta">
              <span className="rating"><Star size={14} fill="#ffffff" /> {featured.vote_average?.toFixed(1)}</span>
              <span>{featured.first_air_date?.substring(0, 4)}</span>
            </div>
            <p className="hero-desc">{featured.overview}</p>
            <Link to={`/drama/${featured.id}`} className="btn btn-primary">
              Watch Now
            </Link>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="section">
        {query ? (
          <>
            <h2 className="section-title">Search Results for "{query}"</h2>
            {infiniteDramas.length === 0 && !loadingMore ? (
              <p style={{ color: 'var(--text-secondary)' }}>No dramas found. Try another search.</p>
            ) : (
              <>
                {renderGrid(infiniteDramas, true)}
                {loadingMore && <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading more...</div>}
              </>
            )}
          </>
        ) : (
          <>
            {categories.map((category) => (
              category.dramas.length > 0 && (
                <div key={category.id} style={{ marginBottom: '4rem' }}>
                  <h2 className="section-title">{category.title}</h2>
                  {renderGrid(category.dramas)}
                </div>
              )
            ))}
            
            {/* Endless Scroll Discovery Section */}
            <div style={{ marginTop: '4rem', paddingTop: '4rem', borderTop: '1px solid var(--border-color)' }}>
              <h2 className="section-title">Discover More</h2>
              {renderGrid(infiniteDramas, true)}
              {loadingMore && <div style={{ textAlign: 'center', marginTop: '2rem' }}>Loading more...</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;

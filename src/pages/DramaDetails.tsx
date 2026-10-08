import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Star, Maximize } from 'lucide-react';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface Season {
  season_number: number;
  name: string;
  episode_count: number;
}

interface DramaDetails {
  id: number;
  name: string;
  poster_path: string;
  overview: string;
  first_air_date: string;
  vote_average: number;
  number_of_seasons: number;
  seasons: Season[];
}

interface Episode {
  episode_number: number;
  name: string;
  still_path: string;
}

const DramaDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [details, setDetails] = useState<DramaDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const [isFakeFullscreen, setIsFakeFullscreen] = useState(false);

  const handleFullscreen = () => {
    const elem = playerRef.current as any;
    if (elem) {
      try {
        if (elem.requestFullscreen) {
          const promise = elem.requestFullscreen();
          if (promise) {
            promise.catch(() => {
              setIsFakeFullscreen(!isFakeFullscreen);
            });
          }
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        } else {
          setIsFakeFullscreen(!isFakeFullscreen);
        }
      } catch (e) {
        setIsFakeFullscreen(!isFakeFullscreen);
      }
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        if (!API_KEY) return;
        const response = await axios.get(`${BASE_URL}/tv/${id}?api_key=${API_KEY}`);
        setDetails(response.data);
        
        // Try to find the first valid season (sometimes season 0 is specials)
        const validSeasons = response.data.seasons.filter((s: Season) => s.season_number > 0);
        if (validSeasons.length > 0) {
          setSeason(validSeasons[0].season_number);
        }
      } catch (error) {
        console.error("Error fetching drama details", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  useEffect(() => {
    const fetchEpisodes = async () => {
      if (!id || !API_KEY || !details) return;
      try {
        setEpisodesLoading(true);
        const response = await axios.get(`${BASE_URL}/tv/${id}/season/${season}?api_key=${API_KEY}`);
        setEpisodes(response.data.episodes || []);
      } catch (error) {
        console.error("Error fetching episodes", error);
      } finally {
        setEpisodesLoading(false);
      }
    };
    
    fetchEpisodes();
  }, [id, season, details]);

  if (loading) return <div className="loader">Loading Player...</div>;
  if (!details) return <div className="section">Error loading drama.</div>;

  const validSeasons = details.seasons.filter(s => s.season_number > 0);

  return (
    <div className="player-container">
      <div 
        className="video-wrapper" 
        ref={playerRef}
        style={isFakeFullscreen ? {
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          background: 'black',
          padding: 0,
          margin: 0
        } : {}}
      >
        <iframe 
          src={`https://player.vidzee.wtf/embed/tv/${id}/${season}/${episode}`}
          allowFullScreen
          title="VidZee Player"
          style={isFakeFullscreen ? { height: '100%', width: '100%' } : {}}
        ></iframe>
        {isFakeFullscreen && (
          <button 
            onClick={() => setIsFakeFullscreen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              zIndex: 10000,
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Exit Fullscreen
          </button>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
        <button 
          onClick={handleFullscreen}
          style={{
            background: 'var(--surface-color, rgba(255,255,255,0.1))',
            color: 'white',
            border: '1px solid var(--border-color, rgba(255,255,255,0.2))',
            borderRadius: '4px',
            padding: '8px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background 0.2s'
          }}
          title="Fullscreen"
        >
          <Maximize size={18} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Fullscreen</span>
        </button>
      </div>

      <div className="details-header" style={{ display: 'flex', gap: '2rem' }}>
        <img 
          src={`${IMG_BASE_URL}${details.poster_path}`} 
          alt={details.name} 
          className="poster-large"
          style={{ width: '220px', borderRadius: 'var(--radius-sm)', alignSelf: 'flex-start' }}
        />
        <div className="details-info">
          <h1>{details.name}</h1>
          <div className="hero-meta" style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
             <span className="rating" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Star size={16} fill="#ffffff" color="#ffffff" /> {details.vote_average?.toFixed(1)}
             </span>
             <span>{details.first_air_date?.substring(0, 4)}</span>
             <span>•</span>
             <span>{details.number_of_seasons} Seasons</span>
          </div>
          <p style={{ color: '#aaaaaa', fontSize: '0.95rem', lineHeight: '1.6' }}>
            {details.overview}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Episodes</h2>
        {validSeasons.length > 1 && (
          <select 
            value={season} 
            onChange={(e) => {
              setSeason(Number(e.target.value));
              setEpisode(1);
            }}
            style={{
              background: 'var(--surface-color)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {validSeasons.map(s => (
              <option key={s.season_number} value={s.season_number}>
                Season {s.season_number}
              </option>
            ))}
          </select>
        )}
      </div>

      {episodesLoading ? (
        <div className="loader">Loading episodes...</div>
      ) : (
        <div className="episodes-grid">
          {episodes.map((ep) => (
            <div 
              key={ep.episode_number} 
              className={`episode-card ${episode === ep.episode_number ? 'active' : ''}`}
              onClick={() => setEpisode(ep.episode_number)}
            >
              <div className="episode-number">{ep.episode_number.toString().padStart(2, '0')}</div>
              <div className="episode-info" style={{ overflow: 'hidden' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ep.name || `Episode ${ep.episode_number}`}
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click to watch</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DramaDetails;

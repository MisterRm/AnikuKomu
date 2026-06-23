import { useState, useEffect, useRef } from 'react';
import { Anime } from '../../types/database';
import { Search, X, Plus, Star, Tv } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

interface JikanAnime extends Partial<Anime> {
  mal_id: number;
  title: string;
  cover_url: string | null;
  genre: string[];
  score?: number;
  episodes?: number;
  synopsis?: string;
  status?: string;
  year?: number;
}

interface AnimeTagInputProps {
  selectedAnimes: JikanAnime[];
  onChange: (animes: JikanAnime[]) => void;
  className?: string;
}

export default function AnimeTagInput({ selectedAnimes, onChange, className }: AnimeTagInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<JikanAnime[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async (q: string) => {
      try {
        setLoading(true);
        const res = await fetch(`/api/anime/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestions(data.filter(
            (item: JikanAnime) => !selectedAnimes.some((s) => s.mal_id === item.mal_id)
          ));
        }
      } catch (err) {
        console.error('Error fetching anime:', err);
      } finally {
        setLoading(false);
      }
    };

    if (query.trim().length === 0) {
      // Fetch top airing saat kosong
      fetchSuggestions('');
      return;
    }

    const timer = setTimeout(() => fetchSuggestions(query), 400);
    return () => clearTimeout(timer);
  }, [query, selectedAnimes]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (anime: JikanAnime) => {
    onChange([...selectedAnimes, anime]);
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleRemove = (mal_id: number) => {
    onChange(selectedAnimes.filter((a) => a.mal_id !== mal_id));
  };

  return (
    <div ref={containerRef} className={`space-y-2.5 relative ${className}`}>
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">
        Tag Anime Terkait
      </label>

      {/* Selected chips */}
      {selectedAnimes.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-1">
          {selectedAnimes.map((anime) => (
            <div
              key={anime.mal_id}
              className="flex items-center gap-2 bg-purple-500/10 border border-purple-800/40 rounded-xl px-2 py-1.5 animate-fade-in"
            >
              {anime.cover_url && (
                <img
                  src={anime.cover_url}
                  alt=""
                  className="w-6 h-8 rounded object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="text-xs text-purple-200 font-semibold max-w-[120px] truncate">
                {anime.title}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(anime.mal_id)}
                className="text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={query}
          onFocus={() => setShowDropdown(true)}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
          placeholder="Cari judul anime (cth: Frieren, Solo Leveling)..."
          className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 text-xs text-zinc-200 placeholder:text-zinc-600 rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-purple-500/20"
        />

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#111113] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-[280px] overflow-y-auto z-50 divide-y divide-zinc-900">
            {!query && (
              <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                🔥 Sedang Tayang
              </div>
            )}
            {loading ? (
              <div className="p-3 space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="w-full h-12" />)}
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500 italic">
                {query.length > 0 && query.length < 2 ? 'Ketik minimal 2 huruf...' : 'Anime tidak ditemukan.'}
              </div>
            ) : (
              suggestions.map((anime) => (
                <div
                  key={anime.mal_id}
                  onClick={() => handleSelect(anime)}
                  className="flex items-center gap-3 p-2.5 hover:bg-zinc-800/80 cursor-pointer transition-colors"
                >
                  {/* Poster */}
                  <div className="w-9 h-12 rounded-md bg-zinc-800 shrink-0 overflow-hidden">
                    {anime.cover_url ? (
                      <img
                        src={anime.cover_url}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-800 to-pink-600 flex items-center justify-center text-[8px] font-bold text-white">AN</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-100 truncate leading-snug">
                      {anime.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {anime.score && (
                        <span className="flex items-center gap-0.5 text-[10px] text-yellow-400 font-bold">
                          <Star className="w-2.5 h-2.5 fill-yellow-400" />
                          {anime.score}
                        </span>
                      )}
                      {anime.episodes && (
                        <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                          <Tv className="w-2.5 h-2.5" />
                          {anime.episodes} ep
                        </span>
                      )}
                      {anime.year && (
                        <span className="text-[10px] text-zinc-600">{anime.year}</span>
                      )}
                    </div>
                    {anime.genre && anime.genre.length > 0 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {anime.genre.slice(0, 3).map((g) => (
                          <span key={g} className="text-[9px] text-purple-400 font-mono">{g}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 p-1.5 bg-purple-500/10 rounded-full hover:bg-purple-500 text-purple-400 hover:text-white transition-all">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Anime } from '../../types/database';
import { Search, Sparkles, X, Plus } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

interface AnimeTagInputProps {
  selectedAnimes: Anime[];
  onChange: (animes: Anime[]) => void;
  className?: string;
}

export default function AnimeTagInput({ selectedAnimes, onChange, className }: AnimeTagInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debouncing API requests for searches
  useEffect(() => {
    if (query.trim().length === 0) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/anime/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          // Filter out elements already selected
          const filtered = data.filter(
            (item: Anime) => !selectedAnimes.some((selected) => selected.id === item.id)
          );
          setSuggestions(filtered);
        }
      } catch (err) {
        console.error('Error fetching anime suggestions:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query, selectedAnimes]);

  // Click outside dropdown setup
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (anime: Anime) => {
    const updated = [...selectedAnimes, anime];
    onChange(updated);
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleRemove = (animeId: string) => {
    const updated = selectedAnimes.filter((selected) => selected.id !== animeId);
    onChange(updated);
  };

  return (
    <div ref={containerRef} className={`space-y-2.5 relative ${className}`}>
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">
        Tag Anime Terkait
      </label>

      {/* Selected tags chips deck */}
      {selectedAnimes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-1 select-none">
          {selectedAnimes.map((anime) => (
            <div
              key={anime.id}
              className="px-2.5 py-1 text-xs rounded-full bg-purple-500/10 hover:bg-purple-500/15 text-purple-300 font-medium border border-purple-800/30 flex items-center gap-1.5 transition-all animate-fade-in"
            >
              <span>{anime.title}</span>
              <button
                type="button"
                onClick={() => handleRemove(anime.id)}
                className="hover:text-rose-400 hover:bg-rose-500/10 rounded-full p-0.5 shrink-0 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={query}
          onFocus={() => setShowDropdown(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          placeholder="Cari judul anime (cth: Frieren, Bleach)..."
          className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 text-xs text-zinc-200 placeholder:text-zinc-600 rounded-xl pl-9 pr-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-purple-500/20"
        />

        {/* Dropdown Auto-Complete Suggestions */}
        {showDropdown && (query.trim() || suggestions.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800/80 rounded-xl shadow-2xl overflow-hidden max-h-[190px] overflow-y-auto z-50 divide-y divide-zinc-900 scrollbar-thin">
            {loading ? (
              <div className="p-3 space-y-2">
                <Skeleton className="w-full h-8" />
                <Skeleton className="w-4/5 h-8" />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500 italic">
                {query.length < 2 ? 'Ketik minimal 2 huruf...' : 'Hasil tidak ditemukan.'}
              </div>
            ) : (
              suggestions.map((anime) => (
                <div
                  key={anime.id}
                  onClick={() => handleSelect(anime)}
                  className="flex items-center gap-2.5 p-2.5 hover:bg-zinc-800 cursor-pointer transition-colors text-left"
                >
                  <div className="w-7 h-9 rounded-sm bg-zinc-800 shrink-0 overflow-hidden">
                    {anime.cover_url ? (
                      <img
                        src={anime.cover_url}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full gradient-to-tr from-purple-800 to-pink-500 text-[8px] flex items-center justify-center font-bold">AN</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-200 truncate leading-snug">
                      {anime.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 truncate select-none">
                      {anime.genre && anime.genre.slice(0, 3).map((g) => (
                        <span key={g} className="text-[10px] text-zinc-500 font-mono">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 p-1 bg-purple-500/10 rounded-full hover:bg-purple-500 text-purple-400 hover:text-white transition-all">
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

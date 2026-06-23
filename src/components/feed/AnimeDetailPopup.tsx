import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Tv, Calendar, BookOpen } from 'lucide-react';

interface AnimeDetail {
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

interface Props {
  anime: { mal_id?: number; title: string; cover_url?: string | null; genre?: string[] } | null;
  onClose: () => void;
}

export default function AnimeDetailPopup({ anime, onClose }: Props) {
  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anime?.mal_id) {
      // Kalau ga ada mal_id, pakai data yang ada
      if (anime) {
        setDetail({
          mal_id: 0,
          title: anime.title,
          cover_url: anime.cover_url || null,
          genre: anime.genre || [],
        });
      }
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      try {
        // Coba fetch dari Jikan
        const res = await fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}`);
        const json = await res.json();
        const a = json.data;
        if (a) {
          setDetail({
            mal_id: a.mal_id,
            title: a.title,
            cover_url: a.images?.jpg?.large_image_url || null,
            genre: (a.genres || []).map((g: any) => g.name),
            score: a.score,
            episodes: a.episodes,
            synopsis: a.synopsis,
            status: a.status,
            year: a.year,
          });
        }
      } catch {
        // Fallback ke data yang ada
        setDetail({
          mal_id: anime.mal_id!,
          title: anime.title,
          cover_url: anime.cover_url || null,
          genre: anime.genre || [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [anime]);

  // Klik luar untuk tutup
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <AnimatePresence>
      {anime && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Card */}
          <motion.div
            ref={ref}
            className="relative w-full sm:max-w-sm bg-[#111113] border border-zinc-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl z-10"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Poster + gradient */}
            <div className="relative h-48 bg-zinc-900 overflow-hidden">
              {(detail?.cover_url || anime.cover_url) ? (
                <img
                  src={detail?.cover_url || anime.cover_url!}
                  alt={detail?.title || anime.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-[#111113]/40 to-transparent" />

              {/* Close btn */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 bg-black/50 backdrop-blur-md rounded-full p-1.5 text-white hover:bg-black/80 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* MAL badge */}
              {anime.mal_id && (
                <a
                  href={`https://myanimelist.net/anime/${anime.mal_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-3 left-3 bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full hover:bg-blue-500 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  MAL →
                </a>
              )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-5 bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                  <div className="h-16 bg-zinc-800 rounded" />
                </div>
              ) : (
                <>
                  <h3 className="font-extrabold text-white text-base leading-snug">
                    {detail?.title || anime.title}
                  </h3>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {detail?.score && (
                      <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-yellow-400" />
                        {detail.score}
                      </span>
                    )}
                    {detail?.episodes && (
                      <span className="flex items-center gap-1 text-zinc-400 text-xs">
                        <Tv className="w-3.5 h-3.5" />
                        {detail.episodes} ep
                      </span>
                    )}
                    {detail?.year && (
                      <span className="flex items-center gap-1 text-zinc-400 text-xs">
                        <Calendar className="w-3.5 h-3.5" />
                        {detail.year}
                      </span>
                    )}
                    {detail?.status && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        detail.status === 'Currently Airing'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {detail.status === 'Currently Airing' ? '🟢 Tayang' : detail.status}
                      </span>
                    )}
                  </div>

                  {/* Genre chips */}
                  {(detail?.genre || anime.genre || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(detail?.genre || anime.genre || []).map((g) => (
                        <span key={g} className="text-[10px] bg-purple-500/10 border border-purple-800/30 text-purple-300 px-2 py-0.5 rounded-full font-medium">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Synopsis */}
                  {detail?.synopsis && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                        <BookOpen className="w-3 h-3" />
                        Synopsis
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-4">
                        {detail.synopsis}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

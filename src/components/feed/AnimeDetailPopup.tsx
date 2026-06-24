import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Tv, Calendar, BookOpen, ChevronDown, ChevronUp, Users, Building2, Clapperboard, Globe } from 'lucide-react';

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
  studios?: string[];
  producers?: string[];
  duration?: string;
  rating?: string;
  source?: string;
}

interface Episode {
  mal_id: number;
  title: string;
  title_romanji?: string;
  aired?: string;
  filler?: boolean;
  recap?: boolean;
}

interface Character {
  character: {
    mal_id: number;
    name: string;
    images: { jpg: { image_url: string } };
  };
  role: string;
  voice_actors: {
    person: {
      mal_id: number;
      name: string;
      images?: { jpg: { image_url: string } };
    };
    language: string;
  }[];
}

interface Props {
  anime: { mal_id?: number; title: string; cover_url?: string | null; genre?: string[] } | null;
  onClose: () => void;
}

type Tab = 'info' | 'episodes' | 'characters';

export default function AnimeDetailPopup({ anime, onClose }: Props) {
  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEp, setLoadingEp] = useState(false);
  const [loadingChar, setLoadingChar] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [showAllEp, setShowAllEp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anime?.mal_id) {
      if (anime) setDetail({ mal_id: 0, title: anime.title, cover_url: anime.cover_url || null, genre: anime.genre || [] });
      return;
    }
    setDetail(null);
    setEpisodes([]);
    setCharacters([]);
    setActiveTab('info');
    setShowAllEp(false);

    const fetch_ = async () => {
      setLoading(true);
      try {
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
            studios: (a.studios || []).map((s: any) => s.name),
            producers: (a.producers || []).map((p: any) => p.name),
            duration: a.duration,
            rating: a.rating,
            source: a.source,
          });
        }
      } catch {
        setDetail({ mal_id: anime.mal_id!, title: anime.title, cover_url: anime.cover_url || null, genre: anime.genre || [] });
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [anime]);

  useEffect(() => {
    if (activeTab === 'episodes' && anime?.mal_id && episodes.length === 0) {
      setLoadingEp(true);
      fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}/episodes`)
        .then(r => r.json())
        .then(json => setEpisodes(json.data || []))
        .catch(() => {})
        .finally(() => setLoadingEp(false));
    }
    if (activeTab === 'characters' && anime?.mal_id && characters.length === 0) {
      setLoadingChar(true);
      fetch(`https://api.jikan.moe/v4/anime/${anime.mal_id}/characters`)
        .then(r => r.json())
        .then(json => setCharacters((json.data || []).slice(0, 24)))
        .catch(() => {})
        .finally(() => setLoadingChar(false));
    }
  }, [activeTab, anime]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const displayedEpisodes = showAllEp ? episodes : episodes.slice(0, 8);
  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'episodes', label: `Episode${detail?.episodes ? ` (${detail.episodes})` : ''}` },
    { key: 'characters', label: 'Karakter' },
  ];

  return (
    <AnimatePresence>
      {anime && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

          <motion.div
            ref={ref}
            className="relative w-full sm:max-w-sm bg-[#111113] border border-zinc-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Poster */}
            <div className="relative h-44 bg-zinc-900 overflow-hidden shrink-0">
              {(detail?.cover_url || anime.cover_url) ? (
                <img src={detail?.cover_url || anime.cover_url!} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-[#111113]/30 to-transparent" />
              <button onClick={onClose} className="absolute top-3 right-3 bg-black/50 backdrop-blur-md rounded-full p-1.5 text-white hover:bg-black/80 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
              {anime.mal_id && (
                <a href={`https://myanimelist.net/anime/${anime.mal_id}`} target="_blank" rel="noopener noreferrer"
                  className="absolute top-3 left-3 bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full hover:bg-blue-500 transition-colors"
                  onClick={e => e.stopPropagation()}>
                  MAL →
                </a>
              )}
            </div>

            {/* Title & Stats */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-5 bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                </div>
              ) : (
                <>
                  <h3 className="font-extrabold text-white text-sm leading-snug line-clamp-2">{detail?.title || anime.title}</h3>
                  <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                    {detail?.score && (
                      <span className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-yellow-400" />{detail.score}
                      </span>
                    )}
                    {detail?.episodes && (
                      <span className="flex items-center gap-1 text-zinc-400 text-xs">
                        <Tv className="w-3.5 h-3.5" />{detail.episodes} ep
                      </span>
                    )}
                    {detail?.year && (
                      <span className="flex items-center gap-1 text-zinc-400 text-xs">
                        <Calendar className="w-3.5 h-3.5" />{detail.year}
                      </span>
                    )}
                    {detail?.status && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${detail.status === 'Currently Airing' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
                        {detail.status === 'Currently Airing' ? 'Sedang Tayang' : detail.status}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800 shrink-0 px-4">
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`py-2 px-3 text-[11px] font-bold transition-colors cursor-pointer border-b-2 -mb-px ${activeTab === tab.key ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-4 py-3">

              {/* INFO TAB */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* Genre */}
                  {(detail?.genre || anime.genre || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(detail?.genre || anime.genre || []).map(g => (
                        <span key={g} className="text-[10px] bg-purple-500/10 border border-purple-800/30 text-purple-300 px-2 py-0.5 rounded-full font-medium">{g}</span>
                      ))}
                    </div>
                  )}

                  {/* Studio */}
                  {(detail?.studios?.length || 0) > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                        <Building2 className="w-3 h-3" /> Studio Produksi
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {detail!.studios!.map(s => (
                          <span key={s} className="flex items-center gap-1.5 text-xs font-bold text-zinc-200 bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700"><Clapperboard className="w-3 h-3 text-purple-400" />
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Producers */}
                  {(detail?.producers?.length || 0) > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Produser</div>
                      <div className="flex flex-wrap gap-1.5">
                        {detail!.producers!.map(p => (
                          <span key={p} className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {detail?.source && (
                      <div className="bg-zinc-900 rounded-xl p-2.5">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Sumber</p>
                        <p className="text-xs text-zinc-200 font-semibold mt-0.5">{detail.source}</p>
                      </div>
                    )}
                    {detail?.duration && (
                      <div className="bg-zinc-900 rounded-xl p-2.5">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Durasi</p>
                        <p className="text-xs text-zinc-200 font-semibold mt-0.5">{detail.duration}</p>
                      </div>
                    )}
                    {detail?.rating && (
                      <div className="bg-zinc-900 rounded-xl p-2.5 col-span-2">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Rating</p>
                        <p className="text-xs text-zinc-200 font-semibold mt-0.5">{detail.rating}</p>
                      </div>
                    )}
                  </div>

                  {/* Synopsis */}
                  {detail?.synopsis && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                        <BookOpen className="w-3 h-3" /> Synopsis
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{detail.synopsis}</p>
                    </div>
                  )}
                </div>
              )}

              {/* EPISODES TAB */}
              {activeTab === 'episodes' && (
                <div className="space-y-1.5">
                  {loadingEp ? (
                    <div className="space-y-2 animate-pulse">
                      {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-zinc-800 rounded-lg" />)}
                    </div>
                  ) : episodes.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-6">Data episode belum tersedia.</p>
                  ) : (
                    <>
                      {displayedEpisodes.map(ep => (
                        <div key={ep.mal_id} className="flex items-center gap-3 p-2.5 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
                          <span className="text-[10px] font-bold text-purple-400 font-mono w-7 shrink-0 text-center bg-purple-500/10 rounded py-0.5">{ep.mal_id}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-zinc-200 truncate leading-snug">
                              {ep.title || ep.title_romanji || `Episode ${ep.mal_id}`}
                            </p>
                            {ep.aired && (
                              <p className="text-[10px] text-zinc-600 mt-0.5">
                                {new Date(ep.aired).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                          {ep.filler && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold shrink-0">Filler</span>}
                          {ep.recap && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold shrink-0">Recap</span>}
                        </div>
                      ))}
                      {episodes.length > 8 && (
                        <button onClick={() => setShowAllEp(!showAllEp)}
                          className="w-full py-2 text-xs text-purple-400 font-bold flex items-center justify-center gap-1 hover:text-purple-300 transition-colors cursor-pointer">
                          {showAllEp ? <><ChevronUp className="w-3.5 h-3.5" />Sembunyikan</> : <><ChevronDown className="w-3.5 h-3.5" />Lihat semua {episodes.length} episode</>}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* CHARACTERS TAB */}
              {activeTab === 'characters' && (
                <div className="space-y-2">
                  {loadingChar ? (
                    <div className="grid grid-cols-2 gap-2 animate-pulse">
                      {[1,2,3,4].map(i => <div key={i} className="h-20 bg-zinc-800 rounded-xl" />)}
                    </div>
                  ) : characters.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-6">Data karakter belum tersedia.</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                        <Users className="w-3 h-3" /> Karakter & Pengisi Suara
                      </div>
                      <div className="space-y-2">
                        {characters.map(c => {
                          const jaVA = c.voice_actors?.find(v => v.language === 'Japanese');
                          return (
                            <div key={c.character.mal_id} className="flex items-center gap-3 p-2.5 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors">
                              {/* Karakter */}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <img
                                  src={c.character.images?.jpg?.image_url}
                                  alt={c.character.name}
                                  className="w-10 h-12 rounded-lg object-cover shrink-0 bg-zinc-800"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-zinc-200 truncate leading-tight">{c.character.name}</p>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${c.role === 'Main' ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                    {c.role === 'Main' ? 'Utama' : 'Pendukung'}
                                  </span>
                                </div>
                              </div>

                              {/* Divider */}
                              {jaVA && <div className="w-px h-10 bg-zinc-800 shrink-0" />}

                              {/* Voice Actor */}
                              {jaVA && (
                                <div className="flex items-center gap-2 shrink-0">
                                  {jaVA.person.images?.jpg?.image_url && (
                                    <img
                                      src={jaVA.person.images.jpg.image_url}
                                      alt={jaVA.person.name}
                                      className="w-10 h-12 rounded-lg object-cover bg-zinc-800"
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">CV</p>
                                    <p className="text-[11px] font-semibold text-zinc-300 truncate max-w-[80px] leading-tight">{jaVA.person.name}</p>
                                    <p className="text-[9px] text-zinc-600 flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" />Jepang</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

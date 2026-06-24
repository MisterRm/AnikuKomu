import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchFromJikan(q: string) {
  const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=10&sfw=true`);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data || []).map((a: any) => ({
    mal_id: a.mal_id,
    title: a.title,
    cover_url: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || null,
    genre: (a.genres || []).map((g: any) => g.name),
    score: a.score,
    episodes: a.episodes,
    synopsis: a.synopsis,
    status: a.status,
    year: a.year,
  }));
}

async function upsertAnimes(animes: any[]) {
  for (const a of animes) {
    if (!a.mal_id) continue;
    await supabase.from('animes').upsert({
      mal_id: a.mal_id,
      title: a.title,
      cover_url: a.cover_url,
      genre: a.genre,
    }, { onConflict: 'mal_id', ignoreDuplicates: false });
  }
}

async function authenticateUser(req: VercelRequest) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.split(' ')[1];
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only the app itself should call this — no public/cross-origin access,
  // and it must come from a logged-in user (this route writes to the DB
  // using the service role key).
  const user = await authenticateUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const q = (req.query.q as string) || '';

  // Kalau query kosong, return top anime dari Jikan
  if (q.length < 2) {
    try {
      const topRes = await fetch('https://api.jikan.moe/v4/top/anime?limit=10&filter=airing');
      const topJson = await topRes.json();
      const results = (topJson.data || []).map((a: any) => ({
        mal_id: a.mal_id,
        title: a.title,
        cover_url: a.images?.jpg?.large_image_url || null,
        genre: (a.genres || []).map((g: any) => g.name),
        score: a.score,
        episodes: a.episodes,
        synopsis: a.synopsis,
        status: a.status,
        year: a.year,
      }));
      return res.json(results);
    } catch {
      return res.json([]);
    }
  }

  try {
    // Cek dulu di Supabase
    const { data: existing } = await supabase
      .from('animes')
      .select('*')
      .ilike('title', `%${q}%`)
      .limit(10);

    // Fetch dari Jikan
    const jikanResults = await fetchFromJikan(q);

    // Upsert hasil Jikan ke Supabase (background, tidak blocking)
    upsertAnimes(jikanResults).catch(() => {});

    // Ambil data Supabase yang sudah terupdate (dengan id asli)
    const { data: freshData } = await supabase
      .from('animes')
      .select('*')
      .ilike('title', `%${q}%`)
      .limit(10);

    // Merge: prioritas data Supabase (punya id), tambah jikan yang belum ada
    const supabaseIds = new Set((freshData || []).map((a: any) => a.mal_id));
    const extraFromJikan = jikanResults.filter((j: any) => !supabaseIds.has(j.mal_id));

    const merged = [
      ...(freshData || []),
      ...extraFromJikan.map((j: any) => ({ ...j, id: null }))
    ];

    return res.json(merged);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function authenticateUser(req: VercelRequest) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.split(' ')[1];
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await authenticateUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { post_id } = req.body;
  if (!post_id) return res.status(400).json({ error: 'post_id required' });

  const { data: existing } = await supabase.from('likes').select('*')
    .eq('user_id', user.id).eq('post_id', post_id).maybeSingle();

  let liked = false;
  if (existing) {
    await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', post_id);
  } else {
    await supabase.from('likes').insert({ user_id: user.id, post_id });
    liked = true;
  }

  const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post_id);
  return res.json({ liked, count: count || 0 });
}

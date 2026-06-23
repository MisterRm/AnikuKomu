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

  const { target_user_id } = req.body;
  if (!target_user_id) return res.status(400).json({ error: 'target_user_id required' });
  if (user.id === target_user_id) return res.status(400).json({ error: 'Cannot follow yourself' });

  const { data: existing } = await supabase.from('follows').select('*')
    .eq('follower_id', user.id).eq('following_id', target_user_id).maybeSingle();

  let following = false;
  if (existing) {
    await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', target_user_id);
  } else {
    await supabase.from('follows').insert({ follower_id: user.id, following_id: target_user_id });
    following = true;
  }

  return res.json({ following });
}

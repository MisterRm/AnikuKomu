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

  const { post_id, content, parent_id } = req.body;
  if (!post_id || !content) return res.status(400).json({ error: 'post_id and content required' });

  const { data, error } = await supabase.from('comments')
    .insert({ post_id, user_id: user.id, content, parent_id: parent_id || null, likes_count: 0 })
    .select('*, profiles(*)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
}

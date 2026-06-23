import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'DELETE, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: `Method not allowed (received: ${req.method})` });
  }
  const user = await authenticateUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  const { data: post } = await supabase.from('posts').select('*').eq('id', id).maybeSingle();
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' });

  if (post.image_public_id) {
    try { await cloudinary.uploader.destroy(post.image_public_id); } catch {}
  }

  await supabase.from('post_anime_tags').delete().eq('post_id', id);
  await supabase.from('likes').delete().eq('post_id', id);
  await supabase.from('comments').delete().eq('post_id', id);
  await supabase.from('posts').delete().eq('id', id);

  return res.json({ success: true });
}

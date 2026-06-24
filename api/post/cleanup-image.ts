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

// Deletes a post AND its Cloudinary image together, server-side, after
// verifying the requester actually owns the post. This must be called
// BEFORE the post row is removed (we need it to still exist to check
// ownership) — so this endpoint performs the row delete itself rather than
// relying on the client to have already deleted it.
//
// Uses POST (not DELETE) since some mobile networks/carrier proxies
// mishandle the DELETE HTTP method.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method not allowed (received: ${req.method})` });
  }

  const user = await authenticateUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { post_id } = req.body || {};
  if (!post_id || typeof post_id !== 'string') {
    return res.status(400).json({ error: 'post_id is required' });
  }

  // Look up the post and verify ownership BEFORE doing anything destructive.
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id, user_id, image_public_id')
    .eq('id', post_id)
    .maybeSingle();

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message });
  }
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  if (post.user_id !== user.id) {
    return res.status(403).json({ error: 'Anda tidak memiliki izin untuk menghapus postingan ini.' });
  }

  // Delete the DB row first (this is the part the user actually cares about).
  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', post_id);

  if (deleteError) {
    return res.status(500).json({ error: deleteError.message });
  }

  // Best-effort Cloudinary cleanup — non-fatal if it fails, the post is
  // already gone from the user's perspective either way.
  if (post.image_public_id) {
    try {
      await cloudinary.uploader.destroy(post.image_public_id);
    } catch (err) {
      console.error('Cloudinary cleanup failed:', err);
    }
  }

  return res.json({ success: true });
}

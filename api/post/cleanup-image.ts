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

// Best-effort cleanup of a Cloudinary image after its post row has already
// been deleted client-side. Uses POST (not DELETE) since some mobile
// networks/carrier proxies mishandle the DELETE HTTP method.
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

  const { public_id } = req.body || {};
  if (!public_id || typeof public_id !== 'string') {
    return res.status(400).json({ error: 'public_id is required' });
  }

  try {
    await cloudinary.uploader.destroy(public_id);
  } catch (err) {
    // Non-fatal — the post is already gone either way.
    console.error('Cloudinary cleanup failed:', err);
  }

  return res.json({ success: true });
}

import { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

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

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await authenticateUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
  form.parse(req, async (err, _fields, files) => {
    if (err) return res.status(400).json({ error: 'Upload error' });
    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!file) return res.status(400).json({ error: 'No file' });
    try {
      const folder = req.query.folder === 'profiles' ? 'anikukomu_avatars' : 'anikukomu_posts';
      const result = await cloudinary.uploader.upload(file.filepath, { folder });
      fs.unlinkSync(file.filepath);
      return res.json({ url: result.secure_url, public_id: result.public_id });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });
}

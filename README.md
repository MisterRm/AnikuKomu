# AnikuKomu — Platform Sosial Media Anime Indonesia

## Deploy ke Vercel

### 1. Push ke GitHub
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/USERNAME/anikukomu.git
git push -u origin main
```

### 2. Import di Vercel
- Buka https://vercel.com/new
- Import repo GitHub lo
- Framework Preset: **Vite**
- Build Command: `vite build`
- Output Directory: `dist`

### 3. Set Environment Variables di Vercel Dashboard
Settings → Environment Variables → tambahkan semua ini:

```
VITE_SUPABASE_URL=https://sfyyljfpnutskeenlysb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
CLOUDINARY_CLOUD_NAME=dzfkklsza
CLOUDINARY_API_KEY=588474134734416
CLOUDINARY_API_SECRET=9c12YJe5rZSYSg7zROQuvmVZ7mg
```

### 4. Deploy!
Klik Deploy — selesai 🎉

## Run Local
```bash
npm install
npm run dev
```

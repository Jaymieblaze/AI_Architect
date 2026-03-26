# 🚀 Free Cloud Deployment Guide

This guide will help you deploy AI Architect to the cloud **completely free** using Vercel and Supabase.

## ✅ Prerequisites

1. **GitHub Account** (free)
2. **Vercel Account** (free tier - unlimited)
3. **Supabase Account** (free tier - 500MB storage)
4. **KREA AI API Key** (from https://www.krea.ai/)

---

## 📦 Step 1: Prepare Your Repository

Your code is already ready! Just push your latest changes to GitHub:

```bash
# Make sure you're on master branch
git checkout master

# Merge cloud deployment changes
git merge feature/cloud-deployment

# Push to GitHub
git push origin master
```

---

## 🗄️ Step 2: Set Up Supabase (Database & Storage)

### 2.1 Create Supabase Project

1. Go to https://supabase.com/
2. Click **"Start your project"** → Sign in with GitHub
3. Click **"New Project"**
4. Fill in:
   - **Name**: `ai-architect`
   - **Database Password**: Save this somewhere safe!
   - **Region**: Choose closest to you
5. Click **"Create new project"** (takes ~2 minutes)

### 2.2 Create Database Tables

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Paste this SQL:

```sql
-- Create concepts table
CREATE TABLE concepts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  prompt TEXT NOT NULL,
  image_url TEXT,
  job_id TEXT,
  status TEXT DEFAULT 'pending',
  seed INTEGER,
  metadata JSONB
);

-- Create multi_angle_images table
CREATE TABLE multi_angle_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concept_id UUID REFERENCES concepts(id) ON DELETE CASCADE,
  angle TEXT NOT NULL,
  job_id TEXT NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'pending',
  custom_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_angle_images ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read/write (for demo purposes)
CREATE POLICY "Enable all access for concepts" ON concepts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for multi_angle_images" ON multi_angle_images
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX concepts_created_at_idx ON concepts(created_at DESC);
CREATE INDEX multi_angle_images_concept_id_idx ON multi_angle_images(concept_id);
```

4. Click **"Run"**
5. You should see: **"Success. No rows returned"**

### 2.3 Get Your Supabase Credentials

1. Go to **Settings** → **API** (left sidebar)
2. Copy these values (you'll need them for Vercel):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (click "Reveal")

⚠️ **Keep service_role key secret!** Never commit it to GitHub.

---

## 🌐 Step 3: Deploy to Vercel

### 3.1 Import Your Project

1. Go to https://vercel.com/
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your **AI_Architect** repository
5. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: Click **"Edit"** → Select **`frontend`**
   - Leave Build Command and Output Directory as default

### 3.2 Add Environment Variables

Click **"Environment Variables"** and add these:

| Name | Value | Where to get it |
|------|-------|----------------|
| `KREA_API_KEY` | `your_krea_key` | https://www.krea.ai/ dashboard |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase Settings → API (anon/public) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Supabase Settings → API (service_role) |

⚠️ **Important**: 
- `NEXT_PUBLIC_*` variables are safe to expose to browser
- `SUPABASE_SERVICE_ROLE_KEY` must be kept secret (no prefix)

### 3.3 Deploy!

1. Click **"Deploy"**
2. Wait ~2-3 minutes for build to complete
3. You'll see: **"Congratulations! Your project has been deployed."**
4. Click **"Visit"** to see your live app! 🎉

Your URL will be: `https://your-project-name.vercel.app`

---

## ✅ Step 4: Test Your Deployment

1. Visit your Vercel URL
2. Try generating a simple concept:
   - Prompt: `modern glass office building with green roof`
   - Click **"Generate Concept"**
3. Wait ~30 seconds for generation
4. Image should appear!

If you see errors, check:
- Vercel **Logs** tab for error messages
- Supabase **Database** → **Table Editor** to verify tables exist
- Environment variables are correct (no typos)

---

## 🎯 What You Get (100% Free)

- ✅ **Frontend**: Vercel (unlimited bandwidth, auto-scaling)
- ✅ **Database**: Supabase (500MB, 2GB bandwidth/month)
- ✅ **API**: KREA AI (free tier available)
- ✅ **SSL**: Automatic HTTPS
- ✅ **CDN**: Global edge network
- ✅ **Deployments**: Unlimited previews

---

## 🔧 Updating Your App

Every time you push to GitHub master branch, Vercel automatically rebuilds:

```bash
git add .
git commit -m "Update feature"
git push origin master
# Vercel automatically deploys in ~2 minutes!
```

---

## 🆘 Troubleshooting

### "Server configuration error"
- Check environment variables in Vercel dashboard
- Make sure `KREA_API_KEY` is set correctly

### "Failed to generate image"
- Check KREA API key is valid
- Check Vercel function logs for detailed error

### "Database error"
- Verify Supabase tables were created correctly
- Check `SUPABASE_SERVICE_ROLE_KEY` is set (no `NEXT_PUBLIC_` prefix)

### Images not saving to history
- Check Supabase table policies allow public access
- Verify database connection in Vercel logs

---

## 🎨 Custom Domain (Optional)

Want `architect.yourdomain.com` instead of `.vercel.app`?

1. In Vercel dashboard → **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration steps
4. SSL certificate auto-generated!

---

## 📊 Monitoring

- **Vercel Analytics**: See traffic, performance, errors
- **Supabase Logs**: Monitor database queries
- **KREA Dashboard**: Track API usage

---

## 🎉 You're Live!

Share your app:
- Competition judges can access it 24/7
- Works on mobile, tablet, desktop
- Global CDN ensures fast loading worldwide
- No server maintenance required!

**Your competition-ready URL**: `https://your-project.vercel.app`

---

## 💡 Pro Tips

1. **Preview Deployments**: Every branch gets its own URL for testing
2. **Rollback**: One click to revert to previous deployment
3. **Environment Variables**: Can add different values for Production/Preview
4. **Custom 404**: Create `app/not-found.tsx` for branded error page
5. **Analytics**: Enable Vercel Analytics for free usage stats

---

Need help? Check:
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- KREA Docs: https://docs.krea.ai/

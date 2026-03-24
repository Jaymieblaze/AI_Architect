# Supabase Setup Guide

## Quick Setup (5 minutes)

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and region
4. Set database password (save this!)
5. Wait for project provisioning (~2 minutes)

### 2. Create Database Table

1. Click "SQL Editor" in left sidebar
2. Click "New Query"
3. Copy and paste contents of `database/schema.sql`
4. Click "Run" (or press Ctrl/Enter)
5. Verify the `concepts` table appears in "Table Editor"

### 3. Get API Credentials

1. Go to Project Settings → API
2. Copy these values:

```env
# Project URL
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# Public anon key (safe for client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Service role key (NEVER expose to client!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

3. Add to `frontend/.env.local`

### 4. Test Connection

```bash
cd frontend
npm run dev
```

Generate a concept - it should automatically save to the database.
Visit `/gallery` to see your saved concepts.

## Optional: Enable Row Level Security (RLS)

If you plan to add user authentication later:

```sql
-- Enable RLS
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all concepts
CREATE POLICY "Allow authenticated read" 
  ON concepts FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert their own concepts
CREATE POLICY "Allow authenticated insert" 
  ON concepts FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
```

## Troubleshooting

### "Missing Supabase environment variables"
- Verify all three env vars are in `frontend/.env.local`
- Restart the dev server after adding env vars

### "Failed to save concept to gallery"
- Check Supabase dashboard → Logs for detailed errors
- Verify the `concepts` table exists
- Check API credentials are correct

### "Failed to fetch gallery"
- Open browser DevTools → Network tab
- Check the `/api/gallery` response
- Verify Supabase project is active (not paused)

## Free Tier Limits

Supabase free tier includes:
- 500MB database space
- 1GB file storage
- 50,000 monthly active users
- Pauses after 1 week of inactivity (auto-resumes on first request)

For this project, free tier is more than sufficient!

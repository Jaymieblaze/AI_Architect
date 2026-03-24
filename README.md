# AI Architect 🏗️

An AI-powered architectural concept generator that transforms text descriptions into stunning architectural visualizations using n8n orchestration and Krea AI.

## 🏛️ Architecture

```
Frontend (Next.js 16 + React 19)
    ↓ HTTP POST
n8n Workflow Orchestration
    ↓ API Call
Krea AI Image Generation
    ↓ Polling & Save
Supabase Database (Gallery)
    ↑
Frontend Displays Result + Gallery
```

## ✨ Features

- **Natural Language Input**: Describe architectural concepts in plain English
- **AI-Powered Generation**: Leverages Krea AI for high-quality architectural renders
- **Async Job Processing**: Non-blocking generation with real-time status polling (5-minute timeout, 3-retry logic)
- **Generation History**: Collapsible sidebar showing 10 most recent concepts with thumbnails
- **Quick Reload**: Click any history item to instantly reload previous concepts
- **Persistent Gallery**: Auto-saves all generated concepts to Supabase
- **Grid View**: Browse your concept collection in a responsive gallery
- **Download & Export**: Save high-resolution images locally
- **Keyboard Shortcuts**: Ctrl/Cmd + Enter to generate
- **Input Validation**: Smart character limits (10-500 chars) with live counter
- **Error Handling**: Graceful degradation with user-friendly error messages
- **Modern UI**: Clean, minimalist interface with Tailwind CSS
- **Type-Safe**: Full TypeScript implementation with strict mode

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- n8n instance (local or cloud)
- Krea AI API key
- Supabase account (free tier available)

### Installation

1. **Clone and install dependencies**
```bash
cd AI_Architect/frontend
npm install
```

2. **Set up Supabase**

a. Create a new project at [supabase.com](https://supabase.com)

b. Run the database schema:
   - Go to SQL Editor in Supabase dashboard
   - Copy contents of `database/schema.sql`
   - Execute the SQL

c. Get your credentials from Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **Configure environment variables**

```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:
```env
# Krea AI
KREA_API_KEY=your_krea_api_key_here

# n8n Webhook
N8N_WEBHOOK_URL=http://localhost:5678/webhook/generate-concept

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. **Start n8n** (if running locally)
```bash
# Using Docker
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n

# Using npx
npx n8n
```

5. **Set up n8n workflows**
```bash
# From root directory
npx n8nac pull <workflow-id>
# Or create the workflow (see workflows/ directory)
```

6. **Run the development server**
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
AI_Architect/
├── frontend/                 # Next.js application
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate/    # Trigger n8n workflow
│   │   │   ├── poll/        # Poll Krea AI status
│   │   │   └── gallery/     # Gallery CRUD operations
│   │   ├── gallery/         # Gallery page
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ConceptArchitect.tsx  # Main generator UI
│   │   ├── Gallery.tsx           # Gallery grid view
│   │   └── ErrorBoundary.tsx     # Error handling
│   ├── lib/
│   │   └── supabase/        # Supabase client utilities
│   ├── types/
│   │   ├── api.ts           # API type definitions
│   │   └── database.ts      # Database schema types
│   └── package.json
├── database/
│   └── schema.sql           # Supabase database schema
├── workflows/                # n8n workflow definitions
│   └── local_5678_kehinde_a/
└── n8nac-config.json        # n8n-as-code configuration
```

## 🔧 Workflow Management

This project uses [n8n-as-code](https://www.npmjs.com/package/@n8n-as-code/cli) for workflow version control:

```bash
# List workflows
npx n8nac list

# Pull workflow from n8n
npx n8nac pull <workflow-id>

# Push workflow to n8n
npx n8nac push <filename.workflow.ts>

# Verify workflow integrity
npx n8nac verify <workflow-id>
```

## 🛠️ Development

```bash
# Run development server
cd frontend
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 📝 Usage

### Generate a Concept
1. Navigate to [http://localhost:3000](http://localhost:3000)
2. Enter an architectural concept description (e.g., "a minimalist tropical resort with timber cladding and infinity pools")
3. Click "Generate Concept" (or press Ctrl/Cmd + Enter)
4. Wait for AI processing (20-60 seconds)
5. View your generated visualization
6. Download the image or generate another

### Generation History
- **Automatic**: The right sidebar shows your 10 most recent concepts
- **Quick Access**: Click any thumbnail to reload that concept
- **Collapsible**: Toggle the sidebar to maximize workspace
- **Auto-Refresh**: Updates automatically when new concepts are saved

### Browse Gallery
1. Click "Gallery" button in the top-right
2. View all your generated concepts in a grid layout
3. Click any concept to view fullscreen
4. Download or delete concepts as needed

All generated concepts are automatically saved to your Supabase database!

## 🔐 Security Notes

- Never commit `.env.local` files
- Rotate API keys regularly
- Use environment variables for all sensitive data
- Consider implementing rate limiting for production

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make your changes
3. Commit: `git commit -m "Add amazing feature"`
4. Push: `git push origin feature/amazing-feature`

## 📄 License

Private project

## 🙋 Support

For issues or questions, refer to:
- [n8n Documentation](https://docs.n8n.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Krea AI Documentation](https://docs.krea.ai/)

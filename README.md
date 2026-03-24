# AI Architect 🏗️

An AI-powered architectural concept generator that transforms text descriptions into stunning architectural visualizations using n8n orchestration and Krea AI.

## 🏛️ Architecture

```
Frontend (Next.js 16 + React 19)
    ↓ HTTP POST
n8n Workflow Orchestration
    ↓ API Call
Krea AI Image Generation
    ↓ Polling
Frontend Displays Result
```

## ✨ Features

- **Natural Language Input**: Describe architectural concepts in plain English
- **AI-Powered Generation**: Leverages Krea AI for high-quality architectural renders
- **Async Job Processing**: Non-blocking generation with real-time status polling
- **Modern UI**: Clean, minimalist interface with Tailwind CSS
- **Type-Safe**: Full TypeScript implementation

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- n8n instance (local or cloud)
- Krea AI API key

### Installation

1. **Clone and install dependencies**
```bash
cd AI_Architect
cd frontend
npm install
```

2. **Configure environment variables**
```bash
# Root directory
cp .env.example .env.local

# Frontend directory
cd frontend
cp .env.example .env.local
```

3. **Set up your API keys**

Edit both `.env.local` files:
```env
# Root .env.local (for n8nac CLI)
N8N_HOST=http://localhost:5678
N8N_API_KEY=your_n8n_api_key_here

# frontend/.env.local
KREA_API_KEY=your_krea_api_key_here
N8N_WEBHOOK_URL=http://localhost:5678/webhook/generate-concept
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
│   │   │   └── poll/        # Poll Krea AI status
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── ConceptArchitect.tsx
│   └── package.json
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

1. Enter an architectural concept description (e.g., "a minimalist tropical resort with timber cladding and infinity pools")
2. Click "Generate Concept"
3. Wait for the AI to process your request (20-60 seconds)
4. View your generated architectural visualization

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

# Small Content Creator (AI Video Editing System) 🎬🤖

An advanced, full-stack AI-powered video editing SaaS that transforms long-form videos or uploads into polished, ready-to-publish short-form content. Built with modern web technologies, this platform leverages AI to understand transcripts, generate edit plans, and automatically trim, caption, and enhance videos.

## 🌟 Key Features

- **AI-Powered Editing Plans:** Uses Google Gemini / OpenAI to analyze video transcripts and generate intelligent Edit Decision Lists (EDLs).
- **Automated Video Processing:** Robust background pipelines via BullMQ and FFmpeg to clip, process, add background music, and burn stylized captions onto videos.
- **Shorts Editing Editor:** Interactive React-based frontend to review AI-generated edit plans and refine edits before final rendering.
- **Local-First / S3 Storage:** Stores files efficiently using MinIO (S3 compatible), avoiding GitHub large file limits and acting as a production-ready cloud storage proxy.
- **Direct YouTube Upload:** Seamlessly authenticates with Google OAuth and uploads final processed clips directly to YouTube.
- **Role-Based Access (RBAC):** Supports tiered user experiences (Admin vs Creator).

## 🛠️ Technology Stack

### Requirements
- **Node.js** (v18+)
- **PostgreSQL** (Active database required)
- **Redis** (For BullMQ background job processing)
- **MinIO** (Local S3 file storage)
- **FFmpeg & FFprobe** (Handled via static packages, but having it installed locally is recommended)

### Backend
- **Framework:** Node.js, Express
- **Database ORM:** Prisma (@prisma/client, @prisma/adapter-pg)
- **Queues:** BullMQ, ioredis
- **Video Processing:** fluent-ffmpeg
- **AI Providers:** @google/generative-ai, openai
- **Authentication:** Passport.js, Google OAuth 2.0, JWT

### Frontend
- **Framework:** React 19, Vite
- **Styling:** Tailwind CSS, PostCSS, Autoprefixer
- **Icons:** Lucide React
- **Routing:** React Router DOM
- **Network:** Axios

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/small-content-creator.git
cd small-content-creator
```

### 2. Infrastructure Setup (Docker Compose)
Make sure you have Docker installed and running. Start the required services (MinIO, PostgreSQL, Redis):
```bash
docker-compose up -d
```

### 3. Backend Setup
Navigate to the `backend` directory, install dependencies, and setup the database:
```bash
cd backend
npm install
# Configure your .env file
npm run prisma generate
npm run prisma db push
```

**Environment Variables `.env` (Backend):**
Create a `.env` file in the `/backend` folder:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
PORT=5000
JWT_SECRET="your-jwt-secret"
GEMINI_API_KEY="your-google-gemini-key"
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
REDIS_URL="redis://localhost:6379"
# Add your Google OAuth keys for YouTube integration
```

### 4. Frontend Setup
Navigate to the `frontend` directory, install dependencies:
```bash
cd ../frontend
npm install
```

**Environment Variables `.env` (Frontend):**
Create a `.env` file in the `/frontend` folder:
```env
VITE_API_URL="http://localhost:5000"
```

### 5. Running the Application
You can run the frontend and backend concurrently.

**Run Backend:**
```bash
cd backend
npm run dev
```

**Run Frontend:**
```bash
cd frontend
npm run dev
```

Visit the application at `http://localhost:5173`.

---

## 🧠 How the AI Pipeline Works
1. **Upload:** User uploads a video (stored temporarily or forwarded to MinIO).
2. **Transcription:** Extract audio and run a transcription job (OpenAI/Whisper).
3. **AI Planning:** Pass the transcript to Gemini/OpenAI which returns a JSON Edit Plan outlining cuts, tones, and highlights.
4. **Rendering:** BullMQ worker picks up the job, applies FFmpeg filters based on the AI plan (trimming, text burnout, music overlays).
5. **Publish:** The user previews the clip in the React Dashboard and can one-click upload to YouTube.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request or open an issue.

## 📄 License
This project is licensed under the ISC License.

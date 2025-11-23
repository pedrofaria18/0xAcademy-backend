# 0xAcademy - Backend

Backend API for a Web3 educational platform with MetaMask authentication, Supabase database, and Cloudflare Stream video hosting.

## 🚀 Features

- **MetaMask Authentication**: Secure Web3 authentication using Sign-In with Ethereum (SIWE)
- **Course Management**: Full CRUD operations for courses and lessons
- **Video Streaming**: Integration with Cloudflare Stream for video uploads and playback
- **Progress Tracking**: Track user progress through courses and lessons
- **Role-based Access**: Instructors and students with appropriate permissions
- **Certificate System**: Ready for NFT certificate implementation

## 📋 Prerequisites

- Node.js 18+ 
- pnpm 8+
- PostgreSQL (via Supabase)
- Cloudflare account with Stream enabled
- MetaMask wallet for testing

## 🛠 Installation

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd web3-courses-backend
```

2. **Install dependencies:**
```bash
pnpm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
- Supabase credentials
- JWT secret (generate a secure random string)
- Cloudflare Stream credentials
- Frontend URL for CORS

4. **Set up Supabase:**

   a. Create a new Supabase project at https://supabase.com
   
   b. Run the migration in Supabase SQL editor:
   ```sql
   -- Copy contents from supabase/migrations/001_initial_schema.sql
   ```
   
   c. Copy your Supabase URL and keys to `.env`

5. **Set up Cloudflare Stream:**
   
   a. Enable Stream in your Cloudflare dashboard
   
   b. Get your Account ID and create an API token with Stream permissions
   
   c. Add to `.env`

6. **Start the development server:**
```bash
pnpm dev
```

Server will run on `http://localhost:3001`

## 📚 API Documentation

### Authentication

#### Get Nonce
```http
POST /api/auth/nonce
Body: { "address": "0x..." }
Response: { "nonce": "random_string" }
```

#### Verify Signature
```http
POST /api/auth/verify
Body: { "message": "...", "signature": "0x..." }
Response: { "token": "jwt_token", "user": {...} }
```

#### Get Current User
```http
GET /api/auth/me
Headers: Authorization: Bearer <token>
Response: { "user": {...} }
```

### Courses

#### List Courses
```http
GET /api/courses?page=1&limit=12&category=blockchain
Response: { "courses": [...], "pagination": {...} }
```

#### Get Course Details
```http
GET /api/courses/:courseId
Response: { "course": {...}, "hasFullAccess": boolean }
```

#### Create Course (Authenticated)
```http
POST /api/courses
Headers: Authorization: Bearer <token>
Body: { "title": "...", "description": "...", ... }
Response: { "course": {...} }
```

#### Enroll in Course
```http
POST /api/courses/:courseId/enroll
Headers: Authorization: Bearer <token>
Response: { "enrollment": {...} }
```

### Videos

#### Get Upload URL
```http
POST /api/videos/upload-url
Headers: Authorization: Bearer <token>
Body: { "courseId": "...", "lessonId": "..." }
Response: { "uploadURL": "...", "videoId": "..." }
```

#### Get Video Details
```http
GET /api/videos/:videoId
Headers: Authorization: Bearer <token>
Response: { "video": {...} }
```

### User Profile

#### Get Profile
```http
GET /api/user/profile
Headers: Authorization: Bearer <token>
Response: { "user": {...} }
```

#### Update Profile
```http
PATCH /api/user/profile
Headers: Authorization: Bearer <token>
Body: { "display_name": "...", "bio": "..." }
Response: { "user": {...} }
```

#### Get Learning Progress
```http
GET /api/user/progress
Headers: Authorization: Bearer <token>
Response: { "progress": [...] }
```

## 🏗 Project Structure

```
src/
├── config/         # Configuration files (Supabase, etc.)
├── middleware/     # Express middleware (auth, error handling)
├── routes/         # API route definitions
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
└── index.ts        # Application entry point
```

## 🔐 Security Features

- SIWE authentication for secure Web3 login
- JWT tokens for session management
- Rate limiting on all API endpoints
- Helmet.js for security headers
- Row Level Security (RLS) in Supabase
- Input validation with Zod

## 🚀 Deployment

### Using Railway/Render/Heroku:

1. Set environment variables in platform dashboard
2. Deploy from GitHub
3. Run database migrations

### Using VPS:

1. Install Node.js and PM2
2. Clone repository
3. Set up environment variables
4. Run migrations
5. Start with PM2:
```bash
pnpm build
pm2 start dist/index.js --name web3-courses-api
```

## 🔄 Next Steps

1. **Payment Integration**: 
   - Add Stripe for fiat payments
   - Add crypto payment gateway (Coinbase Commerce)

2. **NFT Certificates**:
   - Smart contract for certificate NFTs
   - Minting endpoint

3. **Enhanced Features**:
   - Real-time chat for courses
   - Live streaming support
   - Assignment submissions
   - Quiz system

4. **Performance**:
   - Redis for caching
   - CDN for static assets
   - Database indexing optimization

## 📝 Environment Variables Reference

```env
# Server
NODE_ENV=development|production
PORT=3001

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# JWT
JWT_SECRET=minimum_32_character_secret
JWT_EXPIRES_IN=7d

# SIWE
SIWE_DOMAIN=localhost:3000
SIWE_ORIGIN=http://localhost:3000

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_STREAM_TOKEN=your_stream_token

# Frontend
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 💬 Support

For support, email support@yourplatform.com or open an issue on GitHub.
# 0xAcademy-backend

# 0xAcademy - Backend

Backend API for a Web3 educational platform with MetaMask authentication, Supabase database, and Cloudflare Stream video hosting.

## 🚀 Features

- **MetaMask Authentication**: Secure Web3 authentication using Sign-In with Ethereum (SIWE)
- **Course Management**: Full CRUD operations for courses and lessons
- **Video Streaming**: Integration with Cloudflare Stream for video uploads and playback
- **Progress Tracking**: Track user progress through courses and lessons
- **Role-based Access**: Instructors and students with appropriate permissions
- **Certificate System**: Ready for NFT certificate implementation
- **Redis Caching**: High-performance caching layer for API responses and database queries
- **Response Compression**: Gzip/Brotli compression for faster response times

## 📋 Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL (via Supabase)
- Redis 6+ (optional, for caching)
- Cloudflare account with Stream enabled
- MetaMask wallet for testing

## 🔐 Security Features

- SIWE authentication for secure Web3 login
- JWT tokens for session management
- Rate limiting on all API endpoints
- Helmet.js for security headers
- Row Level Security (RLS) in Supabase
- Input validation with Zod
- Response compression with security considerations

## ⚡ Performance Features

- **Redis Caching**: Intelligent caching layer that reduces database load by 80%+
  - Cache middleware for automatic GET endpoint caching
  - Cache invalidation on data mutations
  - User-specific cache isolation
  - Configurable TTL per endpoint
  - See [CACHE.md](./CACHE.md) for detailed documentation
- **Response Compression**: Gzip/Brotli compression reduces response size by 60-80%
- **Database Indexing**: Optimized indexes on frequently queried columns
- **Connection Pooling**: Supabase connection pooling for efficient database access

## 🚀 Deployment

### Using Railway/Render/Heroku:

1. Set environment variables in platform dashboard
2. Deploy from GitHub
3. Run database migrations

## 🔄 Next Steps

1. **NFT Certificates**:
   - Smart contract for certificate NFTs
   - Minting endpoint

2. **Enhanced Features**:
   - Real-time chat for courses
   - Live streaming support
    - Assignment submissions
   - Quiz system

3. **Performance**:
   - ✅ Redis for caching (IMPLEMENTED)
   - ✅ Response compression (IMPLEMENTED)
   - CDN for static assets
   - Advanced database query optimization

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

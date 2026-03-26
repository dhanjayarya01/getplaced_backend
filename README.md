# Backend - GetPlaced API

Express.js-based REST API server for the GetPlaced platform.

## 🎯 Overview

Production-ready backend API with authentication, caching, job queues, and comprehensive endpoints for DSA problems, mock interviews, companies, and user management.

## 🛠️ Tech Stack

- **Framework**: Express.js 5
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis with IORedis client
- **Authentication**: Passport.js (Google OAuth)
- **Session Management**: Express Session
- **Job Queue**: BullMQ with Redis
- **File Storage**: Cloudinary
- **AI**: Google Generative AI

## 📁 Project Structure

```
getplaced_backend/
├── index.js              # Main application entry
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.js # MongoDB connection
│   │   ├── passport.js # Authentication config
│   │   └── redis.js    # Redis client
│   ├── controllers/     # Route controllers
│   │   ├── auth.controller.js
│   │   ├── dsa.controller.js
│   │   ├── company.controller.js
│   │   ├── interview.controller.js
│   │   └── user.controller.js
│   ├── models/          # Mongoose models
│   │   ├── User.js
│   │   ├── DSAProblem.js
│   │   ├── Submission.js
│   │   ├── Company.js
│   │   └── MockInterview.js
│   ├── routes/          # API routes
│   │   └── index.js    # Route aggregator
│   ├── middleware/      # Custom middleware
│   │   ├── auth.js     # Authentication
│   │   └── cache.js    # Caching logic
│   ├── queues/          # BullMQ queue definitions
│   │   └── dashboard.js # Bull Board UI
│   ├── services/        # Business logic
│   │   ├── ai.service.js
│   │   ├── cache.service.js
│   │   └── queue.service.js
│   └── utils/           # Utility functions
│       └── helpers.js
├── scripts/             # Migration & utility scripts
└── uploads/             # Temporary file uploads
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis server
- Google OAuth credentials

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

Server runs at [http://localhost:5000](http://localhost:5000)

## 🔐 Environment Variables

Create a `.env` file:

```bash
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/getplaced

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Session
SESSION_SECRET=your-super-secret-session-key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:3000

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# External Services
WORKER_URL=http://localhost:3001
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key

# Google AI
GOOGLE_AI_API_KEY=your_google_ai_key
```

## 📡 API Endpoints

### Authentication (`/api/auth`)

- `GET /google` - Initiate Google OAuth
- `GET /google/callback` - OAuth callback
- `GET /check` - Check authentication status
- `POST /logout` - Logout user

### DSA Problems (`/api/dsa`)

- `GET /problems` - List all problems (with filters)
- `GET /problems/:id` - Get problem details
- `POST /problems/:id/run` - Run code (test)
- `POST /problems/:id/submit` - Submit solution
- `GET /problems/:id/submissions` - Get user submissions
- `GET /interview/search` - Search problems for interview

### Companies (`/api/companies`)

- `GET /` - List all companies
- `GET /:id` - Get company details
- `GET /:id/experiences` - Get interview experiences
- `POST /:id/experiences` - Add interview experience

### Mock Interviews (`/api/mock-interviews`)

- `GET /` - List user interviews
- `POST /` - Create new interview
- `GET /:id` - Get interview details
- `POST /:id/feedback` - Submit feedback

### Users (`/api/users`)

- `GET /profile` - Get current user profile
- `PUT /profile` - Update user profile
- `GET /stats` - Get user statistics
- `GET /progress` - Get learning progress

### Admin (`/api/admin`)

- `GET /users` - List all users (admin only)
- `GET /stats` - Platform statistics
- `POST /problems` - Create DSA problem
- `PUT /problems/:id` - Update problem
- `DELETE /problems/:id` - Delete problem

### Health (`/api/health`)

- `GET /` - Health check
- `GET /status` - Detailed system status

### Queue Dashboard (`/admin/queues`)

- Bull Board UI for monitoring BullMQ queues

## 🔄 Job Queue System

Using BullMQ for asynchronous job processing:

### Code Execution Queue

```javascript
// Add job to queue
await codeExecutionQueue.add('execute', {
  problemId,
  code,
  language,
  testCases,
  userId
})

// Worker processes job asynchronously
```

Queue Features:

- **Retry Logic**: Failed jobs retry up to 3 times
- **Concurrency**: Process 5 jobs simultaneously
- **Monitoring**: Bull Board dashboard at `/admin/queues`
- **Persistence**: Jobs stored in Redis

## 💾 Caching Strategy

Multi-layer caching with Redis:

### Cache Layers

1. **TanStack Query** (Frontend) - Client-side cache
2. **Browser Cache** (Frontend) - Standard HTTP cache
3. **Redis** (Backend) - Server-side cache
4. **MongoDB** (Backend) - Database

### Cache Keys Pattern

```
user:{userId}:profile
user:{userId}:stats
dsa:problems:all
dsa:problem:{problemId}
dsa:problem:{problemId}:submissions:{userId}
company:{companyId}
```

### Cache Invalidation

- Automatic on data mutations
- Time-based expiration (TTL)
- Manual invalidation via admin panel

## 🔒 Authentication & Authorization

### Google OAuth Flow

1. User clicks "Sign in with Google"
2. Redirected to Google OAuth
3. Google returns user info
4. User created/updated in MongoDB
5. Session stored with `express-session`
6. Session cookie sent to frontend

### Session Management

- **Storage**: MongoDB (via `connect-mongo`)
- **Duration**: 24 hours
- **Security**: HttpOnly, Secure (production), SameSite

### Protected Routes

```javascript
// Middleware
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next()
  }
  res.status(401).json({ error: 'Unauthorized' })
}

// Usage
router.get('/profile', isAuthenticated, getUserProfile)
```

## 🎯 What's Next?

### Performance & Scalability

- [ ] Implement rate limiting (express-rate-limit)
- [ ] Add request/response compression (compression)
- [ ] Set up database indexing for common queries
- [ ] Implement database connection pooling
- [ ] Add horizontal scaling with PM2 cluster mode
- [ ] Set up load balancer (Nginx)

### Features

- [ ] Add more OAuth providers (GitHub, LinkedIn)
- [ ] Implement email notifications (SendGrid)
- [ ] Add webhook support for integrations
- [ ] Create GraphQL API endpoint
- [ ] Add real-time features with Socket.io
- [ ] Implement content moderation system

### Monitoring & Logging

- [ ] Add application logging (Winston)
- [ ] Implement error tracking (Sentry)
- [ ] Set up performance monitoring (New Relic)
- [ ] Create custom metrics dashboard
- [ ] Add request tracing for debugging
- [ ] Implement health check endpoints

### Security

- [ ] Add API key authentication
- [ ] Implement CSRF protection
- [ ] Add request validation with Joi/Zod
- [ ] Set up security headers (Helmet)
- [ ] Implement input sanitization
- [ ] Add SQL/NoSQL injection protection
- [ ] Set up DDoS protection

### Database

- [ ] Implement data backup strategy
- [ ] Add database migration system
- [ ] Create database seeding scripts
- [ ] Optimize slow queries
- [ ] Add full-text search (Elasticsearch)
- [ ] Implement soft deletes

### Developer Experience

- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Create Postman collection
- [ ] Add API versioning
- [ ] Implement request/response schemas
- [ ] Add integration tests
- [ ] Create development Docker setup

## 🧪 Available Scripts

```bash
# Development
npm run dev          # Start with nodemon (auto-reload)

# Production
npm start            # Start production server

# Utilities
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
```

## 📊 Database Models

### User

```javascript
{
  googleId: String,
  email: String,
  name: String,
  avatar: String,
  role: ['user', 'admin'],
  skills: [String],
  submissions: Number,
  createdAt: Date
}
```

### DSAProblem

```javascript
{
  title: String,
  slug: String,
  difficulty: ['easy', 'medium', 'hard'],
  description: String,
  examples: [Object],
  constraints: String,
  tags: [String],
  testCases: [Object],
  solutions: [Object],
  timeLimit: Number,
  memoryLimit: Number
}
```

### Submission

```javascript
{
  user: ObjectId,
  problemId: ObjectId,
  problemType: String,
  code: String,
  language: String,
  status: String,
  testResults: [Object],
  executionTime: Number,
  memoryUsed: Number,
  isAccepted: Boolean,
  createdAt: Date
}
```

## 🐛 Troubleshooting

### MongoDB Connection Issues

```bash
# Check MongoDB is running
mongosh

# Verify connection string in .env
MONGODB_URI=mongodb://localhost:27017/getplaced
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG
```

### Session Not Persisting

- Check `SESSION_SECRET` is set
- Verify MongoDB connection
- Check cookie settings in CORS config

## 📝 Code Style

- **ES6 Modules**: Use `import/export`
- **Async/Await**: Prefer over callbacks
- **Error Handling**: Try-catch blocks
- **Naming**: camelCase for variables, PascalCase for models
- **File Structure**: Group by feature

## 🔍 Monitoring

Access monitoring dashboards:

- **Bull Board**: `http://localhost:5000/admin/queues`
- **Health Check**: `http://localhost:5000/api/health`
- **Status**: `http://localhost:5000/api/health/status`

## 📞 Support

For issues or questions:

- Create an issue in the repository
- Contact: <dhanjayary20a@gmail.com>

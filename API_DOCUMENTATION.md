# GetPlaced API Documentation

## Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication
Most endpoints require authentication via session cookies (Google OAuth) or JWT tokens.

Include credentials in requests:
```javascript
fetch('http://localhost:5000/api/endpoint', {
  credentials: 'include'
})
```

---

## API Endpoints

### 🔐 Authentication (`/api/auth`)
- `GET /google` - Initiate Google OAuth
- `GET /google/callback` - OAuth callback
- `GET /current-user` - Get current user
- `POST /logout` - Logout user

### 📊 DSA Problems (`/api/dsa`)
- `GET /` - Get all DSA problems (with filters)
- `GET /:id` - Get single problem
- `POST /:id/submit` - Submit solution (protected)
- `GET /submission/:submissionId` - Get submission result (protected)
- `GET /stats` - Get user DSA statistics (protected)
- `POST /` - Create problem (admin)
- `PUT /:id` - Update problem (admin)
- `DELETE /:id` - Delete problem (admin)

### 💻 Development Problems (`/api/development`)
- `GET /` - Get all development problems (with filters)
- `GET /:id` - Get single problem
- `POST /:id/submit` - Submit solution (protected)
- `POST /:id/start-project` - Start project challenge (protected)
- `GET /stats` - Get user development statistics (protected)
- `POST /` - Create problem (admin)
- `PUT /:id` - Update problem (admin)
- `DELETE /:id` - Delete problem (admin)

### 🏢 Companies (`/api/companies`)
- `GET /` - Get all companies (with filters)
- `GET /:id` - Get company details
- `POST /:id/apply` - Apply to company (protected)
- `GET /applications/my` - Get user's applications (protected)
- `GET /applications/:applicationId` - Get application details (protected)
- `POST /applications/:applicationId/start-round` - Start interview round (protected)
- `POST /applications/:applicationId/submit-round` - Submit round (protected)
- `POST /` - Create company (admin)
- `PUT /:id` - Update company (admin)

### 🎤 Mock Interviews (`/api/mock-interviews`)
- `GET /questions` - Get all questions (with filters)
- `GET /questions/:id` - Get single question
- `POST /sessions` - Create interview session (protected)
- `GET /sessions` - Get user's sessions (protected)
- `GET /sessions/:sessionId` - Get session details (protected)
- `POST /sessions/:sessionId/start` - Start session (protected)
- `POST /sessions/:sessionId/questions/:questionIndex/answer` - Submit answer (protected)
- `POST /sessions/:sessionId/complete` - Complete session (protected)
- `POST /questions` - Create question (admin)
- `PUT /questions/:id` - Update question (admin)

### 👤 Users (`/api/users`)
- `GET /profile` - Get user profile (protected)
- `PUT /profile` - Update profile (protected)
- `POST /resume` - Upload resume (protected)
- `GET /stats` - Get user statistics (protected)
- `POST /streak` - Update daily streak (protected)
- `GET /leaderboard` - Get leaderboard (public)

---

## Query Parameters

### DSA Problems
```
GET /api/dsa?difficulty=Medium&dataStructure=Array&pattern=Two Pointers&company=Google&status=solved&page=1&limit=20
```

### Development Problems
```
GET /api/development?difficulty=Intermediate&technology=React&topic=Hooks&type=project&page=1&limit=20
```

### Companies
```
GET /api/companies?difficulty=Hard&minPackage=10&maxPackage=50&location=Bangalore&isHiring=true
```

### Mock Interviews
```
GET /api/mock-interviews/questions?type=technical&difficulty=Medium&minPackage=5&maxPackage=20
```

---

## Request/Response Examples

### Submit DSA Solution
```javascript
POST /api/dsa/123/submit

Request:
{
  "code": "function twoSum(nums, target) { ... }",
  "language": "javascript"
}

Response:
{
  "success": true,
  "message": "Solution submitted successfully",
  "data": {
    "submissionId": "abc123",
    "status": "pending"
  }
}
```

### Apply to Company
```javascript
POST /api/companies/123/apply

Request:
{
  "role": "Software Engineer",
  "resumeUrl": "https://...",
  "coverLetter": "I am interested..."
}

Response:
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "_id": "app123",
    "status": "applied",
    "currentRound": 0,
    "rounds": [...]
  }
}
```

### Create Mock Interview Session
```javascript
POST /api/mock-interviews/sessions

Request:
{
  "type": "technical",
  "difficulty": "Medium",
  "packageRange": { "min": 10, "max": 30 },
  "questionCount": 5
}

Response:
{
  "success": true,
  "message": "Mock interview session created",
  "data": {
    "_id": "session123",
    "status": "scheduled",
    "questions": [...]
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized. Please log in."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Forbidden. Admin access required."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error"
}
```

---

## Database Models

### User
- Authentication (Google OAuth + Email/Password)
- Resume & Profile
- Progress Tracking (DSA, Dev, Mock Interviews)
- Preferences & Settings

### DSAProblem
- Data Structure & Pattern Classification
- Test Cases & Solutions
- Company Tags
- Difficulty Levels

### DevelopmentProblem
- Technology Classification
- Coding & Project Types
- Docker Configuration
- Task Breakdown

### Company
- Hiring Pipeline (Multi-round)
- Roles & Packages
- Interview Questions
- Statistics

### MockInterview
- Technical & Behavioral Questions
- Package Range
- Answer Guidelines

### Submission
- Code Execution Results
- Test Case Results
- Performance Metrics

### UserProgress
- Problem Status (not-started, attempted, solved)
- Time Tracking
- Bookmarks

### CompanyApplication
- Application Status
- Round-by-round Progress
- Resume Analysis
- Final Results

### MockInterviewSession
- Session Management
- Question Responses
- AI Evaluation
- Overall Scoring

---

## Future Integrations

### Code Execution
- Judge0 API or custom execution engine
- Support for multiple languages
- Real-time execution feedback

### Docker/K8s Sandbox
- Project environment isolation
- Live browser preview
- Resource management

### AI Features
- Resume analysis
- Interview answer evaluation
- Personalized recommendations

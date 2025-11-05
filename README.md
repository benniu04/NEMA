# NEMA

A modern video streaming platform with a focus on independent cinema.

**Live Demo:** https://nemaa.netlify.app/

## Features

- 🎬 Video streaming with multiple quality options (720p, 1080p)
- 🎨 Modern, responsive UI built with React and Tailwind CSS
- 🔒 Secure admin authentication
- 💬 User comments and reviews
- 📊 View tracking and analytics
- 🚀 Optimized with CloudFront CDN
- ☁️ AWS S3 for media storage
- 🔐 JWT-based authentication
- ⚡ Rate limiting and security headers
- 🧪 Comprehensive test coverage

## Tech Stack

### Frontend
- React 19
- Vite
- Tailwind CSS
- React Router
- Axios
- Zustand (state management)

### Backend
- Node.js with Express
- MongoDB with Mongoose
- AWS S3 & CloudFront
- JWT authentication
- Bcrypt for password hashing
- Helmet for security headers
- Rate limiting

### Testing
- Jest + Supertest (Backend)
- Vitest + React Testing Library (Frontend)
- MongoDB Memory Server (test database)

## Getting Started

### Prerequisites

- Node.js 20+ 
- MongoDB
- AWS Account (for S3 & CloudFront)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/NEMA-1.git
cd NEMA-1
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd frontend
npm install
cd ..
```

4. **Set up environment variables**

Create a `.env` file in the root directory:

```env
# MongoDB
MONGO_URL=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret_min_32_characters

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=bcrypt_hashed_password

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_BUCKET_NAME=your_s3_bucket_name

# CloudFront (Optional but recommended)
CLOUDFRONT_DOMAIN=your_cloudfront_domain
CLOUDFRONT_KEY_PAIR_ID=your_key_pair_id
CLOUDFRONT_PRIVATE_KEY=your_private_key

# Server
PORT=5000
NODE_ENV=development
```

5. **Generate admin password hash**
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('yourpassword', 10).then(hash => console.log(hash));"
```

### Running the Application

**Development mode:**

1. Start backend server:
```bash
npm run dev
```

2. Start frontend dev server (in a new terminal):
```bash
cd frontend
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Running Tests

**Backend tests:**
```bash
npm test                  # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

**Frontend tests:**
```bash
cd frontend
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
```

See [TESTING.md](./TESTING.md) for comprehensive testing documentation.

## Project Structure

```
NEMA-1/
├── backend/
│   ├── config/           # Configuration files
│   ├── middleware/       # Express middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── tests/           # Test files
│   └── server.js        # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── config/      # Frontend config
│   │   └── tests/       # Test files
│   └── public/          # Static assets
├── jest.config.js       # Jest configuration
├── TESTING.md          # Testing documentation
└── README.md
```

## API Endpoints

### Public Endpoints
- `GET /api/movies` - Get all movies
- `GET /api/movies/:id` - Get single movie
- `GET /api/comments/movie/:movieId` - Get movie comments
- `GET /api/reviews/movie/:movieId` - Get movie reviews

### Protected Endpoints (Admin only)
- `POST /api/auth/login` - Admin login
- `POST /api/movies` - Create movie
- `PUT /api/movies/:id` - Update movie
- `DELETE /api/movies/:id` - Delete movie
- `POST /api/upload/video` - Upload video
- `POST /api/upload/image` - Upload image

## Security Features

- ✅ JWT authentication with httpOnly cookies
- ✅ Bcrypt password hashing
- ✅ Rate limiting (general + auth-specific)
- ✅ Helmet security headers
- ✅ CORS configuration
- ✅ Input validation and sanitization
- ✅ NoSQL injection prevention
- ✅ XSS protection

## Deployment

### Frontend (Netlify)
The frontend is configured for Netlify deployment with `netlify.toml`.

```bash
cd frontend
npm run build
# Deploy dist/ folder to Netlify
```

### Backend (Render, Heroku, etc.)
```bash
# Set environment variables in your hosting platform
# Deploy from root directory
npm start
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Write tests for your changes
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

## Testing Requirements

All new features must include:
- Unit tests for models and utilities
- Integration tests for API routes
- Component tests for UI changes
- Minimum 70% code coverage

## License

ISC

## Team

- Ben Niu
- Alex
- Michael
- Rohan

---

**Built with ❤️ for independent cinema**

# LearnX - Online Learning Platform

LearnX is a comprehensive online teaching and learning platform built with Node.js, Express, and PostgreSQL. It connects teachers with students for courses and live sessions.

## Features

- **User Management**: Registration, authentication, and profile management for students and teachers
- **Course Marketplace**: Browse, create, and enroll in courses
- **Live Sessions**: Schedule and book 1-on-1 or group teaching sessions
- **Wallet System**: Integrated payment system for course purchases and teacher earnings
- **Todo Management**: Task tracking for learning goals
- **Messaging**: Real-time chat between users
- **Reviews & Ratings**: Feedback system for courses, sessions, and teachers
- **Admin Dashboard**: Platform management and analytics

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript with responsive design
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)

## Project Structure

```
learnx/
├── database/               # Database setup and migrations
├── learnx-frontend/        # Frontend HTML/CSS/JS files
├── middleware/             # Express middleware (auth, etc.)
├── routes/                 # API route handlers
├── .env                    # Environment variables (create from .env.example)
├── package.json            # Project dependencies
├── server.js               # Main application entry point
└── README.md               # Project documentation
```

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- PostgreSQL (v12+)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd learnx
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the example:
   ```
   # Database Configuration
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=learnx
   DB_PASSWORD=your_password
   DB_PORT=5432

   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # JWT Configuration
   JWT_SECRET=your_secure_secret_key
   JWT_EXPIRES_IN=7d
   ```

4. Create the PostgreSQL database:
   ```
   createdb learnx
   ```

5. Initialize the database:
   ```
   npm run init-db
   ```

6. Start the server:
   ```
   npm run dev
   ```

7. Access the application:
   ```
   http://localhost:5000
   ```

## API Endpoints

The API follows RESTful conventions with the following main endpoints:

- `/api/auth/*` - Authentication routes (login, register)
- `/api/users/*` - User management
- `/api/courses/*` - Course management
- `/api/sessions/*` - Session scheduling and booking
- `/api/todo/*` - Todo management
- `/api/wallet/*` - Financial transactions
- `/api/chat/*` - Messaging
- `/api/reviews/*` - User reviews
- `/api/admin/*` - Admin functions

## Development

To start the development server with hot-reloading:

```
npm run dev
```

## License

MIT 
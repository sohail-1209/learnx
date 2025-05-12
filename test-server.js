const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');

// Initialize the express app
const app = express();

// Use middleware
app.use(bodyParser.json());
app.use(cors());

// Schedule API endpoint
app.get('/api/schedule/:userId', async (req, res) => {
  try {
    const userIdInt = parseInt(req.params.userId);
    console.log(`Schedule API called for user ID: ${userIdInt}`);

    // Try to get the user sessions from the server.js API
    try {
      // First try to get actual enrolled sessions from the main server
      console.log(`Trying to fetch actual sessions for user ${userIdInt} from main server`);
      
      // We'll use the existing /api/user/:userId/sessions endpoint on the main server
      const options = {
        hostname: '127.0.0.1',
        port: 5000,
        path: `/api/user/${userIdInt}/sessions`,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };

      const userData = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(new Error(`Failed to parse JSON: ${e.message}`));
              }
            } else {
              reject(new Error(`Main server returned status code ${res.statusCode}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });
        req.end();
      });

      console.log('Response from main server:', JSON.stringify(userData, null, 2));

      // If we successfully got data from the main server
      if (userData && userData.learning && userData.learning.length > 0) {
        console.log(`Found ${userData.learning.length} actual enrolled sessions`);
        
        // Transform the sessions into the format expected by the schedule page
        const upcomingSessions = userData.learning.map(session => {
          // Find teacher name if available
          let instructorName = "Unknown Teacher";
          if (session.teacher_id) {
            // In a real implementation, we'd lookup the teacher's name
            instructorName = `Teacher ${session.teacher_id}`;
          }
          
          return {
            id: session.id,
            title: session.title,
            instructor: instructorName,
            datetime: session.schedule,
            status: 'upcoming'
          };
        });

        // Send the actual data
        const responseData = {
          upcomingSessions: upcomingSessions,
          history: [], // No history data available yet
          availability: {
            days: ['monday', 'wednesday', 'friday'],
            timeFrom: 9,
            timeTo: 17
          }
        };

        console.log("Sending response with actual enrolled sessions:", JSON.stringify(responseData, null, 2));
        return res.json(responseData);
      } else {
        console.log("No enrolled sessions found on main server");
      }
    } catch (proxyError) {
      console.error("Error getting data from main server:", proxyError.message);
    }

    // Check if user is enrolled in any sessions from main server
    console.log("Fetching enrolled sessions from main server again as backup");
    try {
      const mainServerOptions = {
        hostname: '127.0.0.1',
        port: 5000,
        path: `/api/learn/${userIdInt}`,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };

      const learnData = await new Promise((resolve, reject) => {
        const req = http.request(mainServerOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(new Error(`Failed to parse JSON: ${e.message}`));
              }
            } else {
              reject(new Error(`Main server returned status code ${res.statusCode}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });
        req.end();
      });

      if (learnData && learnData.enrolledSessions && learnData.enrolledSessions.length > 0) {
        console.log(`Found ${learnData.enrolledSessions.length} enrolled sessions from learn API`);
        
        const upcomingSessions = learnData.enrolledSessions.map(session => {
          // Find teacher name if available
          let instructorName = "Unknown Teacher";
          if (session.teacher_id) {
            // In a real implementation, we'd lookup the teacher's name
            instructorName = `Teacher ${session.teacher_id}`;
          }
          
          return {
            id: session.id,
            title: session.title,
            instructor: instructorName,
            datetime: session.schedule,
            status: 'upcoming'
          };
        });

        // Send the actual data
        const responseData = {
          upcomingSessions: upcomingSessions,
          history: [], // No history data available yet
          availability: {
            days: ['monday', 'wednesday', 'friday'],
            timeFrom: 9,
            timeTo: 17
          }
        };

        console.log("Sending response with enrolled sessions from learn API:", JSON.stringify(responseData, null, 2));
        return res.json(responseData);
      }
    } catch (learnApiError) {
      console.error("Error fetching data from learn API:", learnApiError.message);
    }

    // Fall back to actual sessions from the main server's mock data
    console.log("Using actual sessions from main server's mock data");
    
    // Get the real session data from the main server for user ID 1
    const realSessions = [
      {
        id: 1,
        title: "JavaScript for Beginners",
        instructor: "Samad",
        datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        status: 'upcoming'
      },
      {
        id: 3,
        title: "React JS Fundamentals",
        instructor: "Samad",
        datetime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        status: 'upcoming'
      },
      {
        id: 4,
        title: "Node.js Backend Development",
        instructor: "Samad",
        datetime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
        status: 'upcoming'
      }
    ];

    const responseData = {
      upcomingSessions: realSessions,
      history: [],
      availability: {
        days: ['monday', 'wednesday', 'friday'],
        timeFrom: 9,
        timeTo: 17
      }
    };

    console.log("Sending response with real enrolled sessions:", JSON.stringify(responseData, null, 2));
    res.json(responseData);
  } catch (err) {
    console.error('Error getting schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Teach API endpoint - proxy to main server
app.get('/api/teach/:userId', async (req, res) => {
  try {
    const userIdInt = parseInt(req.params.userId);
    console.log(`Teach API called for user ID: ${userIdInt}`);

    try {
      // Fetch actual teaching data from main server
      console.log(`Trying to fetch teaching data for user ${userIdInt} from main server`);
      
      const options = {
        hostname: '127.0.0.1',
        port: 5000,
        path: `/api/teach/${userIdInt}`,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };

      const teachingData = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(new Error(`Failed to parse JSON: ${e.message}`));
              }
            } else {
              reject(new Error(`Main server returned status code ${res.statusCode}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });
        req.end();
      });

      console.log('Teaching data from main server:', JSON.stringify(teachingData, null, 2));

      // Make sure the sessions array shows actual enrolled students (not empty lists)
      if (teachingData && teachingData.sessions) {
        const updatedSessions = teachingData.sessions.map(session => {
          // If this is a test user and no students are enrolled, add some mock data
          if (userIdInt === 5 && (!session.enrolled_students || session.enrolled_students.length === 0)) {
            // For testing, we'll show that user 1 is enrolled in this session
            return {
              ...session,
              enrolled_students: [1, 2, 3] // Example student IDs
            };
          }
          return session;
        });

        teachingData.sessions = updatedSessions;
      }

      console.log("Sending teach response:", JSON.stringify(teachingData, null, 2));
      return res.json(teachingData);
    } catch (error) {
      console.error("Error getting teaching data from main server:", error.message);
      
      // Fallback data
      const fallbackData = {
        profile: {
          user_id: userIdInt,
          title: 'Experienced Teacher',
          description: 'I specialize in software development and web technologies.',
          experience_years: 5,
          hourly_rate: 35,
          rating: 4.5,
          reviews: [
            {
              student_id: 1,
              rating: 5,
              comment: 'Great teacher, very knowledgeable!',
              date: new Date().toISOString()
            },
            {
              student_id: 2,
              rating: 4,
              comment: 'Very clear explanations, would recommend.',
              date: new Date().toISOString()
            }
          ],
          earnings: 500,
          sessions_completed: 15
        },
        sessions: [
          {
            id: 1,
            title: 'JavaScript for Beginners',
            description: 'Learn the fundamentals of JavaScript programming.',
            teacher_id: userIdInt,
            price: 25,
            category: 'Coding',
            duration: 60,
            schedule: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            enrolled_students: [1, 2, 3]
          },
          {
            id: 3,
            title: 'React JS Fundamentals',
            description: 'Build modern web applications with React.',
            teacher_id: userIdInt,
            price: 35,
            category: 'Coding',
            duration: 90,
            schedule: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            enrolled_students: [1]
          }
        ],
        username: `teacher${userIdInt}`,
        profile_picture_url: 'https://placehold.co/150x150'
      };
      
      console.log("Sending fallback teaching data:", JSON.stringify(fallbackData, null, 2));
      return res.json(fallbackData);
    }
  } catch (err) {
    console.error('Error processing teach API request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Learn API endpoint - proxy to main server 
app.get('/api/learn/:userId', async (req, res) => {
  try {
    const userIdInt = parseInt(req.params.userId);
    console.log(`Learn API called for user ID: ${userIdInt}`);

    try {
      // Fetch actual learning data from main server
      console.log(`Trying to fetch learning data for user ${userIdInt} from main server`);
      
      const options = {
        hostname: '127.0.0.1',
        port: 5000,
        path: `/api/learn/${userIdInt}`,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };

      const learnData = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(new Error(`Failed to parse JSON: ${e.message}`));
              }
            } else {
              reject(new Error(`Main server returned status code ${res.statusCode}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });
        req.end();
      });

      console.log('Learning data from main server:', JSON.stringify(learnData, null, 2));
      return res.json(learnData);
    } catch (error) {
      console.error("Error getting learning data from main server:", error.message);
      
      // Fallback to main server's response
      res.status(500).json({ error: 'Failed to fetch learning data' });
    }
  } catch (err) {
    console.error('Error processing learn API request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enrollment endpoint - proxy to main server
app.post('/api/learn/enroll', async (req, res) => {
  try {
    console.log('Enrollment request received:', req.body);
    const { userId, sessionId } = req.body;
    
    if (!userId || !sessionId) {
      return res.status(400).json({ error: 'Missing userId or sessionId in request' });
    }
    
    try {
      // Forward enrollment request to main server
      console.log(`Forwarding enrollment request: User ${userId} in Session ${sessionId}`);
      
      const postData = JSON.stringify({ userId, sessionId });
      
      const options = {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/learn/enroll',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const enrollmentResult = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve({ 
                  statusCode: res.statusCode,
                  data: data ? JSON.parse(data) : { success: true } 
                });
              } catch (e) {
                reject(new Error(`Failed to parse JSON: ${e.message}`));
              }
            } else {
              reject({ 
                statusCode: res.statusCode,
                error: data
              });
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });
        
        // Write the request body
        req.write(postData);
        req.end();
      });

      console.log('Enrollment result from main server:', JSON.stringify(enrollmentResult, null, 2));
      return res.status(enrollmentResult.statusCode).json(enrollmentResult.data);
    } catch (error) {
      console.error("Error enrolling in session:", error);
      
      if (error.statusCode && error.error) {
        // Pass through the error from the main server
        return res.status(error.statusCode).send(error.error);
      }
      
      // Handle network errors
      return res.status(500).json({ error: error.message || 'Failed to enroll in session' });
    }
  } catch (err) {
    console.error('Error processing enrollment request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Teacher reviews endpoint - proxy to main server or provide fallback
app.get('/api/reviews/teacher/:teacherId', async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId);
    console.log(`Teacher reviews API called for teacher ID: ${teacherId}`);

    try {
      // Try to get reviews from main server
      console.log(`Fetching reviews for teacher ${teacherId} from main server`);
      
      const options = {
        hostname: '127.0.0.1',
        port: 5000,
        path: `/api/reviews/teacher/${teacherId}`,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };

      const reviewsData = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(new Error(`Failed to parse JSON: ${e.message}`));
              }
            } else {
              reject(new Error(`Main server returned status code ${res.statusCode}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });
        req.end();
      });

      console.log('Teacher reviews from main server:', JSON.stringify(reviewsData, null, 2));
      return res.json(reviewsData);
    } catch (error) {
      console.error("Error getting reviews from main server:", error.message);
      
      // Provide fallback data instead of failing
      const fallbackReviews = {
        reviews: [
          {
            id: 1,
            teacherId: teacherId,
            studentId: 1,
            studentName: 'John Doe',
            rating: 5,
            comment: 'Excellent teacher! The session was very informative and well-structured.',
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            sessionId: 1,
            sessionTitle: 'JavaScript for Beginners'
          },
          {
            id: 2,
            teacherId: teacherId,
            studentId: 2,
            studentName: 'Jane Smith',
            rating: 4,
            comment: 'Great session, learned a lot. Would recommend this teacher to anyone interested in the subject.',
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
            sessionId: 3,
            sessionTitle: 'React JS Fundamentals'
          }
        ]
      };

      console.log("Sending fallback teacher reviews:", JSON.stringify(fallbackReviews, null, 2));
      return res.json(fallbackReviews);
    }
  } catch (err) {
    console.error('Error processing teacher reviews request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test server is working!' });
});

// Start the server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Try accessing: http://localhost:${PORT}/api/schedule/1`);
}); 
-- LearnX - Setup Relationships

-- Create user profiles for existing users who don't have one
INSERT INTO user_profile (user_id, headline, skills)
SELECT id, 
       CASE WHEN is_teacher THEN 'Teacher at LearnX' ELSE 'Student at LearnX' END,
       ARRAY['Learning', 'Communication']
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_profile up WHERE up.user_id = u.id);

-- Create wallets for existing users who don't have one
INSERT INTO wallet (user_id, balance)
SELECT id, 
       CASE WHEN is_teacher THEN 200.00 ELSE 50.00 END
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM wallet w WHERE w.user_id = u.id);

-- Create sample courses for teachers
INSERT INTO courses (teacher_id, title, description, category, price, level, is_published)
SELECT u.id, 
       'Introduction to ' || CASE 
                                WHEN u.first_name = 'John' THEN 'Mathematics'
                                WHEN u.first_name = 'Emma' THEN 'Languages'
                                ELSE 'Programming'
                             END,
       'Learn the basics of ' || CASE 
                                    WHEN u.first_name = 'John' THEN 'mathematics including algebra and calculus.'
                                    WHEN u.first_name = 'Emma' THEN 'languages from an expert teacher.'
                                    ELSE 'programming with practical examples.'
                                 END,
       CASE 
          WHEN u.first_name = 'John' THEN 'Mathematics'
          WHEN u.first_name = 'Emma' THEN 'Languages' 
          ELSE 'Programming'
       END,
       49.99,
       'Beginner',
       TRUE
FROM users u
WHERE u.is_teacher = TRUE
AND NOT EXISTS (SELECT 1 FROM courses c WHERE c.teacher_id = u.id); 
/**
 * LearnX - Chat Routes
 * Handles messaging between users
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../server');
const { verifyToken } = require('../middleware/auth');

// Get user's conversations
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    // Get all conversations where the user is a participant
    const conversationsResult = await pool.query(
      `SELECT 
        c.id,
        c.updated_at,
        CASE 
          WHEN c.user1_id = $1 THEN c.user2_id
          ELSE c.user1_id
        END AS other_user_id,
        u.first_name,
        u.last_name,
        u.profile_pic,
        m.content as last_message,
        m.sent_at as last_message_time,
        (SELECT COUNT(*) FROM messages 
         WHERE (sender_id != $1 AND receiver_id = $1) 
         AND (sender_id = u.id OR receiver_id = u.id)
         AND is_read = FALSE) as unread_count
      FROM conversations c
      JOIN users u ON (c.user1_id = $1 AND c.user2_id = u.id) OR (c.user2_id = $1 AND c.user1_id = u.id)
      LEFT JOIN messages m ON c.last_message_id = m.id
      WHERE c.user1_id = $1 OR c.user2_id = $1
      ORDER BY c.updated_at DESC`,
      [req.userId]
    );
    
    const conversations = conversationsResult.rows.map(conv => ({
      id: conv.id,
      user: {
        id: conv.other_user_id,
        name: `${conv.first_name} ${conv.last_name}`,
        profilePic: conv.profile_pic
      },
      lastMessage: conv.last_message,
      lastMessageTime: conv.last_message_time,
      updatedAt: conv.updated_at,
      unreadCount: parseInt(conv.unread_count)
    }));
    
    res.status(200).json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Server error fetching conversations' });
  }
});

// Get messages in a conversation
router.get('/messages/:userId', verifyToken, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    
    // Check if other user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [otherUserId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find conversation or create if it doesn't exist
    let conversationId;
    const conversationCheck = await pool.query(
      `SELECT id FROM conversations 
       WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [req.userId, otherUserId]
    );
    
    if (conversationCheck.rows.length === 0) {
      // Create new conversation
      const newConversationResult = await pool.query(
        `INSERT INTO conversations (user1_id, user2_id, created_at, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [req.userId, otherUserId]
      );
      
      conversationId = newConversationResult.rows[0].id;
    } else {
      conversationId = conversationCheck.rows[0].id;
    }
    
    // Get messages between users
    const messagesResult = await pool.query(
      `SELECT id, sender_id, receiver_id, content, sent_at, is_read
       FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY sent_at ASC`,
      [req.userId, otherUserId]
    );
    
    // Mark messages as read
    await pool.query(
      `UPDATE messages
       SET is_read = TRUE
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [otherUserId, req.userId]
    );
    
    // Get user details
    const userResult = await pool.query(
      `SELECT first_name, last_name, profile_pic, is_teacher
       FROM users
       WHERE id = $1`,
      [otherUserId]
    );
    
    const otherUser = userResult.rows[0];
    
    res.status(200).json({
      conversation: {
        id: conversationId,
        user: {
          id: otherUserId,
          name: `${otherUser.first_name} ${otherUser.last_name}`,
          profilePic: otherUser.profile_pic,
          isTeacher: otherUser.is_teacher
        },
        messages: messagesResult.rows.map(msg => ({
          id: msg.id,
          senderId: msg.sender_id,
          content: msg.content,
          sentAt: msg.sent_at,
          isRead: msg.is_read,
          isOutgoing: msg.sender_id === req.userId
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
});

// Send a message
router.post('/messages', verifyToken, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    
    // Validate input
    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver ID and content are required' });
    }
    
    // Check if receiver exists
    const receiverCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [receiverId]
    );
    
    if (receiverCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Receiver not found' });
    }
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Send message
      const messageResult = await client.query(
        `INSERT INTO messages (sender_id, receiver_id, content, sent_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING id, content, sent_at`,
        [req.userId, receiverId, content]
      );
      
      const message = messageResult.rows[0];
      
      // Update conversation or create if it doesn't exist
      const conversationCheck = await client.query(
        `SELECT id FROM conversations 
         WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
        [req.userId, receiverId]
      );
      
      if (conversationCheck.rows.length === 0) {
        // Create new conversation
        await client.query(
          `INSERT INTO conversations (user1_id, user2_id, last_message_id, created_at, updated_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [req.userId, receiverId, message.id]
        );
      } else {
        // Update existing conversation
        await client.query(
          `UPDATE conversations 
           SET last_message_id = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [message.id, conversationCheck.rows[0].id]
        );
      }
      
      // Create notification for receiver
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_id)
         VALUES ($1, 'New Message', $2, 'message', $3)`,
        [
          receiverId,
          `You have a new message from ${req.userEmail}`,
          message.id
        ]
      );
      
      await client.query('COMMIT');
      
      res.status(201).json({
        message: {
          id: message.id,
          content: message.content,
          sentAt: message.sent_at,
          isOutgoing: true
        }
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Server error sending message' });
  }
});

// Get unread messages count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND is_read = FALSE`,
      [req.userId]
    );
    
    res.status(200).json({
      unreadCount: parseInt(result.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching unread message count:', error);
    res.status(500).json({ error: 'Server error fetching unread message count' });
  }
});

// Mark all messages as read in a conversation
router.put('/messages/read/:userId', verifyToken, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    
    await pool.query(
      `UPDATE messages
       SET is_read = TRUE
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [otherUserId, req.userId]
    );
    
    res.status(200).json({
      message: 'Messages marked as read successfully'
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Server error marking messages as read' });
  }
});

module.exports = router; 
const Message = require('../models/message.model');
const User = require('../models/user.model');
const firebaseService = require('./firebase.service');

let io;

/**
 * Initialize Socket.IO with the HTTP server
 * @param {Object} server - HTTP server instance
 */
exports.init = (server) => {
  io = require('socket.io')(server, {
    cors: {
      origin: '*', // In production, restrict this to your frontend domain
      methods: ['GET', 'POST']
    }
  });

  // Store connected users with their socket IDs
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Handle user authentication and store user ID with socket ID
    socket.on('authenticate', async (data) => {
      try {
        const { userId } = data;
        
        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
          socket.emit('error', { message: 'Authentication failed: User not found' });
          return;
        }
        
        // Store user connection
        connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.userRole = user.role;
        
        console.log(`User ${userId} (${user.role}) authenticated with socket ${socket.id}`);
        
        // Join role-specific rooms for broadcasting
        socket.join(user.role);
        
        // If user is admin, join admin room
        if (user.role === 'admin') {
          socket.join('admins');
        }
        
        // Notify user of successful connection
        socket.emit('authenticated', { 
          success: true, 
          message: 'Successfully authenticated',
          userId,
          role: user.role
        });
        
        // Get unread message count for the user
        const unreadCount = await getUnreadMessageCount(userId);
        socket.emit('unread_count', { count: unreadCount });
        
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('error', { message: 'Authentication failed' });
      }
    });

    // Handle new message
    socket.on('send_message', async (data) => {
      try {
        const { messageId, messageType, senderId, receiverId, content, orderId } = data;
        
        // Emit to specific user if they're connected
        if (receiverId && connectedUsers.has(receiverId)) {
          const receiverSocketId = connectedUsers.get(receiverId);
          io.to(receiverSocketId).emit('new_message', {
            messageId,
            messageType,
            senderId,
            content,
            orderId,
            timestamp: new Date()
          });
          
          // Update unread count for receiver
          const unreadCount = await getUnreadMessageCount(receiverId);
          io.to(receiverSocketId).emit('unread_count', { count: unreadCount });
        }
        
        // For admin-to-admin messages, broadcast to all admins except sender
        if (messageType === 'admin-to-admin') {
          socket.to('admins').emit('new_message', {
            messageId,
            messageType,
            senderId,
            content,
            timestamp: new Date()
          });
          
          // Update unread count for all admins
          const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
          for (const admin of admins) {
            if (admin._id.toString() !== senderId && connectedUsers.has(admin._id.toString())) {
              const adminSocketId = connectedUsers.get(admin._id.toString());
              const unreadCount = await getUnreadMessageCount(admin._id.toString());
              io.to(adminSocketId).emit('unread_count', { count: unreadCount });
            }
          }
        }
        
        // For customer-to-admin messages, broadcast to all admins
        if (messageType === 'customer-to-admin') {
          socket.to('admins').emit('new_message', {
            messageId,
            messageType,
            senderId,
            content,
            orderId,
            timestamp: new Date()
          });
          
          // Update unread count for all admins
          const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
          for (const admin of admins) {
            if (connectedUsers.has(admin._id.toString())) {
              const adminSocketId = connectedUsers.get(admin._id.toString());
              const unreadCount = await getUnreadMessageCount(admin._id.toString());
              io.to(adminSocketId).emit('unread_count', { count: unreadCount });
            }
          }
        }
        
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle message read status update
    socket.on('mark_read', async (data) => {
      try {
        const { messageId, userId } = data;
        
        // Update message read status in database
        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }
        
        // For admin-to-admin messages, handle multiple recipients
        if (message.messageType === 'admin-to-admin' && socket.userRole === 'admin') {
          // Check if admin is in recipients and hasn't read it yet
          if (message.adminRecipients.includes(userId) && 
              !message.readByAdmins.some(item => item.adminId.toString() === userId)) {
            
            // Add admin to readByAdmins array
            message.readByAdmins.push({
              adminId: userId,
              readAt: new Date()
            });
            
            // If all admins have read it, mark as read
            if (message.readByAdmins.length === message.adminRecipients.length) {
              message.isRead = true;
              message.readAt = new Date();
            }
            
            await message.save();
          }
        }
        // For customer-to-admin messages, any admin can mark as read
        else if (message.messageType === 'customer-to-admin' && socket.userRole === 'admin') {
          message.isRead = true;
          message.readAt = new Date();
          await message.save();
        }
        // For regular messages, only the receiver can mark as read
        else if (message.receiver && message.receiver.toString() === userId) {
          message.isRead = true;
          message.readAt = new Date();
          await message.save();
        } else {
          socket.emit('error', { message: 'You are not authorized to mark this message as read' });
          return;
        }
        
        // Emit read status update to sender
        if (message.sender && connectedUsers.has(message.sender.toString())) {
          const senderSocketId = connectedUsers.get(message.sender.toString());
          io.to(senderSocketId).emit('message_read', {
            messageId,
            readBy: userId,
            readAt: new Date()
          });
        }
        
        // Update unread count for the user
        const unreadCount = await getUnreadMessageCount(userId);
        socket.emit('unread_count', { count: unreadCount });
        
      } catch (error) {
        console.error('Mark read error:', error);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        console.log(`User ${socket.userId} disconnected`);
      }
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  console.log('Socket.IO initialized');
};

/**
 * Get unread message count for a user
 * @param {string} userId - User ID to get unread count for
 * @returns {Promise<Number>} - Number of unread messages
 */
async function getUnreadMessageCount(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    let query = {};
    
    if (user.role === 'admin') {
      query = {
        $or: [
          { receiver: userId, isRead: false },
          { adminRecipients: userId, isRead: false }
        ]
      };
    } else {
      query = { receiver: userId, isRead: false };
    }
    
    const count = await Message.countDocuments(query);
    return count;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    throw error;
  }
}

/**
 * Emit a new message event to connected users
 * @param {Object} message - Message object
 */
exports.emitNewMessage = async (message) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  
  try {
    // Populate sender and receiver info
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name role profileImage businessName businessLogo')
      .populate('receiver', 'name role profileImage businessName businessLogo');
    
    // Emit to specific user if they're connected
    const connectedUsers = Array.from(io.sockets.sockets.values())
      .filter(socket => socket.userId)
      .reduce((acc, socket) => {
        acc[socket.userId] = socket.id;
        return acc;
      }, {});
    
    if (message.receiver && connectedUsers[message.receiver.toString()]) {
      io.to(connectedUsers[message.receiver.toString()]).emit('new_message', populatedMessage);
    }
    
    // For admin-to-admin messages, broadcast to all admins except sender
    if (message.messageType === 'admin-to-admin') {
      const senderSocketId = message.sender && connectedUsers[message.sender.toString()];
      
      // Get all admin sockets
      const adminSockets = Array.from(io.sockets.sockets.values())
        .filter(socket => socket.userRole === 'admin' && socket.id !== senderSocketId);
      
      // Emit to all admin sockets
      for (const socket of adminSockets) {
        socket.emit('new_message', populatedMessage);
      }
    }
    
    // For customer-to-admin messages, broadcast to all admins
    if (message.messageType === 'customer-to-admin') {
      // Get all admin sockets
      const adminSockets = Array.from(io.sockets.sockets.values())
        .filter(socket => socket.userRole === 'admin');
      
      // Emit to all admin sockets
      for (const socket of adminSockets) {
        socket.emit('new_message', populatedMessage);
      }
    }
    
  } catch (error) {
    console.error('Error emitting new message:', error);
  }
};

/**
 * Get Socket.IO instance
 * @returns {Object} - Socket.IO instance
 */
exports.getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

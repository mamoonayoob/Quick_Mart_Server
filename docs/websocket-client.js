/**
 * QuickMart WebSocket Client
 * 
 * This file provides a reference implementation for connecting to the QuickMart WebSocket server
 * for real-time messaging. It can be used in the frontend application to establish a WebSocket
 * connection and handle various events.
 */

// Import Socket.IO client library in your frontend application
// import io from 'socket.io-client';

class QuickMartSocketClient {
  constructor(baseUrl = 'http://localhost:5000') {
    this.socket = null;
    this.baseUrl = baseUrl;
    this.isConnected = false;
    this.userId = null;
    this.userRole = null;
    this.messageHandlers = [];
    this.unreadCountHandlers = [];
    this.messageReadHandlers = [];
    this.errorHandlers = [];
  }

  /**
   * Connect to the WebSocket server and authenticate the user
   * @param {string} userId - User ID to authenticate with
   * @param {string} token - JWT token for authentication (optional)
   * @returns {Promise} - Resolves when connected and authenticated
   */
  connect(userId, token = null) {
    return new Promise((resolve, reject) => {
      try {
        // Connect to the WebSocket server
        this.socket = io(this.baseUrl, {
          auth: token ? { token } : undefined,
          transports: ['websocket', 'polling']
        });

        // Handle connection event
        this.socket.on('connect', () => {
          console.log('Connected to WebSocket server');
          this.isConnected = true;
          
          // Authenticate the user
          this.socket.emit('authenticate', { userId, token });
        });

        // Handle authentication response
        this.socket.on('authenticated', (data) => {
          if (data.success) {
            console.log('Authentication successful');
            this.userId = data.userId;
            this.userRole = data.role;
            resolve(data);
          } else {
            console.error('Authentication failed:', data.message);
            reject(new Error(data.message || 'Authentication failed'));
          }
        });

        // Handle new message event
        this.socket.on('new_message', (message) => {
          console.log('New message received:', message);
          this.messageHandlers.forEach(handler => handler(message));
        });

        // Handle unread count event
        this.socket.on('unread_count', (data) => {
          console.log('Unread count updated:', data.count);
          this.unreadCountHandlers.forEach(handler => handler(data.count));
        });

        // Handle message read event
        this.socket.on('message_read', (data) => {
          console.log('Message read:', data);
          this.messageReadHandlers.forEach(handler => handler(data));
        });

        // Handle error event
        this.socket.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.errorHandlers.forEach(handler => handler(error));
          reject(error);
        });

        // Handle disconnect event
        this.socket.on('disconnect', () => {
          console.log('Disconnected from WebSocket server');
          this.isConnected = false;
        });

      } catch (error) {
        console.error('Error connecting to WebSocket server:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.userId = null;
      this.userRole = null;
    }
  }

  /**
   * Send a message to another user
   * @param {Object} messageData - Message data
   * @returns {Promise} - Resolves when message is sent
   */
  sendMessage(messageData) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      this.socket.emit('send_message', messageData);
      resolve();
    });
  }

  /**
   * Mark a message as read
   * @param {string} messageId - Message ID to mark as read
   * @returns {Promise} - Resolves when message is marked as read
   */
  markMessageAsRead(messageId) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      this.socket.emit('mark_read', { messageId, userId: this.userId });
      resolve();
    });
  }

  /**
   * Add a handler for new messages
   * @param {Function} handler - Handler function
   */
  onNewMessage(handler) {
    this.messageHandlers.push(handler);
  }

  /**
   * Add a handler for unread count updates
   * @param {Function} handler - Handler function
   */
  onUnreadCountUpdate(handler) {
    this.unreadCountHandlers.push(handler);
  }

  /**
   * Add a handler for message read events
   * @param {Function} handler - Handler function
   */
  onMessageRead(handler) {
    this.messageReadHandlers.push(handler);
  }

  /**
   * Add a handler for errors
   * @param {Function} handler - Handler function
   */
  onError(handler) {
    this.errorHandlers.push(handler);
  }
}

// Usage example:
/*
const socketClient = new QuickMartSocketClient('http://localhost:5000');

// Connect and authenticate
socketClient.connect('user123')
  .then(() => {
    console.log('Connected and authenticated');
    
    // Send a message
    socketClient.sendMessage({
      messageType: 'customer-to-vendor',
      senderId: 'user123',
      receiverId: 'vendor456',
      content: 'Hello, I have a question about my order',
      orderId: 'order789'
    });
    
    // Mark a message as read
    socketClient.markMessageAsRead('message123');
  })
  .catch(error => {
    console.error('Connection error:', error);
  });

// Handle new messages
socketClient.onNewMessage(message => {
  console.log('New message:', message);
  // Update UI with new message
});

// Handle unread count updates
socketClient.onUnreadCountUpdate(count => {
  console.log('Unread count:', count);
  // Update UI with new unread count
});

// Handle message read events
socketClient.onMessageRead(data => {
  console.log('Message read:', data);
  // Update UI to show message as read
});

// Handle errors
socketClient.onError(error => {
  console.error('Error:', error);
  // Show error to user
});

// Disconnect when done
// socketClient.disconnect();
*/

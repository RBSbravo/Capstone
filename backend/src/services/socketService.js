const socketIO = require('socket.io');
let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    // Add user authentication logic here
    next();
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join user's room for private notifications
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

// Event emitters
const emitTaskUpdate = (task) => {
  if (io) {
    io.emit('task_update', task);
  }
};

const emitCommentUpdate = (comment) => {
  if (io) {
    io.emit('commentUpdate', comment);
  }
};

const emitPerformanceUpdate = (performance) => {
  if (io) {
    io.emit('performanceUpdate', performance);
  }
};

const emitNotification = (userId, notification) => {
  if (io) {
    io.to(`user_${userId}`).emit('notification', {
      type: 'NEW_NOTIFICATION',
      data: notification
    });
  }
};

const emitTaskStatusChange = (taskId, status) => {
  if (io) {
    io.emit(`task_${taskId}`, {
      type: 'STATUS_CHANGE',
      data: { status }
    });
  }
};

const emitTaskAssignment = (taskId, assignedToId) => {
  if (io) {
    io.emit(`task_${taskId}`, {
      type: 'ASSIGNMENT_CHANGE',
      data: { assignedToId }
    });
  }
};

const emitNewComment = (comment) => {
  if (io) {
    io.emit('new_comment', {
      id: comment.id,
      content: comment.content,
      taskId: comment.taskId,
      authorId: comment.authorId,
      createdAt: comment.createdAt
    });
  }
};

module.exports = {
  initializeSocket,
  emitTaskUpdate,
  emitCommentUpdate,
  emitPerformanceUpdate,
  emitNotification,
  emitTaskStatusChange,
  emitTaskAssignment,
  emitNewComment
}; 
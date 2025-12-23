import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import logger from './logger.js';

let io: SocketIOServer | null = null;

export const initializeSocket = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: [
        'https://nemaa.netlify.app',
        'https://nema-nc78.onrender.com',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
      ],
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join user's personal room for notifications
    socket.on('join-user', (userId: string) => {
      socket.join(`user:${userId}`);
      logger.info(`Socket ${socket.id} joined user room: user:${userId}`);
    });

    // Leave user's personal room
    socket.on('leave-user', (userId: string) => {
      socket.leave(`user:${userId}`);
      logger.info(`Socket ${socket.id} left user room: user:${userId}`);
    });

    // Join a movie room when user views a video
    socket.on('join-movie', (movieId: string) => {
      socket.join(`movie:${movieId}`);
      logger.info(`Socket ${socket.id} joined room movie:${movieId}`);
    });

    // Leave a movie room
    socket.on('leave-movie', (movieId: string) => {
      socket.leave(`movie:${movieId}`);
      logger.info(`Socket ${socket.id} left room movie:${movieId}`);
    });

    // Join a conversation room for real-time messaging
    socket.on('join-conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      logger.info(`Socket ${socket.id} joined conversation:${conversationId}`);
    });

    // Leave a conversation room
    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      logger.info(`Socket ${socket.id} left conversation:${conversationId}`);
    });

    // Typing indicator - start
    socket.on('typing:start', (data: { conversationId: string; userId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('typing:start', {
        conversationId: data.conversationId,
        userId: data.userId
      });
    });

    // Typing indicator - stop
    socket.on('typing:stop', (data: { conversationId: string; userId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('typing:stop', {
        conversationId: data.conversationId,
        userId: data.userId
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized! Call initializeSocket first.');
  }
  return io;
};

export default { initializeSocket, getIO };

import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ENV_VARS } from './envVars.js';
import { Conversation } from '../models/conversation.model.js';
import logger from './logger.js';
import type { JWTPayload } from '../types/index.js';

let io: SocketIOServer | null = null;

const getUser = (socket: Socket): JWTPayload | undefined =>
  socket.data?.user as JWTPayload | undefined;

const parseCookies = (header: string): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const pair of header.split(';')) {
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    const key = pair.slice(0, eq).trim();
    if (!key) continue;
    const raw = pair.slice(eq + 1).trim();
    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw;
    }
  }
  return out;
};

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

  // Connection-level auth: parse JWT from cookie or handshake `auth.token`.
  // Anonymous connections are allowed (so unauthenticated browsers still get
  // public movie-room updates), but private rooms (`user:`, `conversation:`)
  // require an authenticated socket and per-event ownership/membership checks.
  io.use((socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie || '');
      let token = cookies.userToken || cookies.adminToken;

      // Mobile / cross-origin clients may pass the token via auth handshake
      // because cookies aren't always available cross-domain.
      if (!token && typeof socket.handshake.auth?.token === 'string') {
        token = socket.handshake.auth.token;
      }

      if (token) {
        try {
          socket.data.user = jwt.verify(token, ENV_VARS.JWT_SECRET) as JWTPayload;
        } catch (err) {
          logger.debug('Socket auth: invalid token', {
            error: (err as Error).message,
            socketId: socket.id
          });
        }
      }
    } catch (err) {
      logger.warn('Socket auth middleware error', { error: (err as Error).message });
    }
    next();
  });

  io.on('connection', (socket) => {
    const user = getUser(socket);
    logger.info(`Socket connected: ${socket.id}`, { userId: user?.id || 'anonymous' });

    // Join user's personal room — only the owner of the user id may join.
    socket.on('join-user', (userId: string) => {
      const u = getUser(socket);
      if (!u || u.id !== userId) {
        logger.warn('Rejected join-user', {
          socketId: socket.id,
          requestedUserId: userId,
          actualUserId: u?.id || 'anonymous'
        });
        return;
      }
      socket.join(`user:${userId}`);
      logger.info(`Socket ${socket.id} joined user room: user:${userId}`);
    });

    socket.on('leave-user', (userId: string) => {
      // Leaving is always safe — at worst it's a no-op for a room not joined.
      socket.leave(`user:${userId}`);
    });

    // Movie rooms are public (used for live review/comment fan-out).
    socket.on('join-movie', (movieId: string) => {
      socket.join(`movie:${movieId}`);
    });

    socket.on('leave-movie', (movieId: string) => {
      socket.leave(`movie:${movieId}`);
    });

    // Conversation rooms require an authenticated socket whose user is a
    // participant of the conversation. Membership is verified against the DB
    // once at join time; subsequent typing/message events trust the room
    // membership by checking `socket.rooms`.
    socket.on('join-conversation', async (conversationId: string) => {
      const u = getUser(socket);
      if (!u) {
        logger.warn('Rejected join-conversation: anonymous socket', {
          socketId: socket.id,
          conversationId
        });
        return;
      }
      if (!mongoose.isValidObjectId(conversationId)) {
        logger.warn('Rejected join-conversation: invalid id', { conversationId });
        return;
      }
      try {
        const conv = await Conversation.findOne({
          _id: conversationId,
          participants: u.id
        }).select('_id').lean();
        if (!conv) {
          logger.warn('Rejected join-conversation: not a participant', {
            socketId: socket.id,
            userId: u.id,
            conversationId
          });
          return;
        }
        socket.join(`conversation:${conversationId}`);
        logger.info(`Socket ${socket.id} joined conversation:${conversationId}`);
      } catch (err) {
        logger.error('join-conversation lookup failed', {
          error: (err as Error).message,
          conversationId
        });
      }
    });

    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Typing indicators may only be emitted by an authenticated user who has
    // already joined the conversation room (i.e., passed the join-time
    // membership check) and whose id matches the data payload — preventing
    // typing-as-someone-else spoofing.
    socket.on('typing:start', (data: { conversationId: string; userId: string }) => {
      const u = getUser(socket);
      if (!u || u.id !== data.userId) return;
      if (!socket.rooms.has(`conversation:${data.conversationId}`)) return;
      socket.to(`conversation:${data.conversationId}`).emit('typing:start', {
        conversationId: data.conversationId,
        userId: data.userId
      });
    });

    socket.on('typing:stop', (data: { conversationId: string; userId: string }) => {
      const u = getUser(socket);
      if (!u || u.id !== data.userId) return;
      if (!socket.rooms.has(`conversation:${data.conversationId}`)) return;
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

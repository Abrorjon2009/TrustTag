import { Server, Socket } from 'socket.io';
import { prisma } from '../db';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    // Join a specific trade chat room
    socket.on('join_trade', (tradeSessionId: string) => {
      socket.join(`trade_${tradeSessionId}`);
      console.log(`Socket ${socket.id} joined trade room: trade_${tradeSessionId}`);
    });

    // Leave a trade chat room
    socket.on('leave_trade', (tradeSessionId: string) => {
      socket.leave(`trade_${tradeSessionId}`);
    });

    // Send a new message
    socket.on('send_message', async (data: { tradeSessionId: string; senderId: string; text: string }) => {
      const { tradeSessionId, senderId, text } = data;
      if (!tradeSessionId || !senderId || !text) return;

      try {
        const msg = await prisma.chatMessage.create({
          data: {
            tradeSessionId,
            senderId,
            messageText: text,
            isSystemEvent: false,
          },
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        });

        // Broadcast to all participants in this room
        io.to(`trade_${tradeSessionId}`).emit('new_message', msg);
      } catch (err) {
        console.error('Socket send_message error:', err);
      }
    });

    socket.on('disconnect', () => {
      // Clean up
    });
  });
}


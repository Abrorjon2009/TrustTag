import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import locationsRouter from './routes/locations';
import productsRouter from './routes/products';
import tradesRouter from './routes/trades';
import disputesRouter from './routes/disputes';
import walletsRouter from './routes/wallets';
import usersRouter from './routes/users';
import authRouter from './routes/auth';
import paymentsRouter from './routes/payments';
import uploadRouter from './routes/upload';
import { setupSocketHandlers } from './socket';
import { startEscrowCronJobs } from './cron/escrowJob';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Allow CORS from web browser preview and mobile clients
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

// Serve uploaded media statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/products', productsRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/disputes', disputesRouter);
app.use('/api/wallets', walletsRouter);
app.use('/api/users', usersRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'SafeTrade Marketplace Server', market: 'Uzbekistan (UZS)' });
});

// Setup WebSockets & Background Cron
setupSocketHandlers(io);
startEscrowCronJobs();

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 SafeTrade Server is running on http://localhost:${PORT}`);
});


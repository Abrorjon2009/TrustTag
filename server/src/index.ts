import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import locationsRouter from './routes/locations';
import productsRouter from './routes/products';
import tradesRouter from './routes/trades';
import disputesRouter from './routes/disputes';
import walletsRouter from './routes/wallets';
import usersRouter from './routes/users';
import { setupSocketHandlers } from './socket';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Allow CORS from web browser preview and mobile clients
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/locations', locationsRouter);
app.use('/api/products', productsRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/disputes', disputesRouter);
app.use('/api/wallets', walletsRouter);
app.use('/api/users', usersRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'SafeTrade Marketplace Server' });
});

// Setup WebSockets
setupSocketHandlers(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 SafeTrade Server is running on http://localhost:${PORT}`);
});


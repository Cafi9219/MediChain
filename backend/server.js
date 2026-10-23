import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import cadaverRoutes from './routes/cadaverRoutes.js';
import organRoutes from './routes/organRoutes.js';
import blockchainRoutes from './routes/blockchainRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { ledger } from './blockchain/blockchain.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite dev server (port 5173 / localhost)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-department-role']
}));

// Generous payload limits for base64 biometrics & photos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[CONSORTIUM_LEDGER] ${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cadavers', cadaverRoutes);
app.use('/api/organs', organRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/admin', adminRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    consortiumNetwork: 'MediChain Organ Traceability Network',
    currentBlockHeight: ledger.chain.length,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log('================================================================');
  console.log(` MEDILAYER CONSORTIUM BLOCKCHAIN ENGINE RUNNING ON PORT ${PORT}`);
  console.log(' Authorized Nodes: CIFV (Intake), SROPS (Harvest), CTORB (Admin)');
  console.log(' External Hospital (RTCN): Restricted (Consortium Sandbox)');
  console.log(` Current Block Height: #${ledger.chain.length}`);
  console.log('================================================================');
});

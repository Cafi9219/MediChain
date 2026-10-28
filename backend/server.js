import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import cadaverRoutes, { getCadaverRegistry } from './routes/cadaverRoutes.js';
import organRoutes, { getHarvestReports } from './routes/organRoutes.js';
import blockchainRoutes from './routes/blockchainRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import deadlineRoutes from './routes/deadlineRoutes.js';
import etaRoutes from './routes/etaRoutes.js';
import { ledger } from './blockchain/blockchain.js';
import { verifyStartupLedgerConsistency } from './data/persistence.js';
import { scanAndEscalate } from './services/deadlineEngine.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite dev server (port 5173 / localhost)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or allowed origins; in dev allow all if ALLOW_ALL_ORIGINS is set
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Origin not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-department-role']
}));

// Generous payload limits for base64 biometrics & photos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger (does not log request body to avoid leaking credentials)
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
app.use('/api/deadlines', deadlineRoutes);
app.use('/api/eta', etaRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    consortiumNetwork: 'MediChain Organ Traceability Network',
    currentBlockHeight: ledger.chain.length,
    timestamp: new Date().toISOString()
  });
});

// Startup consistency and integrity check
verifyStartupLedgerConsistency(getCadaverRegistry(), getHarvestReports());

// Periodic background deadline scan (every 30 seconds)
setInterval(() => {
  try {
    scanAndEscalate(getCadaverRegistry(), getHarvestReports());
  } catch (err) {
    console.error('[DEADLINE_SCAN_ERROR]:', err.message);
  }
}, 30000);

app.listen(PORT, () => {
  console.log('================================================================');
  console.log(` MEDILAYER CONSORTIUM BLOCKCHAIN ENGINE RUNNING ON PORT ${PORT}`);
  console.log(' Authorized Nodes: CIFV (Intake), SROPS (Harvest), CTORB (Admin)');
  console.log(' External Hospital (RTCN): Restricted (Consortium Sandbox)');
  console.log(` Current Block Height: #${ledger.chain.length}`);
  console.log('================================================================');
});

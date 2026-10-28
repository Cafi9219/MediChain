import express from 'express';
import {
  CORRIDOR_HOSPITALS,
  calculateRouteAndViability
} from '../services/routeService.js';

const router = express.Router();

/**
 * GET /api/eta/hospitals
 * Returns the corridor graph hospitals and their coordinates
 */
router.get('/hospitals', (req, res) => {
  res.json({
    success: true,
    hospitals: CORRIDOR_HOSPITALS
  });
});

/**
 * POST /api/eta
 * Computes road route & ETA, viability margin mu, and records on-chain transaction
 */
router.post('/', async (req, res) => {
  try {
    const {
      origin,
      destination,
      organId,
      organType,
      deadlineAt,
      tProcSeconds,
      forceFallback
    } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Both origin and destination hospitals are required.'
      });
    }

    const result = await calculateRouteAndViability({
      origin,
      destination,
      organId,
      organType,
      deadlineAt,
      tProcSeconds,
      forceFallback
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

export default router;

import express from 'express';
import { calculateDeadlines, scanAndEscalate } from '../services/deadlineEngine.js';
import { getCadaverRegistry } from './cadaverRoutes.js';
import { getHarvestReports } from './organRoutes.js';

const router = express.Router();

/**
 * Authorization Middleware: Ensures caller belongs to an authorized consortium department
 */
function requireConsortiumAccess(req, res, next) {
  const role = req.headers['x-department-role'] || req.query.role;
  if (!role) {
    // In dev / client fallback mode, allow if not external
    return next();
  }
  const norm = role.toUpperCase();
  if (norm === 'EXTERNAL' || norm === 'RTCN' || norm === 'EXTERNAL_HOSPITAL') {
    return res.status(403).json({
      success: false,
      error: 'CONSORTIUM_ACCESS_DENIED',
      message: 'External Recipient Hospital nodes are restricted from direct regulatory deadline monitoring.'
    });
  }
  next();
}

router.use(requireConsortiumAccess);

// GET /api/deadlines - Active physiological deadlines
router.get('/', (req, res) => {
  try {
    const cadavers = getCadaverRegistry ? getCadaverRegistry() : [];
    const organs = getHarvestReports ? getHarvestReports() : [];
    const deadlines = calculateDeadlines(cadavers, organs);

    res.json({
      success: true,
      count: deadlines.length,
      deadlines
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/deadlines/scan - On-demand scan & audit escalation triggering
router.post('/scan', (req, res) => {
  try {
    const cadavers = getCadaverRegistry ? getCadaverRegistry() : [];
    const organs = getHarvestReports ? getHarvestReports() : [];
    const { deadlines, triggeredEvents } = scanAndEscalate(cadavers, organs);

    res.json({
      success: true,
      count: deadlines.length,
      escalationsTriggered: triggeredEvents.length,
      triggeredEvents,
      deadlines
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

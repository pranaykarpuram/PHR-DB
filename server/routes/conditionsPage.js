import { Router } from 'express';
import { pool } from '../db.js';
import {
  COND_SUMMARY,
  COND_BY_NAME,
  sqlCondRecent,
  clampLimit,
} from '../queries/globalPages.js';

const router = Router();

router.get('/overview', async (req, res) => {
  try {
    const recentLimit = clampLimit(req.query.recentLimit, 150, 400);
    const [[summary]] = await pool.execute(COND_SUMMARY);
    const [byCondition] = await pool.execute(COND_BY_NAME);
    const [recent] = await pool.query(sqlCondRecent(recentLimit));

    res.json({
      summary: {
        total_rows: Number(summary.total_rows),
        distinct_condition_types: Number(summary.distinct_condition_types),
        patients_with_conditions: Number(summary.patients_with_conditions),
      },
      byCondition: byCondition.map((r) => ({
        condition_name: r.condition_name,
        condition_code: r.condition_code,
        count: Number(r.count),
      })),
      recent: recent.map((r) => ({
        patient_condition_id: r.patient_condition_id,
        patient_id: r.patient_id,
        nhanes_seqn: r.nhanes_seqn,
        condition_code: r.condition_code,
        condition_name: r.condition_name,
        status: r.status,
        cycle: r.cycle,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load conditions overview' });
  }
});

export default router;

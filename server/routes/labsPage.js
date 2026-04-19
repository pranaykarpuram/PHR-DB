import { Router } from 'express';
import { pool } from '../db.js';
import {
  LABS_SUMMARY,
  LABS_BY_TEST,
  sqlLabsRecent,
  clampLimit,
} from '../queries/globalPages.js';

const router = Router();

function serializeDate(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d;
}

function serializeDateTime(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 19).replace('T', ' ');
  return d;
}

router.get('/overview', async (req, res) => {
  try {
    const recentLimit = clampLimit(req.query.recentLimit, 150, 400);
    const [[summary]] = await pool.execute(LABS_SUMMARY);
    const [byTest] = await pool.execute(LABS_BY_TEST);
    const [recent] = await pool.query(sqlLabsRecent(recentLimit));

    res.json({
      summary: {
        total_results: Number(summary.total_results),
        distinct_test_types: Number(summary.distinct_test_types),
        patients_with_labs: Number(summary.patients_with_labs),
      },
      byTest: byTest.map((r) => ({
        test_name: r.test_name,
        count: Number(r.count),
      })),
      recent: recent.map((r) => ({
        lab_result_id: r.lab_result_id,
        patient_id: r.patient_id,
        nhanes_seqn: r.nhanes_seqn,
        test_name: r.test_name,
        value: r.value != null ? Number(r.value) : null,
        unit: r.unit,
        cycle: r.cycle,
        encounter_date: serializeDate(r.encounter_date),
        result_time: serializeDateTime(r.result_time),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load labs overview' });
  }
});

export default router;

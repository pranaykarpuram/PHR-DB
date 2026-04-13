import { Router } from 'express';
import { pool } from '../db.js';
import {
  SUMMARY_COUNTS,
  AVG_CHOLESTEROL_PER_PATIENT,
  LAB_DISTRIBUTION,
  SEX_DISTRIBUTION,
  CONDITION_DISTRIBUTION,
  CYCLE_DISTRIBUTION,
  OVERALL_AVG_TOTAL_CHOL,
} from '../queries/analytics.js';

const router = Router();

router.get('/overview', async (_req, res) => {
  try {
    const [[summary]] = await pool.execute(SUMMARY_COUNTS);
    const [avgCholesterol] = await pool.execute(AVG_CHOLESTEROL_PER_PATIENT);
    const [labDistribution] = await pool.execute(LAB_DISTRIBUTION);
    const [sexDistribution] = await pool.execute(SEX_DISTRIBUTION);
    const [conditionDistribution] = await pool.execute(CONDITION_DISTRIBUTION);
    const [cycleDistribution] = await pool.execute(CYCLE_DISTRIBUTION);
    const [[overallChol]] = await pool.execute(OVERALL_AVG_TOTAL_CHOL);

    res.json({
      summary: {
        patient_count: Number(summary.patient_count),
        encounter_count: Number(summary.encounter_count),
        lab_result_count: Number(summary.lab_result_count),
        medication_count: Number(summary.medication_count),
        condition_count: Number(summary.condition_count),
      },
      overallAvgTotalCholesterol:
        overallChol.avg_total_cholesterol != null
          ? Number(overallChol.avg_total_cholesterol)
          : null,
      avgCholesterol: avgCholesterol.map((r) => ({
        patient_id: r.patient_id,
        nhanes_seqn: r.nhanes_seqn,
        avg_total_cholesterol:
          r.avg_total_cholesterol != null
            ? Number(r.avg_total_cholesterol)
            : null,
      })),
      labDistribution: labDistribution.map((r) => ({
        test_name: r.test_name,
        count: Number(r.count),
      })),
      sexDistribution: sexDistribution.map((r) => ({
        sex: r.sex,
        count: Number(r.count),
      })),
      conditionDistribution: conditionDistribution.map((r) => ({
        condition_name: r.condition_name,
        count: Number(r.count),
      })),
      cycleDistribution: cycleDistribution.map((r) => ({
        cycle: r.cycle,
        count: Number(r.count),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

export default router;

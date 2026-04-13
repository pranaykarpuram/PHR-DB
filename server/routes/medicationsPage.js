import { Router } from 'express';
import { pool } from '../db.js';
import {
  MEDS_SUMMARY,
  MEDS_TOP_DRUGS,
  sqlMedsRecent,
  clampLimit,
} from '../queries/globalPages.js';

const router = Router();

function serializeDate(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d;
}

router.get('/overview', async (req, res) => {
  try {
    const recentLimit = clampLimit(req.query.recentLimit, 150, 400);
    const [[summary]] = await pool.execute(MEDS_SUMMARY);
    const [topDrugs] = await pool.execute(MEDS_TOP_DRUGS);
    const [recent] = await pool.query(sqlMedsRecent(recentLimit));

    res.json({
      summary: {
        total_prescriptions: Number(summary.total_prescriptions),
        distinct_drugs: Number(summary.distinct_drugs),
        patients_with_meds: Number(summary.patients_with_meds),
      },
      topDrugs: topDrugs.map((r) => ({
        drug_name: r.drug_name,
        prescription_count: Number(r.prescription_count),
      })),
      recent: recent.map((r) => ({
        patient_med_id: r.patient_med_id,
        patient_id: r.patient_id,
        nhanes_seqn: r.nhanes_seqn,
        drug_name: r.drug_name,
        dosage: r.dosage,
        start_date: serializeDate(r.start_date),
        end_date: serializeDate(r.end_date),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load medications overview' });
  }
});

export default router;

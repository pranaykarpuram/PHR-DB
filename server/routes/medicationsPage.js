import { Router } from 'express';
import { pool } from '../db.js';
import {
  MEDS_SUMMARY,
  MEDS_TOP_DRUGS,
  sqlMedsRecent,
  clampLimit,
} from '../queries/globalPages.js';
import {
  FIND_DRUG_BY_NAME,
  INSERT_DRUG,
  INSERT_PATIENT_MEDICATION,
  GET_PATIENT_MEDICATION_BY_ID,
  UPDATE_PATIENT_MEDICATION,
  DELETE_PATIENT_MEDICATION,
} from '../queries/medicationCrud.js';

const router = Router();

function serializeDate(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d;
}

function parsePositiveInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

function normalizeNullableString(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function normalizeNullableDate(value) {
  if (value == null || value === '') return null;
  return String(value);
}

async function resolveDrugId(conn, drugNameRaw) {
  const drugName = String(drugNameRaw || '').trim();
  if (!drugName) return null;
  const [existing] = await conn.execute(FIND_DRUG_BY_NAME, [drugName]);
  if (existing.length) return existing[0].drug_id;
  const [ins] = await conn.execute(INSERT_DRUG, [drugName]);
  return ins.insertId;
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

router.post('/', async (req, res) => {
  const patientId = parsePositiveInt(req.body.patient_id);
  if (!patientId) {
    return res.status(400).json({ error: 'Invalid patient_id' });
  }

  const dosage = normalizeNullableString(req.body.dosage);
  const startDate = normalizeNullableDate(req.body.start_date);
  const endDate = normalizeNullableDate(req.body.end_date);
  const drugName = normalizeNullableString(req.body.drug_name);
  if (!drugName) {
    return res.status(400).json({ error: 'drug_name is required' });
  }

  const conn = await pool.getConnection();
  try {
    const drugId = await resolveDrugId(conn, drugName);
    const [ins] = await conn.execute(INSERT_PATIENT_MEDICATION, [
      patientId,
      drugId,
      dosage,
      startDate,
      endDate,
    ]);
    const [rows] = await conn.execute(GET_PATIENT_MEDICATION_BY_ID, [
      ins.insertId,
    ]);
    if (!rows.length) {
      return res.status(500).json({ error: 'Failed to create medication row' });
    }
    const r = rows[0];
    res.status(201).json({
      patient_med_id: r.patient_med_id,
      patient_id: r.patient_id,
      nhanes_seqn: r.nhanes_seqn,
      drug_name: r.drug_name,
      dosage: r.dosage,
      start_date: serializeDate(r.start_date),
      end_date: serializeDate(r.end_date),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create medication' });
  } finally {
    conn.release();
  }
});

router.patch('/:patientMedId', async (req, res) => {
  const patientMedId = parsePositiveInt(req.params.patientMedId);
  if (!patientMedId) {
    return res.status(400).json({ error: 'Invalid patient medication id' });
  }

  const dosage = normalizeNullableString(req.body.dosage);
  const startDate = normalizeNullableDate(req.body.start_date);
  const endDate = normalizeNullableDate(req.body.end_date);
  const drugName = normalizeNullableString(req.body.drug_name);
  if (!drugName) {
    return res.status(400).json({ error: 'drug_name is required' });
  }

  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.execute(GET_PATIENT_MEDICATION_BY_ID, [
      patientMedId,
    ]);
    if (!existing.length) {
      return res.status(404).json({ error: 'Medication row not found' });
    }
    const drugId = await resolveDrugId(conn, drugName);
    await conn.execute(UPDATE_PATIENT_MEDICATION, [
      drugId,
      dosage,
      startDate,
      endDate,
      patientMedId,
    ]);
    const [rows] = await conn.execute(GET_PATIENT_MEDICATION_BY_ID, [
      patientMedId,
    ]);
    const r = rows[0];
    res.json({
      patient_med_id: r.patient_med_id,
      patient_id: r.patient_id,
      nhanes_seqn: r.nhanes_seqn,
      drug_name: r.drug_name,
      dosage: r.dosage,
      start_date: serializeDate(r.start_date),
      end_date: serializeDate(r.end_date),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update medication' });
  } finally {
    conn.release();
  }
});

router.delete('/:patientMedId', async (req, res) => {
  const patientMedId = parsePositiveInt(req.params.patientMedId);
  if (!patientMedId) {
    return res.status(400).json({ error: 'Invalid patient medication id' });
  }

  try {
    const [result] = await pool.execute(DELETE_PATIENT_MEDICATION, [patientMedId]);
    if (result.affectedRows < 1) {
      return res.status(404).json({ error: 'Medication row not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});

router.post('/:patientMedId/discontinue', async (req, res) => {
  const patientMedId = parsePositiveInt(req.params.patientMedId);
  if (!patientMedId) {
    return res.status(400).json({ error: 'Invalid patient medication id' });
  }
  const endDate = normalizeNullableDate(req.body.end_date);
  if (!endDate) {
    return res.status(400).json({ error: 'end_date is required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await conn.execute('START TRANSACTION');

    const [beforeRows] = await conn.execute(GET_PATIENT_MEDICATION_BY_ID, [
      patientMedId,
    ]);
    if (!beforeRows.length) {
      await conn.execute('ROLLBACK');
      return res.status(404).json({ error: 'Medication row not found' });
    }

    await conn.execute('CALL sp_discontinue_medication(?, ?)', [
      patientMedId,
      endDate,
    ]);

    await conn.execute(
      `
      INSERT INTO MedicationWorkflowLog (
        patient_med_id,
        action_name,
        action_note
      )
      VALUES (?, 'DISCONTINUE', 'Medication discontinued via frontend workflow')
      `,
      [patientMedId]
    );

    const [afterRows] = await conn.execute(GET_PATIENT_MEDICATION_BY_ID, [
      patientMedId,
    ]);

    await conn.execute('COMMIT');

    const r = afterRows[0];
    res.json({
      patient_med_id: r.patient_med_id,
      patient_id: r.patient_id,
      nhanes_seqn: r.nhanes_seqn,
      drug_name: r.drug_name,
      dosage: r.dosage,
      start_date: serializeDate(r.start_date),
      end_date: serializeDate(r.end_date),
    });
  } catch (err) {
    try {
      await conn.execute('ROLLBACK');
    } catch (rollbackErr) {
      console.error(rollbackErr);
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to discontinue medication' });
  } finally {
    conn.release();
  }
});

export default router;

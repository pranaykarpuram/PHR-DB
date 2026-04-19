import { Router } from 'express';
import { pool } from '../db.js';
import {
  buildPatientListQuery,
  PATIENT_SUMMARY,
  PATIENT_ENCOUNTERS,
  PATIENT_LABS_RESULTS,
  PATIENT_LABS_LATEST,
  PATIENT_MEDICATIONS,
  PATIENT_CONDITIONS,
} from '../queries/patients.js';

const router = Router();

function parsePatientId(param) {
  const id = Number(param);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

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

router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      sex = '',
      birthYearMin,
      birthYearMax,
      conditionCode = '',
      limit = '200',
      offset = '0',
    } = req.query;

    const lim = Math.min(Math.max(Number(limit) || 200, 1), 500);
    const off = Math.max(Number(offset) || 0, 0);

    const filters = {
      search: String(search).trim(),
      sex: String(sex).trim(),
      birthYearMin:
        birthYearMin !== undefined && birthYearMin !== ''
          ? Number(birthYearMin)
          : null,
      birthYearMax:
        birthYearMax !== undefined && birthYearMax !== ''
          ? Number(birthYearMax)
          : null,
      conditionCode: String(conditionCode).trim(),
      limit: lim,
      offset: off,
    };

    if (
      filters.birthYearMin != null &&
      Number.isNaN(filters.birthYearMin)
    ) {
      return res.status(400).json({ error: 'Invalid birthYearMin' });
    }
    if (
      filters.birthYearMax != null &&
      Number.isNaN(filters.birthYearMax)
    ) {
      return res.status(400).json({ error: 'Invalid birthYearMax' });
    }

    const { sql, params } = buildPatientListQuery(filters);
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load patients' });
  }
});

router.get('/:patientId/encounters', async (req, res) => {
  const patientId = parsePatientId(req.params.patientId);
  if (!patientId) return res.status(400).json({ error: 'Invalid patient id' });
  try {
    const [rows] = await pool.execute(PATIENT_ENCOUNTERS, [patientId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load encounters' });
  }
});

router.get('/:patientId/labs', async (req, res) => {
  const patientId = parsePatientId(req.params.patientId);
  if (!patientId) return res.status(400).json({ error: 'Invalid patient id' });
  try {
    const [latestByTest] = await pool.execute(PATIENT_LABS_LATEST, [
      patientId,
    ]);
    const [results] = await pool.execute(PATIENT_LABS_RESULTS, [patientId]);
    const mapped = results.map((r) => ({
      lab_result_id: r.lab_result_id,
      encounter_id: r.encounter_id,
      test_type_id: r.test_type_id,
      test_name: r.test_name,
      value: r.value,
      unit: r.unit,
      result_time: serializeDateTime(r.result_time),
      cycle: r.cycle,
      encounter_date: serializeDate(r.encounter_date),
    }));
    res.json({
      latestByTest: latestByTest.map((r) => ({
        test_name: r.test_name,
        value: r.value,
        unit: r.unit,
        cycle: r.cycle,
      })),
      results: mapped,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load labs' });
  }
});

router.get('/:patientId/medications', async (req, res) => {
  const patientId = parsePatientId(req.params.patientId);
  if (!patientId) return res.status(400).json({ error: 'Invalid patient id' });
  try {
    const [rows] = await pool.execute(PATIENT_MEDICATIONS, [patientId]);
    const mapped = rows.map((r) => ({
      patient_med_id: r.patient_med_id,
      drug_name: r.drug_name,
      dosage: r.dosage,
      start_date: serializeDate(r.start_date),
      end_date: serializeDate(r.end_date),
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load medications' });
  }
});

router.get('/:patientId/conditions', async (req, res) => {
  const patientId = parsePatientId(req.params.patientId);
  if (!patientId) return res.status(400).json({ error: 'Invalid patient id' });
  try {
    const [rows] = await pool.execute(PATIENT_CONDITIONS, [patientId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load conditions' });
  }
});

router.get('/:patientId', async (req, res) => {
  const patientId = parsePatientId(req.params.patientId);
  if (!patientId) return res.status(400).json({ error: 'Invalid patient id' });
  try {
    const [rows] = await pool.execute(PATIENT_SUMMARY, [patientId]);
    if (!rows.length) return res.status(404).json({ error: 'Patient not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load patient' });
  }
});

export default router;

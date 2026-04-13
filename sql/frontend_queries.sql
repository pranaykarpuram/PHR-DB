-- Reference SQL used by server/queries/*.js for the React UI.
-- Same logic as parameterized queries in Node; documented here for CS 411.

-- Patient list: base shape = Patient + correlated counts (labs, conditions, meds, encounters).
-- Filters (search nhanes_seqn, sex, birth year range, EXISTS condition) are appended in application code.

-- Patient summary: single row + same four counts (GET /api/patients/:id).

-- Encounters: SELECT from Encounter WHERE patient_id = ?

-- Labs: results join LabResult, LabTestType, Encounter WHERE patient_id = ?
-- Latest-by-test: ROW_NUMBER() OVER (PARTITION BY test_type_id ORDER BY lab_result_id DESC) = 1
--   filtered to test names loaded by transform.sql.

-- Medications: PatientMedication JOIN Drug WHERE patient_id = ?

-- Conditions: PatientCondition JOIN ConditionType WHERE patient_id = ?

-- Analytics summary: scalar subqueries COUNT(*) per table.

-- Analytics: avg Total Cholesterol per patient — same pattern as sql/queries.sql (first query).

-- Analytics: lab / sex / condition / cycle distributions — GROUP BY on respective dimensions.

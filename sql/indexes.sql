-- extra indexes for explain homework (occured after data load for us)
USE phr_db;

CREATE INDEX idx_labresult_encounter_test ON LabResult (encounter_id, test_type_id);

CREATE INDEX idx_patientcondition_cycle ON PatientCondition (cycle);
CREATE INDEX idx_patientcondition_patient_cycle ON PatientCondition (patient_id, cycle);

CREATE INDEX idx_encounter_cycle ON Encounter (cycle);

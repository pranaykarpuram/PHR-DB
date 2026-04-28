USE phr_db;

CREATE TABLE IF NOT EXISTS MedicationWorkflowLog (
  workflow_log_id INT NOT NULL AUTO_INCREMENT,
  patient_med_id INT NOT NULL,
  action_name VARCHAR(50) NOT NULL,
  action_note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workflow_log_id),
  CONSTRAINT fk_workflowlog_med
    FOREIGN KEY (patient_med_id) REFERENCES PatientMedication (patient_med_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS MedicationTriggerAlert (
  trigger_alert_id INT NOT NULL AUTO_INCREMENT,
  patient_med_id INT NULL,
  event_name VARCHAR(50) NOT NULL,
  alert_note VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (trigger_alert_id)
);

DROP TRIGGER IF EXISTS trg_patmed_before_insert;
DROP TRIGGER IF EXISTS trg_patmed_before_update;
DROP PROCEDURE IF EXISTS sp_discontinue_medication;

DELIMITER //

CREATE TRIGGER trg_patmed_before_insert
BEFORE INSERT ON PatientMedication
FOR EACH ROW
BEGIN
  IF NEW.end_date IS NOT NULL
     AND NEW.start_date IS NOT NULL
     AND NEW.end_date < NEW.start_date THEN
    INSERT INTO MedicationTriggerAlert (
      patient_med_id,
      event_name,
      alert_note
    )
    VALUES (
      NULL,
      'BEFORE_INSERT',
      'end_date earlier than start_date; end_date adjusted to start_date'
    );
    SET NEW.end_date = NEW.start_date;
  END IF;
END //

CREATE TRIGGER trg_patmed_before_update
BEFORE UPDATE ON PatientMedication
FOR EACH ROW
BEGIN
  IF NEW.end_date IS NOT NULL
     AND NEW.start_date IS NOT NULL
     AND NEW.end_date < NEW.start_date THEN
    INSERT INTO MedicationTriggerAlert (
      patient_med_id,
      event_name,
      alert_note
    )
    VALUES (
      OLD.patient_med_id,
      'BEFORE_UPDATE',
      'end_date earlier than start_date; end_date adjusted to start_date'
    );
    SET NEW.end_date = NEW.start_date;
  END IF;
END //

CREATE PROCEDURE sp_discontinue_medication (
  IN p_patient_med_id INT,
  IN p_end_date DATE
)
BEGIN
  DECLARE v_has_row INT DEFAULT 0;
  DECLARE v_patient_id INT DEFAULT NULL;

  SELECT
    COUNT(*) AS has_row,
    MAX(patient_id) AS patient_id
  INTO
    v_has_row,
    v_patient_id
  FROM PatientMedication
  WHERE patient_med_id = p_patient_med_id;

  IF v_has_row = 0 THEN
    INSERT INTO MedicationWorkflowLog (
      patient_med_id,
      action_name,
      action_note
    )
    VALUES (
      p_patient_med_id,
      'DISCONTINUE_NOT_FOUND',
      'Stored procedure could not find patient_med_id'
    );
  ELSE
    UPDATE PatientMedication
    SET end_date = p_end_date
    WHERE patient_med_id = p_patient_med_id;

    INSERT INTO MedicationWorkflowLog (
      patient_med_id,
      action_name,
      action_note
    )
    VALUES (
      p_patient_med_id,
      'DISCONTINUE_SP',
      'Stored procedure set end_date'
    );

    SELECT
      pm.patient_id,
      p.nhanes_seqn,
      COUNT(*) AS medication_count,
      SUM(
        CASE
          WHEN pm.end_date IS NULL OR pm.end_date >= CURDATE() THEN 1
          ELSE 0
        END
      ) AS active_medication_count,
      (
        SELECT COUNT(*)
        FROM PatientCondition pc
        WHERE pc.patient_id = pm.patient_id
      ) AS condition_row_count
    FROM PatientMedication pm
    INNER JOIN Patient p ON p.patient_id = pm.patient_id
    WHERE pm.patient_id = v_patient_id
    GROUP BY pm.patient_id, p.nhanes_seqn;
  END IF;
END //

DELIMITER ;

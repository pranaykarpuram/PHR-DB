-- phr_db main schema
-- seperates users / patients / nhanes-ish stuff per erdiagam

DROP DATABASE IF EXISTS phr_db;
CREATE DATABASE phr_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE phr_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS LabResult;
DROP TABLE IF EXISTS PatientMedication;
DROP TABLE IF EXISTS PatientCondition;
DROP TABLE IF EXISTS Encounter;
DROP TABLE IF EXISTS Patient;
DROP TABLE IF EXISTS LabTestType;
DROP TABLE IF EXISTS Drug;
DROP TABLE IF EXISTS ConditionType;
DROP TABLE IF EXISTS UserAccount;
SET FOREIGN_KEY_CHECKS = 1;

-- app logins
CREATE TABLE UserAccount (
  user_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_useraccount_email (email)
);

-- people w seqn
CREATE TABLE Patient (
  patient_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  nhanes_seqn INT NOT NULL,
  birth_year INT NOT NULL,
  sex CHAR(1) NOT NULL,
  PRIMARY KEY (patient_id),
  UNIQUE KEY uq_patient_nhanes_seqn (nhanes_seqn),
  CONSTRAINT fk_patient_user
    FOREIGN KEY (user_id) REFERENCES UserAccount (user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_patient_birth_year
    CHECK (birth_year BETWEEN 1900 AND 2026),
  CONSTRAINT chk_patient_sex
    CHECK (sex IN ('M', 'F', 'O'))
);

-- visits / cycles
CREATE TABLE Encounter (
  encounter_id INT NOT NULL AUTO_INCREMENT,
  patient_id INT NOT NULL,
  encounter_date DATE NULL,
  cycle VARCHAR(20) NOT NULL,
  encounter_type VARCHAR(50) NOT NULL,
  PRIMARY KEY (encounter_id),
  CONSTRAINT fk_encounter_patient
    FOREIGN KEY (patient_id) REFERENCES Patient (patient_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- lab names
CREATE TABLE LabTestType (
  test_type_id INT NOT NULL AUTO_INCREMENT,
  test_name VARCHAR(100) NOT NULL,
  default_unit VARCHAR(20) NULL,
  PRIMARY KEY (test_type_id),
  UNIQUE KEY uq_labtesttype_name (test_name)
);

-- actual labs
CREATE TABLE LabResult (
  lab_result_id INT NOT NULL AUTO_INCREMENT,
  encounter_id INT NOT NULL,
  test_type_id INT NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(20) NULL,
  result_time DATETIME NULL,
  PRIMARY KEY (lab_result_id),
  CONSTRAINT fk_labresult_encounter
    FOREIGN KEY (encounter_id) REFERENCES Encounter (encounter_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_labresult_testtype
    FOREIGN KEY (test_type_id) REFERENCES LabTestType (test_type_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- drug lookup
CREATE TABLE Drug (
  drug_id INT NOT NULL AUTO_INCREMENT,
  drug_name VARCHAR(120) NOT NULL,
  PRIMARY KEY (drug_id),
  UNIQUE KEY uq_drug_name (drug_name)
);

-- who takes what
CREATE TABLE PatientMedication (
  patient_med_id INT NOT NULL AUTO_INCREMENT,
  patient_id INT NOT NULL,
  drug_id INT NOT NULL,
  dosage VARCHAR(60) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  PRIMARY KEY (patient_med_id),
  CONSTRAINT fk_patmed_patient
    FOREIGN KEY (patient_id) REFERENCES Patient (patient_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_patmed_drug
    FOREIGN KEY (drug_id) REFERENCES Drug (drug_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_patmed_dates
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- condition lookup
CREATE TABLE ConditionType (
  condition_type_id INT NOT NULL AUTO_INCREMENT,
  condition_code VARCHAR(30) NOT NULL,
  condition_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (condition_type_id),
  UNIQUE KEY uq_condition_code (condition_code)
);

-- patient dx bridge
CREATE TABLE PatientCondition (
  patient_condition_id INT NOT NULL AUTO_INCREMENT,
  patient_id INT NOT NULL,
  condition_type_id INT NOT NULL,
  status VARCHAR(30) NULL,
  cycle VARCHAR(20) NOT NULL,
  PRIMARY KEY (patient_condition_id),
  CONSTRAINT fk_patcond_patient
    FOREIGN KEY (patient_id) REFERENCES Patient (patient_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_patcond_type
    FOREIGN KEY (condition_type_id) REFERENCES ConditionType (condition_type_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- raw csv lands here first so we dont break fk rules on typos etc
-- then transform.sql moves rows into real tables

USE phr_db;

DROP TABLE IF EXISTS staging_demographic;
DROP TABLE IF EXISTS staging_labs;
DROP TABLE IF EXISTS staging_questionnaire;
DROP TABLE IF EXISTS staging_medications;
DROP TABLE IF EXISTS staging_examination;

-- demo file
CREATE TABLE staging_demographic (
  SEQN INT NULL,
  SDDSRVYR INT NULL,
  RIAGENDR INT NULL,
  RIDAGEYR INT NULL
);

-- lipids
CREATE TABLE staging_labs (
  SEQN INT NULL,
  LBXTC DECIMAL(10, 2) NULL,
  LBDLDL DECIMAL(10, 2) NULL
);

-- survey qs
CREATE TABLE staging_questionnaire (
  SEQN INT NULL,
  DIQ010 INT NULL,
  BPQ020 INT NULL
);

-- rx list
CREATE TABLE staging_medications (
  SEQN INT NULL,
  RXDDRUG VARCHAR(255) NULL
);

-- vitals-ish
CREATE TABLE staging_examination (
  SEQN INT NULL,
  BMXWT DECIMAL(10, 2) NULL,
  BMXHT DECIMAL(10, 2) NULL,
  BPXSY1 DECIMAL(10, 2) NULL,
  BPXDI1 DECIMAL(10, 2) NULL
);

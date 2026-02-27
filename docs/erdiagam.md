## Overview

In this stage, we present the conceptual and logical design of our Personal Health Record (PHR) database system. 

Following the database design process discussed in lecture:
1. Conceptual Design (ER Model)
2. Logical Design (Relational Schema)
3. Schema Refinement / Normalization (3NF / BCNF)

---

# 1. Conceptual Design (ER Model)

We chose an **ER Diagram** model (not UML).
<img width="796" height="602" alt="Screenshot 2026-02-26 at 7 23 32 PM" src="https://github.com/user-attachments/assets/67926cea-32cb-4d1d-b41c-26905071c478" />
Made the above ER diagram using dbdiagram.io

Our system integrates:
- Application user accounts
- Patient health data (NHANES database)
- Lab test measurements
- Medications
- Conditions

---

## Entities

### 1) UserAccount
Represents login-level application users.

Attributes:
- user_id (Primary Key)
- name
- email

Assumptions:
- One account can manage multiple patients.
- Each patient belongs to exactly one UserAccount.
- Email is unique.

UserAccount contains attributes beyond just a name and participates in relationships. It is not just an attribute of Patient, therefore its an entity.

---

### 2) Patient
A real individual whose data is being stored

Attributes:
- patient_id (Primary Key)
- user_id (FK)
- nhanes_seqn (external identifier)
- birth_year
- sex

Assumptions:
- A patient may have multiple encounters.
- A patient belongs to exactly one UserAccount.

A patient has independent identity and participates in multiple relationships (Encounter, Medication, Condition), therefore entity makes more sense than attribute.

---

### 3) Encounter
Represents a data collection event (exam, questionnaire, lab session).

Attributes:
- encounter_id (Primary Key)
- patient_id (FK)
- encounter_date
- cycle
- encounter_type

Assumptions:
- A patient can have many encounters.
- An encounter belongs to one patient.
- encounter_date may be NULL if unavailable.

Encounter represents a real event and serves as the context for lab results, therefore an entity.

---

### 4) LabTestType
Represents a catalog of lab test definitions.

Attributes:
- test_type_id (Primary Key)
- test_name
- default_unit


Prevents repeating test names and units in every LabResult. This avoids redundancy.

---

### 5) LabResult
Represents a specific measurement taken during an encounter.

Attributes:
- lab_result_id (Primary Key)
- encounter_id (FK)
- test_type_id (FK)
- value
- unit
- result_time

Assumptions:
- One encounter can contain multiple lab results.
- A lab test type appears in many encounters.

This resolves a many-to-many between Encounter and LabTestType.

---

### 6) Drug
Represents a medication catalog.

Attributes:
- drug_id (Primary Key)
- drug_name

Why entity:
Avoids repeating drug names across many patients.

---

### 7) PatientMedication
Represents the relationship between Patient and Drug.

Attributes:
- patient_med_id (Primary Key)
- patient_id (FK)
- drug_id (FK)
- dosage
- start_date
- end_date

Cardinality:
Patient <-> Drug is many-to-many.

This must be an entity because:
- It stores relationship attributes (dosage, dates).

---

### 8) ConditionType
Represents a catalog of medical conditions.

Attributes:
- condition_type_id (Primary Key)
- condition_code
- condition_name

---

### 9) PatientCondition
Represents the relationship between Patient and ConditionType.

Attributes:
- patient_condition_id (Primary Key)
- patient_id (FK)
- condition_type_id (FK)
- status
- cycle

Cardinality:
Patient <-> ConditionType is many-to-many.

---

# 2. Relationship Descriptions and Cardinalities

## UserAccount — Patient
1-to-many  
One account manages multiple patients.
Each patient belongs to one account.

---

## Patient — Encounter
1-to-many  
One patient can have many encounters.
Each encounter belongs to one patient.

---

## Encounter — LabResult
1-to-many  
One encounter contains multiple lab results.

---

## LabTestType — LabResult
1-to-many  
One lab test type appears in many lab results.

Together this resolves a many-to-many between Encounter and LabTestType.

---

## Patient — Drug (via PatientMedication)
Many-to-many  
A patient may take multiple drugs.
A drug may be taken by multiple patients.

---

## Patient — ConditionType (via PatientCondition)
Many-to-many  
A patient may have multiple conditions.
A condition applies to many patients.

---

# 3. Logical Design (Relational Schema)

Formatted exactly as required:

UserAccount(
user_id: INT [PK],
name: VARCHAR(100),
email: VARCHAR(150)
)

Patient(
patient_id: INT [PK],
user_id: INT [FK to UserAccount.user_id],
nhanes_seqn: INT,
birth_year: INT,
sex: CHAR(1)
)

Encounter(
encounter_id: INT [PK],
patient_id: INT [FK to Patient.patient_id],
encounter_date: DATE,
cycle: VARCHAR(20),
encounter_type: VARCHAR(50)
)

LabTestType(
test_type_id: INT [PK],
test_name: VARCHAR(100),
default_unit: VARCHAR(20)
)

LabResult(
lab_result_id: INT [PK],
encounter_id: INT [FK to Encounter.encounter_id],
test_type_id: INT [FK to LabTestType.test_type_id],
value: DECIMAL(10,2),
unit: VARCHAR(20),
result_time: DATETIME
)

Drug(
drug_id: INT [PK],
drug_name: VARCHAR(120)
)

PatientMedication(
patient_med_id: INT [PK],
patient_id: INT [FK to Patient.patient_id],
drug_id: INT [FK to Drug.drug_id],
dosage: VARCHAR(60),
start_date: DATE,
end_date: DATE
)

ConditionType(
condition_type_id: INT [PK],
condition_code: VARCHAR(30),
condition_name: VARCHAR(100)
)

PatientCondition(
patient_condition_id: INT [PK],
patient_id: INT [FK to Patient.patient_id],
condition_type_id: INT [FK to ConditionType.condition_type_id],
status: VARCHAR(30),
cycle: VARCHAR(20)
)

---

# 4. Normalization

We now verify normalization using Functional Dependencies (FDs).

Recall:
A relation is in BCNF if for every nontrivial FD X -> Y, X is a superkey.

For each relation:

UserAccount:
user_id -> name, email  
user_id is a key -> satisfies BCNF.

Patient:
patient_id -> user_id, nhanes_seqn, birth_year, sex  
patient_id is a key -> BCNF.

Encounter:
encounter_id -> patient_id, encounter_date, cycle, encounter_type  


LabTestType:
test_type_id -> test_name, default_unit  


LabResult:
lab_result_id -> encounter_id, test_type_id, value, unit, result_time  


Drug:
drug_id -> drug_name  


PatientMedication:
patient_med_id -> patient_id, drug_id, dosage, start_date, end_date  


ConditionType:
condition_type_id -> condition_code, condition_name  


PatientCondition:
patient_condition_id -> patient_id, condition_type_id, status, cycle  

BCNF is therefore satisfied

---

Since every nontrivial functional dependency in each relation has a key (or superkey) on the left-hand side, no BCNF violations exist. 

Therefore, the schema is in BCNF (and consequently 3NF).

Because the design was derived through entity decomposition (separating LabTestType, Drug, and ConditionType into reference tables), the schema avoids redundancy and update anomalies while preserving dependencies within each relation. The decomposition is lossless.

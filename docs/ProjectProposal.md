# PHR-DB: A Relational Personal Health Record Management System

## Project Summary

Medical records in the United States are highly fragmented across hospitals, laboratories, clinics, and insurance systems. Patients often rely on multiple independent portals to access their information, and these portals do not allow structured querying or relational exploration of records. This fragmentation results in inefficiencies and limited transparency when individuals attempt to review their own medical histories.

Our project proposes the design and implementation of a relational Personal Health Record (PHR) management system. The application will centralize patient data including visits, diagnoses, lab results, medications, and vitals into a well-structured relational database. The system focuses strictly on record organization, relational modeling, constraint enforcement, and SQL-backed querying — not medical diagnosis or advice. The goal is to demonstrate rigorous conceptual and logical database design that supports advanced querying and integrity preservation.

---

## Creative Component

Our creative component is an AI-assisted relational query interface built using a Retrieval-Augmented Generation (RAG) architecture.

This component will:

- Translate controlled natural language queries into SQL.
- Retrieve records using structured SQL queries.
- Perform controlled calculations such as BMI and aggregated lab averages.
- Trigger stored procedures safely through validated inputs.

The AI layer does not provide medical advice. It serves only as an interface between user input and relational tables.

This qualifies as a creative component because:

- It translates structured prompts into validated SQL queries.
- It integrates with stored procedures and triggers.
- It requires schema awareness and constraint compliance.
- It goes beyond a simple UI by programmatically interacting with advanced database functions.

---

## Usefulness

This application addresses the large-scale issue of fragmented medical data storage. Currently, patient portals such as Epic MyChart allow record viewing but do not support structured relational queries, advanced filtering, or aggregated exploration across visits, diagnoses, and laboratory data.

Our system provides:

- Centralized patient record storage.
- Cross-table relational querying.
- Aggregated summaries (e.g., yearly average blood pressure).
- Keyword-based search across diagnoses and medications.
- Integrity constraints to ensure consistent data.

Unlike commercial portals, our system allows structured relational exploration while enforcing database integrity and advanced SQL functionality.

---

## Realness – Data Sources

We will use at least two real datasets.

### 1. MIMIC-IV Clinical Dataset  
- Source: PhysioNet (MIT)
- Format: CSV
- Size: >380,000 patients, millions of lab records
- Attributes: admissions, diagnoses (ICD codes), labs, medications, vitals

We will use a filtered subset (>1,000 records minimum) to satisfy project requirements.

### 2. CDC Public Health Datasets  
- Source: CDC Open Data
- Format: CSV / XLS
- Attributes: chronic disease categories, reference ranges, medication classifications

This dataset will support lookup tables and metadata validation.

Both datasets are publicly accessible and widely used in academic research.

---

## Conceptual Design (Entity-Relationship Model)

Following lecture material on conceptual design :contentReference[oaicite:1]{index=1}, we define:

### Entity Sets

**User**
- user_id (Key)
- name
- email

**Patient**
- patient_id (Key)
- birth_year
- sex

**Visit**
- visit_id (Key)
- admission_date
- discharge_date
- visit_type

**Lab_Test**
- lab_id (Key)
- test_name
- value
- unit
- timestamp

**Medication**
- med_id (Key)
- drug_name
- dosage
- start_date
- end_date

**Diagnosis**
- diagnosis_id (Key)
- icd_code
- description

### Relationship Sets

- User owns Patient (1-to-many)
- Patient has Visit (1-to-many)
- Visit includes Diagnosis (1-to-many)
- Patient has Lab_Test (1-to-many)
- Patient prescribed Medication (1-to-many)

Cardinality constraints follow 0..*, 1..1 patterns taught in lecture :contentReference[oaicite:2]{index=2}.

---

## Logical Design (Relational Schema)

The ER model is translated into relational schema following lecture rules :contentReference[oaicite:3]{index=3}.

```sql
CREATE TABLE User (
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    PRIMARY KEY (user_id)
);

CREATE TABLE Patient (
    patient_id INT NOT NULL,
    user_id INT NOT NULL,
    birth_year INT CHECK (birth_year BETWEEN 1900 AND 2026),
    sex CHAR(1) CHECK (sex IN ('M','F','O')),
    PRIMARY KEY (patient_id),
    FOREIGN KEY (user_id) REFERENCES User(user_id)
);

CREATE TABLE Visit (
    visit_id INT NOT NULL,
    patient_id INT NOT NULL,
    admission_date DATE NOT NULL,
    discharge_date DATE,
    visit_type VARCHAR(50),
    PRIMARY KEY (visit_id),
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id)
);

CREATE TABLE Lab_Test (
    lab_id INT NOT NULL,
    patient_id INT NOT NULL,
    test_name VARCHAR(100) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20),
    timestamp DATETIME,
    PRIMARY KEY (lab_id),
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id)
);

CREATE TABLE Medication (
    med_id INT NOT NULL,
    patient_id INT NOT NULL,
    drug_name VARCHAR(100) NOT NULL,
    dosage VARCHAR(50),
    start_date DATE,
    end_date DATE,
    PRIMARY KEY (med_id),
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id)
);

CREATE TABLE Diagnosis (
    diagnosis_id INT NOT NULL,
    visit_id INT NOT NULL,
    icd_code VARCHAR(20) NOT NULL,
    description VARCHAR(255),
    PRIMARY KEY (diagnosis_id),
    FOREIGN KEY (visit_id) REFERENCES Visit(visit_id)
);

## Constraints

The database will enforce the following constraints:

- Primary Keys
- Foreign Keys
- Domain constraints using `CHECK`
- `NOT NULL` attributes
- `UNIQUE` attributes

These constraints ensure entity integrity, referential integrity, and domain validity as discussed in lecture.

---

## Functionality (CRUD + Search)

### Create

Users will be able to:

- Add new patient
- Insert new visits
- Add lab records
- Add medications
- Add diagnoses

### Read

Users will be able to:

- View full patient history
- View lab trends over time
- Join visits with associated diagnoses
- Aggregate yearly statistics (e.g., average blood pressure)

### Update

Users will be able to:

- Modify lab values
- Update medication end dates
- Edit visit metadata

### Delete

Users will be able to:

- Remove incorrect lab entries
- Remove test patients and associated records

### Keyword Search

The system will support:

- Search by lab test name
- Search by ICD code
- Search by medication name
- Date range filtering for visits and labs

---

## Advanced Database Features (Stage 4)

### Transactions

- Atomic insertion of a Visit and associated Diagnoses.
- Controlled isolation level to prevent inconsistent reads.

### Stored Procedures

- `CalculateBMI(patient_id)`
- Stored procedure to compute aggregated yearly average lab results

### Triggers

- Prevent insertion where `discharge_date < admission_date`
- Automatically flag abnormal lab values based on thresholds

### Constraints

- Primary keys
- Foreign keys
- Domain constraints
- NOT NULL enforcement

All advanced features will be implemented using pure SQL (no ORM).

---

## Low-Fidelity UI Mockup (Description)

### Interface Layout

**Left Sidebar**

- Dashboard
- Patients
- Visits
- Labs
- Medications
- Search
- AI Query

**Main Panel**

- Table views with filter options
- Global search bar
- Lab visualization graph
- Query result panel

The interface prioritizes database functionality and query clarity over aesthetics.

---

## Project Work Distribution

### Pranay Karpuram

- Logical schema design
- Advanced SQL implementation
- Transactions and stored procedures
- RAG-SQL integration

### Akshaj Mehta

- Data ingestion (MIMIC-IV)
- Constraint implementation
- Referential integrity enforcement
- Schema refinement

### Siddhant Shankar

- Frontend CRUD interface
- Keyword search UI
- Result display formatting

### Krishna Vaidya

- Trigger implementation
- Aggregation queries
- CDC dataset integration
- Query optimization

Backend responsibilities are divided across schema design, integrity enforcement, advanced SQL programming, and frontend–database interaction.

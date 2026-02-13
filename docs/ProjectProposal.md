# PHR-DB: A Relational Personal Health Record Management System

## Project Summary

Medical records in the United States are highly fragmented across hospitals, labs, clinics, and insurance providers. Patients often have to log into multiple independent portals just to piece together their own medical history. Even then, these systems rarely allow structured searching or meaningful exploration of records. This lack of integration creates inefficiency, confusion, and limited transparency for individuals trying to understand their own healthcare data.

Our project proposes the design and implementation of a relational Personal Health Record (PHR) management system. The goal is to centralize key patient information — including visits, diagnoses, lab results, medications, and vitals — into a single, well-structured relational database. Rather than focusing on medical recommendations or diagnosis, the system emphasizes strong database design principles: clean relational modeling, well-defined constraints, and powerful SQL-based querying.

---

## Creative Component

Our creative component is an AI-assisted query interface that allows users to interact with the database using natural language. Instead of manually writing SQL queries, users can type requests such as “Show me all cholesterol tests from 2023” or “Calculate BMI for this patient,” and the system will translate those requests into structured SQL queries.

The AI layer is built using a Retrieval-Augmented Generation (RAG) approach. It does not generate medical advice or predictions. Instead, it acts strictly as an interface between user input and the relational database. The system retrieves relevant schema information, constructs validated SQL queries, and executes them safely.

This feature enhances usability while still preserving database integrity. The AI must be aware of the database schema, table relationships, constraints, and stored procedures in order to generate correct queries. It also interacts directly with transactions and stored procedures when users request calculations such as BMI or aggregated yearly lab statistics.

Because it integrates natural language processing with relational database logic, stored procedures, and constraint validation, this component goes beyond a simple interface feature and adds significant technical depth to the application.

---

## Usefulness

Medical data is frequently kept in numerous, poorly connected systems, which is what makes our application so useful and valuable. Most commercial patient portals let users simply view their data but they are unable to perform extensive database queries, combine tables, or filter data in structured ways. To fix these problems, our system has the following features:

- Centralized record storage
- Cross-table relational querying
- Aggregated summaries
- Keyword-based search across diagnoses and medications
- Strong database integrity through constraint enforcement
  Although there are comparable solutions, like Epic MyChart, they do not support relational data exploration or structured SQL-level querying. The main goals of our program include transparency, organized queries, and database integrity.

---

## Realness – Data Sources

For this project, we will use at least two real-world datasets.

### 1. MIMIC-IV Clinical Dataset

This dataset comes from PhysioNet (MIT) and is provided in CSV format. It contains data for over 380,000 patients, along with millions of lab records. The dataset includes information such as hospital admissions, diagnoses (ICD codes), laboratory results, medications, and vital signs.
For our project, we will use a filtered subset of the data (at least 1,000 records) so that it meets the project requirements while still remaining realistic and meaningful.

### 2. CDC Public Health Datasets

This dataset includes information on chronic disease categories, medication classifications, and public health reference ranges.
Similar to MIMIC-IV, this dataset is publicly accessible and widely used in academic research. Using these real-world sources ensures that our project is built on credible and meaningful medical data.

---

## Conceptual Design (Entity-Relationship Model)

E-R Diagram (Made using dbdiagram.io):
<img width="620" height="265" alt="Screenshot 2026-02-13 at 4 39 33 PM" src="https://github.com/user-attachments/assets/9adf1f73-4fba-4e1b-ac7e-a95f6f45f115" />

The system will potentially include the following entity sets (to be finalized):

User

- user_id (Primary Key)
- Name
- email

Patient

- patient_id (Primary Key)
- Birth_year
- sex

Visit

- visit_id (Primary Key)
- Admission_date
- Discharge_date
- visit_type

Lab_Test

- lab_id (Primary Key)
- Test_name
- Value
- Unit
- timestamp

Medication

- med_id (Primary Key)
- Drug_name
- Dosage
- Start_date
- end_date

Diagnosis

- diagnosis_id (Primary Key)
- Icd_code
- description

Relationship sets:

- User owns Patient (1-to-many)
- Patient has Visit (1-to-many)
- Visit includes Diagnosis (1-to-many)
- Patient has Lab_Test (1-to-many)
- Patient prescribed Medication (1-to-many)

---

## Logical Design (Relational Schema)

The ER model is translated into the following relational schema:

User

- user_id INT NOT NULL PRIMARY KEY
- name VARCHAR(100) NOT NULL
- email VARCHAR(150) NOT NULL UNIQUE

Patient

- patient_id INT NOT NULL PRIMARY KEY
- user_id INT NOT NULL
- birth_year INT CHECK (birth_year BETWEEN 1900 AND 2026)
- sex CHAR(1) CHECK (sex IN ('M','F','O'))
- FOREIGN KEY (user_id) REFERENCES User(user_id)

Visit

- visit_id INT NOT NULL PRIMARY KEY
- patient_id INT NOT NULL
- admission_date DATE NOT NULL
- discharge_date DATE
- visit_type VARCHAR(50)
- FOREIGN KEY (patient_id) REFERENCES Patient(patient_id)

Lab_Test

- lab_id INT NOT NULL PRIMARY KEY
- patient_id INT NOT NULL
- test_name VARCHAR(100) NOT NULL
- value DECIMAL(10,2) NOT NULL
- unit VARCHAR(20)
- timestamp DATETIME
- FOREIGN KEY (patient_id) REFERENCES Patient(patient_id)

Medication

- med_id INT NOT NULL PRIMARY KEY
- patient_id INT NOT NULL
- drug_name VARCHAR(100) NOT NULL
- dosage VARCHAR(50)
- start_date DATE
- end_date DATE
- FOREIGN KEY (patient_id) REFERENCES Patient(patient_id)

Diagnosis

- diagnosis_id INT NOT NULL PRIMARY KEY
- visit_id INT NOT NULL
- icd_code VARCHAR(20) NOT NULL
- description VARCHAR(255)
- FOREIGN KEY (visit_id) REFERENCES Visit(visit_id)

Constraints include:

- Primary keys
- Foreign keys
- Domain constraints using CHECK
- NOT NULL attributes
- UNIQUE attributes

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

Some actions involve multiple related inserts. For example, when adding a new visit, we may also insert several diagnoses linked to that visit. These steps must either all succeed or all fail together.

We will use transactions to guarantee this behavior (atomicity). If any step fails, we roll back the entire operation so the database never ends up with partial or inconsistent records.

We will also enable fallbacks for when multiple users/operations run at the same time

### Stored Procedures

Certain calculations and commonly reused queries will live inside the database as stored procedures so they stay consistent and are easy to reuse.
Examples include:

- CalculateBMI(patient_id) — computes BMI using stored height/weight data

- A stored procedure that computes yearly aggregated lab statistics (e.g., average cholesterol per year)

### Triggers

Triggers let the database automatically enforce rules at the moment data is inserted or updated.

We will use triggers to:

Block invalid visit records (e.g., discharge_date < admission_date)

Automatically flag lab results that are outside expected thresholds

### Constraints

To maintain strong data integrity, the database will enforce:

- Primary keys (unique identifiers)

- Foreign keys (valid table relationships)

- Domain constraints (valid ranges/allowed values)

- NOT NULL requirements (no missing required fields)

## All advanced features will be implemented directly in SQL (no ORM).

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
<img width="1146" height="756" alt="Screenshot 2026-02-12 at 2 09 52 PM" src="https://github.com/user-attachments/assets/c6020e9c-afd0-4ac6-bb3e-8d3975b2210f" />
<img width="1154" height="765" alt="Screenshot 2026-02-12 at 2 10 19 PM" src="https://github.com/user-attachments/assets/490521bf-a169-4904-a6db-2f97a60028b4" />

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

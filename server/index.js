import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import patientsRouter from './routes/patients.js';
import analyticsRouter from './routes/analytics.js';
import labsPageRouter from './routes/labsPage.js';
import medicationsPageRouter from './routes/medicationsPage.js';
import conditionsPageRouter from './routes/conditionsPage.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/patients', patientsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/labs', labsPageRouter);
app.use('/api/medications', medicationsPageRouter);
app.use('/api/conditions', conditionsPageRouter);

app.listen(PORT, () => {
  console.log(`PHR-DB API listening on http://localhost:${PORT}`);
});

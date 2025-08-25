import express from 'express';
import cors from 'cors';
import { db, statements } from './database.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Error handler middleware
const errorHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Client endpoints
app.get('/api/clients', errorHandler(async (req, res) => {
    const clients = statements.getAllClients.all();
    res.json(clients);
}));

app.post('/api/clients', errorHandler(async (req, res) => {
    const { id, name, contact, address, notes, createdAt } = req.body;
    statements.insertClient.run(id, name, contact, address, notes, createdAt);
    res.json({ success: true });
}));

app.put('/api/clients/:id', errorHandler(async (req, res) => {
    const { name, contact, address, notes } = req.body;
    statements.updateClient.run(name, contact, address, notes, req.params.id);
    res.json({ success: true });
}));

app.delete('/api/clients/:id', errorHandler(async (req, res) => {
    statements.deleteClient.run(req.params.id);
    res.json({ success: true });
}));

// Project endpoints
app.get('/api/projects/:clientId', errorHandler(async (req, res) => {
    const projects = statements.getProjectsByClientId.all(req.params.clientId);
    res.json(projects);
}));

app.post('/api/projects', errorHandler(async (req, res) => {
    const { id, clientId, name, description, status, createdAt } = req.body;
    statements.insertProject.run(id, clientId, name, description, status, createdAt);
    res.json({ success: true });
}));

app.put('/api/projects/:id', errorHandler(async (req, res) => {
    const { name, description, status } = req.body;
    statements.updateProject.run(name, description, status, req.params.id);
    res.json({ success: true });
}));

app.delete('/api/projects/:id', errorHandler(async (req, res) => {
    statements.deleteProject.run(req.params.id);
    res.json({ success: true });
}));

// Phase endpoints
app.get('/api/phases/:projectId', errorHandler(async (req, res) => {
    const phases = statements.getPhasesByProjectId.all(req.params.projectId);
    res.json(phases);
}));

app.post('/api/phases', errorHandler(async (req, res) => {
    const { id, projectId, name, budget, startDate, endDate, status } = req.body;
    statements.insertPhase.run(id, projectId, name, budget, startDate, endDate, status);
    res.json({ success: true });
}));

app.put('/api/phases/:id', errorHandler(async (req, res) => {
    const { name, budget, startDate, endDate, status } = req.body;
    statements.updatePhase.run(name, budget, startDate, endDate, status, req.params.id);
    res.json({ success: true });
}));

app.delete('/api/phases/:id', errorHandler(async (req, res) => {
    statements.deletePhase.run(req.params.id);
    res.json({ success: true });
}));

// Transaction endpoints
app.get('/api/transactions/:clientId', errorHandler(async (req, res) => {
    const transactions = statements.getTransactionsByClientId.all(req.params.clientId);
    res.json(transactions);
}));

app.get('/api/transactions/project/:projectId', errorHandler(async (req, res) => {
    const transactions = statements.getTransactionsByProjectId.all(req.params.projectId);
    res.json(transactions);
}));

app.post('/api/transactions', errorHandler(async (req, res) => {
    const { id, clientId, projectId, phaseId, date, type, amount, category, description, receiptDataUrl } = req.body;
    statements.insertTransaction.run(id, clientId, projectId, phaseId, date, type, amount, category, description, receiptDataUrl);
    res.json({ success: true });
}));

app.put('/api/transactions/:id', errorHandler(async (req, res) => {
    const { date, type, amount, category, description, receiptDataUrl } = req.body;
    statements.updateTransaction.run(date, type, amount, category, description, receiptDataUrl, req.params.id);
    res.json({ success: true });
}));

app.delete('/api/transactions/:id', errorHandler(async (req, res) => {
    statements.deleteTransaction.run(req.params.id);
    res.json({ success: true });
}));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

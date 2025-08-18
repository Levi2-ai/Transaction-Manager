import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'erp.db'), { verbose: console.log });

// Initialize database tables
function initializeDatabase() {
    // Create clients table
    db.exec(`
        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            contact TEXT,
            address TEXT,
            notes TEXT,
            createdAt TEXT NOT NULL
        )
    `);

    // Create projects table
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            clientId TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
        )
    `);

    // Create phases table
    db.exec(`
        CREATE TABLE IF NOT EXISTS phases (
            id TEXT PRIMARY KEY,
            projectId TEXT NOT NULL,
            name TEXT NOT NULL,
            budget REAL NOT NULL DEFAULT 0,
            startDate TEXT,
            endDate TEXT,
            status TEXT NOT NULL,
            FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
        )
    `);

    // Create transactions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            clientId TEXT NOT NULL,
            projectId TEXT NOT NULL,
            phaseId TEXT,
            date TEXT NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT,
            description TEXT,
            receiptDataUrl TEXT,
            FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
            FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (phaseId) REFERENCES phases(id) ON DELETE SET NULL
        )
    `);

    // Create indices for better performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_projects_clientId ON projects(clientId);
        CREATE INDEX IF NOT EXISTS idx_phases_projectId ON phases(projectId);
        CREATE INDEX IF NOT EXISTS idx_transactions_clientId ON transactions(clientId);
        CREATE INDEX IF NOT EXISTS idx_transactions_projectId ON transactions(projectId);
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    `);
}

// Initialize the database
initializeDatabase();

// Prepared statements for common operations
const statements = {
    // Clients
    insertClient: db.prepare('INSERT INTO clients (id, name, contact, address, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?)'),
    updateClient: db.prepare('UPDATE clients SET name = ?, contact = ?, address = ?, notes = ? WHERE id = ?'),
    deleteClient: db.prepare('DELETE FROM clients WHERE id = ?'),
    getAllClients: db.prepare('SELECT * FROM clients ORDER BY name'),
    getClientById: db.prepare('SELECT * FROM clients WHERE id = ?'),

    // Projects
    insertProject: db.prepare(`
        INSERT INTO projects (id, clientId, name, description, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
    `),
    updateProject: db.prepare('UPDATE projects SET name = ?, description = ?, status = ? WHERE id = ?'),
    deleteProject: db.prepare('DELETE FROM projects WHERE id = ?'),
    getProjectsByClientId: db.prepare('SELECT * FROM projects WHERE clientId = ?'),

    // Phases
    insertPhase: db.prepare(`
        INSERT INTO phases (id, projectId, name, budget, startDate, endDate, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    updatePhase: db.prepare('UPDATE phases SET name = ?, budget = ?, startDate = ?, endDate = ?, status = ? WHERE id = ?'),
    deletePhase: db.prepare('DELETE FROM phases WHERE id = ?'),
    getPhasesByProjectId: db.prepare('SELECT * FROM phases WHERE projectId = ?'),

    // Transactions
    insertTransaction: db.prepare(`
        INSERT INTO transactions (id, clientId, projectId, phaseId, date, type, amount, category, description, receiptDataUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateTransaction: db.prepare(`
        UPDATE transactions 
        SET date = ?, type = ?, amount = ?, category = ?, description = ?, receiptDataUrl = ?
        WHERE id = ?
    `),
    deleteTransaction: db.prepare('DELETE FROM transactions WHERE id = ?'),
    getTransactionsByClientId: db.prepare('SELECT * FROM transactions WHERE clientId = ? ORDER BY date DESC'),
    getTransactionsByProjectId: db.prepare('SELECT * FROM transactions WHERE projectId = ? ORDER BY date DESC')
};

export {
    db,
    statements
};

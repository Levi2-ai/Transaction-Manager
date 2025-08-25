const API_URL = 'http://localhost:3000/api';

export const api = {
    // Clients
    async getClients() {
        const response = await fetch(`${API_URL}/clients`);
        return response.json();
    },

    async createClient(client) {
        const response = await fetch(`${API_URL}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(client)
        });
        return response.json();
    },

    async updateClient(id, client) {
        const response = await fetch(`${API_URL}/clients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(client)
        });
        return response.json();
    },

    async deleteClient(id) {
        const response = await fetch(`${API_URL}/clients/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    // Projects
    async getProjects(clientId) {
        const response = await fetch(`${API_URL}/projects/${clientId}`);
        return response.json();
    },

    async createProject(project) {
        const response = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
        });
        return response.json();
    },

    async updateProject(id, project) {
        const response = await fetch(`${API_URL}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
        });
        return response.json();
    },

    async deleteProject(id) {
        const response = await fetch(`${API_URL}/projects/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    // Phases
    async getPhases(projectId) {
        const response = await fetch(`${API_URL}/phases/${projectId}`);
        return response.json();
    },

    async createPhase(phase) {
        const response = await fetch(`${API_URL}/phases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(phase)
        });
        return response.json();
    },

    async updatePhase(id, phase) {
        const response = await fetch(`${API_URL}/phases/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(phase)
        });
        return response.json();
    },

    async deletePhase(id) {
        const response = await fetch(`${API_URL}/phases/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    // Transactions
    async getTransactions(clientId) {
        const response = await fetch(`${API_URL}/transactions/${clientId}`);
        return response.json();
    },

    async getProjectTransactions(projectId) {
        const response = await fetch(`${API_URL}/transactions/project/${projectId}`);
        return response.json();
    },

    async createTransaction(transaction) {
        const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        });
        return response.json();
    },

    async updateTransaction(id, transaction) {
        const response = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        });
        return response.json();
    },

    async deleteTransaction(id) {
        const response = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    }
};

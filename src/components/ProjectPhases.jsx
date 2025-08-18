import React, { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function ProjectPhases({ project, txns, onSave }) {
  const [phases, setPhases] = useState(project.phases);
  const [isEditing, setIsEditing] = useState(false);

  const phaseSpend = phases.map(phase => {
    const spent = txns
      .filter(t => t.phaseId === phase.id && t.type === 'debit')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    return {
      ...phase,
      spent,
      remaining: Number(phase.budget) - spent
    };
  });

  const handleSave = () => {
    onSave({ ...project, phases });
    setIsEditing(false);
  };

  const addPhase = () => {
    setPhases([...phases, {
      id: crypto.randomUUID(),
      name: '',
      budget: 0,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      status: 'planned'
    }]);
    setIsEditing(true);
  };

  const updatePhase = (id, updates) => {
    setPhases(phases.map(p => p.id === id ? { ...p, ...updates } : p));
    setIsEditing(true);
  };

  const deletePhase = (id) => {
    if (!confirm('Delete this phase? Associated transactions will be preserved.')) return;
    setPhases(phases.filter(p => p.id !== id));
    setIsEditing(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">Project Phases</h3>
        <button
          onClick={addPhase}
          className="ml-auto inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-gray-900 text-white hover:bg-black"
        >
          <Plus size={16}/> Add Phase
        </button>
        {isEditing && (
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-xl border bg-white hover:bg-gray-50"
          >
            <Save size={16}/> Save Changes
          </button>
        )}
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer>
          <BarChart data={phaseSpend}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value) => inr(value)}
              labelFormatter={(name) => `Phase: ${name}`}
            />
            <Bar dataKey="spent" name="Spent" fill="#4B5563" />
            <Bar dataKey="remaining" name="Remaining" fill="#E5E7EB" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {phases.map(phase => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            spent={phaseSpend.find(p => p.id === phase.id)?.spent || 0}
            onUpdate={(updates) => updatePhase(phase.id, updates)}
            onDelete={() => deletePhase(phase.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PhaseCard({ phase, spent, onUpdate, onDelete }) {
  const progress = phase.budget ? (spent / Number(phase.budget)) * 100 : 0;
  const isOverBudget = spent > Number(phase.budget);

  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <input
          value={phase.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Phase Name"
          className="font-medium bg-transparent border-b border-dashed focus:border-solid focus:outline-none"
        />
        <div className="ml-auto flex items-center gap-2">
          <select
            value={phase.status}
            onChange={(e) => onUpdate({ status: e.target.value })}
            className="px-2 py-1 rounded-lg border text-sm"
          >
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <button
            onClick={onDelete}
            className="p-1 rounded-lg hover:bg-red-50 text-red-600"
          >
            <Trash2 size={16}/>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={phase.budget}
              onChange={(e) => onUpdate({ budget: e.target.value })}
              placeholder="Budget"
              className="w-32 px-2 py-1 rounded-lg border"
            />
            <span className="text-sm text-gray-500">budget</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={phase.startDate}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
              className="px-2 py-1 rounded-lg border"
            />
            <span className="text-sm text-gray-500">start</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={phase.endDate}
              onChange={(e) => onUpdate({ endDate: e.target.value })}
              className="px-2 py-1 rounded-lg border"
            />
            <span className="text-sm text-gray-500">end</span>
          </div>
        </div>

        <div>
          <div className="text-sm">
            <span className="text-gray-500">Spent: </span>
            <span className={isOverBudget ? 'text-red-600 font-medium' : ''}>
              {inr(spent)}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Remaining: </span>
            <span className={isOverBudget ? 'text-red-600 font-medium' : ''}>
              {inr(Number(phase.budget) - spent)}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${
                isOverBudget ? 'bg-red-500' : 'bg-gray-600'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n || 0));

export default ProjectPhases;

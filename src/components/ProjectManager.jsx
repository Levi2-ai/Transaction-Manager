import React, { useState } from 'react';
import { Plus, Save, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

function ProjectManager({ client, projects, onSave, onEdit }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newProject, setNewProject] = useState(null);

  const handleAddProject = () => {
    setNewProject({
      name: '',
      description: '',
      status: 'active',
      phases: [{
        name: 'Planning',
        budget: 0,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        status: 'planned'
      }]
    });
  };

  const handleSave = () => {
    if (!newProject.name) return;
    onSave({
      ...newProject,
      clientId: client.id,
      createdAt: new Date().toISOString()
    });
    setNewProject(null);
  };

  return (
    <div className="border rounded-xl p-4 bg-white">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        <h3 className="font-semibold">Projects ({projects.length})</h3>
        <button
          onClick={(e) => { e.stopPropagation(); handleAddProject(); }}
          className="ml-auto inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-gray-900 text-white hover:bg-black"
        >
          <Plus size={16}/> Add Project
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} onEdit={() => onEdit(project)} />
          ))}

          {newProject && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="border rounded-xl p-4"
            >
              <div className="space-y-3">
                <Input
                  label="Project Name"
                  value={newProject.name}
                  onChange={v => setNewProject({...newProject, name: v})}
                  autoFocus
                />
                <TextArea
                  label="Description"
                  value={newProject.description}
                  onChange={v => setNewProject({...newProject, description: v})}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-black"
                  >
                    <Save size={16}/> Save Project
                  </button>
                  <button
                    onClick={() => setNewProject(null)}
                    className="px-3 py-2 rounded-xl border"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onEdit }) {
  const totalBudget = project.phases.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const phaseCount = project.phases.length;
  const activePhases = project.phases.filter(p => p.status === 'in-progress').length;

  return (
    <div className="border rounded-xl p-4 hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <div>
          <h4 className="font-medium">{project.name}</h4>
          <p className="text-sm text-gray-500 mt-1">{project.description}</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-sm font-medium">{inr(totalBudget)}</div>
          <div className="text-xs text-gray-500">{activePhases}/{phaseCount} phases active</div>
        </div>
        <button
          onClick={onEdit}
          className="px-3 py-1 rounded-xl border hover:bg-white"
        >
          Manage
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", autoFocus = false }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={e => onChange(e.target.value)}
        type={type}
        className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
      />
    </label>
  );
}

const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n || 0));

export default ProjectManager;

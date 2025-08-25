import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Save, Download, Upload, Search, Trash2, FileDown, IndianRupee, Users, Receipt, 
  ArrowDownRight, ArrowUpRight, ChevronRight, ChevronLeft, BarChart2, X } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ProjectManager, ProjectPhases, AdvancedReporting, ImportWizard } from './components';
import { createDailyBackup, listBackups, restoreBackup } from '../src/utils/backup';

/**********************
 * Client Transaction Manager
 * Single-file React app
 * - TailwindCSS for styling
 * - LocalStorage for persistence (no server required)
 * - Feature set:
 *   • Add/Edit clients
 *   • Record Credits (money received) & Debits (money used)
 *   • Category-level breakdowns for Debits
 *   • Per-client balances & statements
 *   • Attach receipt images (optional)
 *   • Search, filter, sort
 *   • Export/Import backup (JSON)
 *   • PDF statement export via print dialog
 **********************/

/************** Utilities **************/
const uid = () => (crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n || 0));
const todayStr = () => new Date().toISOString().slice(0, 10);

const LS_KEY = "ctm:v1:data";

/************** Data Model **************
Data shape in localStorage:
{
  clients: Client[]
  projects: Project[]
  txns: Txn[]
}
Client = {
  id: string
  name: string
  contact: string
  address: string
  notes: string
  createdAt: string
}
Project = {
  id: string
  clientId: string
  name: string
  description: string
  status: 'active' | 'completed' | 'on-hold'
  phases: Phase[]
  createdAt: string
}
Phase = {
  id: string
  name: string
  budget: number
  startDate: string
  endDate: string
  status: 'planned' | 'in-progress' | 'completed'
}
Txn = {
  id: string
  projectId: string
  phaseId: string
  date: string
  type: 'credit' | 'debit'
  amount: number
  category?: string
  description?: string
  receiptDataUrl?: string
  gst?: {
    rate: number
    amount: number
  }
}
****************************************/ 

function useLocalData() {
  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      let parsed = raw ? JSON.parse(raw) : { clients: [], projects: [], txns: [] };
      
      // Handle migration from old data structure
      if (raw && !parsed.projects) {
        parsed = migrateOldData(parsed);
      }
      
      // Ensure projects array exists
      if (!parsed.projects) {
        parsed.projects = [];
      }
      
      // Save migrated/fixed data
      localStorage.setItem(LS_KEY, JSON.stringify(parsed));
      return parsed;
    } catch (err) {
      console.error('Error loading data:', err);
      return { clients: [], projects: [], txns: [] };
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    createDailyBackup(data);
  }, [data]);

  return [data, setData];
}

// Migrate data from old structure to new structure
function migrateOldData(oldData) {
  const projects = oldData.clients.map(client => ({
    id: uid(),
    clientId: client.id,
    name: client.project || 'Main Project',
    description: '',
    status: 'active',
    phases: [{
      id: uid(),
      name: 'General',
      budget: 0,
      startDate: client.createdAt.slice(0, 10),
      endDate: '',
      status: 'in-progress'
    }],
    createdAt: client.createdAt
  }));

  // Create a map for quick lookup of project IDs by client ID
  const projectMap = new Map(projects.map(p => [p.clientId, p.id]));

  // Update transactions to reference projects instead of clients
  const updatedTxns = oldData.txns.map(txn => ({
    ...txn,
    projectId: projectMap.get(txn.clientId) || projects[0]?.id || '',
    phaseId: projects.find(p => p.id === projectMap.get(txn.clientId))?.phases[0]?.id || '',
    gst: null
  }));

  // Remove project field from clients
  const updatedClients = oldData.clients.map(({ project, ...client }) => client);

  return {
    clients: updatedClients,
    projects,
    txns: updatedTxns
  };
}

/************** Components **************/
function Header({ onAddClient, onExport, onImportClick, onShowReports, onAddProject }) {
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-gray-900 text-white"><Users size={18} /></div>
          <h1 className="text-xl font-semibold">Client Transaction Manager</h1>
          <span className="hidden sm:inline text-xs px-2 py-1 rounded-full bg-gray-100">Civil Projects</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={onShowReports} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border hover:bg-gray-50">
            <BarChart2 size={16}/> Reports
          </button>
          <button onClick={onAddClient} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-gray-900 text-white hover:bg-black">
            <Plus size={16}/> Add Client
          </button>
          <button onClick={onAddProject} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-gray-900 text-white hover:bg-black">
            <Plus size={16}/> Add Project
          </button>
          <button onClick={onExport} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border hover:bg-gray-50">
            <Download size={16}/> Export
          </button>
          <button onClick={onImportClick} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border hover:bg-gray-50">
            <Upload size={16}/> Import
          </button>
        </div>
      </div>
    </header>
  );
}

function SummaryCards({ clients, txns }) {
  const totals = useMemo(() => {
    const byClient = new Map();
    clients.forEach(c => byClient.set(c.id, { credit: 0, debit: 0 }));
    txns.forEach(t => {
      const r = byClient.get(t.clientId);
      if (!r) return;
      if (t.type === 'credit') r.credit += Number(t.amount || 0);
      if (t.type === 'debit') r.debit += Number(t.amount || 0);
    });
    let totalCredit = 0, totalDebit = 0;
    for (const r of byClient.values()) { totalCredit += r.credit; totalDebit += r.debit; }
    return { totalCredit, totalDebit, net: totalCredit - totalDebit };
  }, [clients, txns]);

  return (
    <section className="grid sm:grid-cols-3 gap-3">
      <Card title="Total Received" icon={<ArrowUpRight />} value={inr(totals.totalCredit)} sub="All clients" />
      <Card title="Total Spent" icon={<ArrowDownRight />} value={inr(totals.totalDebit)} sub="All categories" />
      <Card title="Net Balance" icon={<IndianRupee />} value={inr(totals.net)} sub="Available across clients" />
    </section>
  );
}

function Card({ title, value, sub, icon }) {
  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        <div className="p-3 rounded-xl bg-gray-900 text-white">{icon}</div>
      </div>
    </div>
  );
}

function ClientDrawer({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(() => initial || { name: "", contact: "", project: "", address: "", notes: "" });
  useEffect(() => { setForm(initial || { name: "", contact: "", project: "", address: "", notes: "" }); }, [initial]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.aside initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} className="absolute right-0 top-0 h-full w-full sm:w-[440px] bg-white shadow-2xl p-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><ChevronRight /></button>
          <h3 className="text-lg font-semibold">{initial ? 'Edit Client' : 'New Client'}</h3>
        </div>
        <div className="space-y-3">
          <Input label="Client Name" value={form.name} onChange={v => setForm({ ...form, name: v })} autoFocus/>
          <Input label="Contact" value={form.contact} onChange={v => setForm({ ...form, contact: v })} />
          <Input label="Project" value={form.project} onChange={v => setForm({ ...form, project: v })} />
          <TextArea label="Address" value={form.address} onChange={v => setForm({ ...form, address: v })} />
          <TextArea label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
          <div className="pt-2 flex gap-2">
            <button onClick={() => onSave(form)} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-gray-900 text-white hover:bg-black"><Save size={16}/> Save</button>
            <button onClick={onClose} className="px-3 py-2 rounded-2xl border">Cancel</button>
          </div>
        </div>
      </motion.aside>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", autoFocus=false }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <input autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value)} type={type} className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900" />
    </label>
  );
}
function TextArea({ label, value, onChange }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900" />
    </label>
  );
}

function ReceiptUploader({ onPick }) {
  const inputRef = useRef(null);
  const handle = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onPick(reader.result);
    reader.readAsDataURL(f);
  }
  return (
    <div>
      <input ref={inputRef} onChange={handle} type="file" accept="image/*" className="hidden"/>
      <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border hover:bg-gray-50"><Receipt size={16}/> Attach Receipt</button>
    </div>
  );
}

function TransactionForm({ clients = [], onAdd, data = {} }) {
  const [form, setForm] = useState({ 
    clientId: clients[0]?.id || "", 
    projectId: "",
    phaseId: "",
    date: todayStr(), 
    type: "debit", 
    amount: "", 
    category: "", 
    description: "", 
    receiptDataUrl: "" 
  });

  // Get available projects for selected client
  const availableProjects = useMemo(() => {
    return (data.projects || []).filter(p => p.clientId === form.clientId);
  }, [data.projects, form.clientId]);

  // Update form when client changes
  useEffect(() => { 
    if (!form.clientId && clients[0]) {
      setForm(f => ({ ...f, clientId: clients[0].id }));
    }
  }, [clients]);

  // Reset project when client changes
  useEffect(() => {
    setForm(f => ({ ...f, projectId: "", phaseId: "" }));
  }, [form.clientId]);

  const add = () => {
    if (!form.clientId) {
      return alert("Please select a client.");
    }
    if (!form.projectId) {
      return alert("Please select a project.");
    }
    if (!form.type || !form.amount || Number(form.amount) <= 0) {
      return alert("Please fill all required fields.");
    }
    if (form.type === 'debit' && !form.category) {
      return alert("Please choose a category for debit.");
    }
    onAdd({ ...form, id: uid() });
    setForm({ 
      clientId: form.clientId, 
      projectId: form.projectId,
      phaseId: form.phaseId,
      date: todayStr(), 
      type: form.type, 
      amount: "", 
      category: "", 
      description: "", 
      receiptDataUrl: "" 
    });
  }

  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <h3 className="font-semibold mb-3">Add Transaction</h3>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="text-gray-600">Client</span>
          <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="">Select Client</option>
            {clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-gray-600">Project</span>
          <select 
            value={form.projectId} 
            onChange={e => setForm({ ...form, projectId: e.target.value })} 
            className="mt-1 w-full rounded-xl border px-3 py-2"
          >
            <option value="">Select Project</option>
            {availableProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <Input label="Date" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
        <label className="text-sm">
          <span className="text-gray-600">Type</span>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="credit">Credit (Received)</option>
            <option value="debit">Debit (Spent)</option>
          </select>
        </label>
        <Input label="Amount (₹)" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} />
        {form.type === 'debit' && (
          <label className="text-sm">
            <span className="text-gray-600">Category</span>
            <div className="mt-1">
              <CategorySelect 
                value={form.category} 
                onChange={category => setForm({ ...form, category })}
              />
            </div>
          </label>
        )}
        <Input label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <ReceiptUploader onPick={(url) => setForm({ ...form, receiptDataUrl: url })} />
        <div className="ml-auto flex gap-2">
          <button onClick={add} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-gray-900 text-white hover:bg-black"><Plus size={16}/> Add</button>
        </div>
      </div>
      {form.receiptDataUrl && (
        <div className="mt-3">
          <img src={form.receiptDataUrl} alt="Receipt preview" className="max-h-40 rounded-xl border"/>
        </div>
      )}
    </div>
  );
}

const DEFAULT_CATEGORIES = [
  "Cement", "Steel", "Bricks", "Sand & Aggregate", "Plumbing", "Electrical", "Tiles & Marble", 
  "Woodwork", "Paint", "Labour", "Design & Drawings", "Site Overheads", "Miscellaneous"
];

function CategorySelect({ value, onChange }) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");

  useEffect(() => {
    // Reset custom state when value changes externally
    if (!value) {
      setIsCustom(false);
      setCustomValue("");
    } else if (!DEFAULT_CATEGORIES.includes(value)) {
      setIsCustom(true);
      setCustomValue(value);
    }
  }, [value]);

  const handleSelectChange = (e) => {
    const newValue = e.target.value;
    if (newValue === "custom") {
      setIsCustom(true);
      setCustomValue("");
      onChange("");
    } else {
      setIsCustom(false);
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <select 
        value={isCustom ? "custom" : value} 
        onChange={handleSelectChange}
        className="w-full rounded-xl border px-3 py-2"
      >
        <option value="">Select</option>
        {DEFAULT_CATEGORIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
        <option value="custom">+ Add New Category</option>
      </select>
      {isCustom && (
        <input
          type="text"
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="Enter new category"
          className="w-full rounded-xl border px-3 py-2"
          autoFocus
        />
      )}
    </div>
  );
}

function ClientsPanel({ data, onOpenClient, query, setQuery }) {
  const rows = useMemo(() => {
    const lc = (query||"").toLowerCase();
    return data.map(calcClientSummary).filter(r => [r.client.name, r.client.project, r.client.contact].join(" ").toLowerCase().includes(lc));
  }, [data, query]);

  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold">Clients</h3>
        <div className="ml-auto relative">
          <Search className="absolute left-2 top-2.5" size={16}/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name / project / contact" className="pl-8 pr-3 py-2 rounded-xl border"/>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Client</th>
              <th>Project</th>
              <th className="text-right">Received</th>
              <th className="text-right">Spent</th>
              <th className="text-right">Balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.client.id} className="border-t hover:bg-gray-50">
                <td className="py-2">
                  <div className="font-medium">{r.client.name}</div>
                  <div className="text-xs text-gray-500">{r.client.contact}</div>
                </td>
                <td>{r.client.project}</td>
                <td className="text-right">{inr(r.credit)}</td>
                <td className="text-right">{inr(r.debit)}</td>
                <td className={`text-right font-medium ${r.balance<0? 'text-red-600':'text-emerald-700'}`}>{inr(r.balance)}</td>
                <td className="text-right">
                  <button 
                    onClick={() => {
                      onOpenClient(r.client.id);
                      console.log("Setting active client:", r.client.id);
                    }} 
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-xl border"
                  >
                    <ChevronLeft className="-rotate-180" size={16}/> Open
                  </button>
                </td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No clients yet. Click "Add Client" to begin.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function calcClientSummary({ client, txns }) {
  let credit = 0, debit = 0;
  txns.forEach(t => { if (t.type==='credit') credit += Number(t.amount||0); if (t.type==='debit') debit += Number(t.amount||0); });
  return { client, credit, debit, balance: credit - debit };
}

function ClientDetail({ client, data, projects, txns, onAddTxn, onDeleteTxn, onDeleteClient, onSaveProject }) {
  const [filter, setFilter] = useState("all");
  const [activeProject, setActiveProject] = useState(null);

  const summary = useMemo(() => calcClientSummary({ client, txns }), [client, txns]);
  const categories = useMemo(() => {
    const map = new Map();
    txns.filter(t=>t.type==='debit').forEach(t => {
      const k = t.category || 'Uncategorised';
      map.set(k, (map.get(k)||0) + Number(t.amount||0));
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [txns]);

  const visible = useMemo(() => txns.filter(t => filter==='all' ? true : t.type===filter).sort((a,b)=>a.date.localeCompare(b.date)), [txns, filter]);

  const printRef = useRef(null);
  const printStatement = () => {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const head = `
      <html>
        <head>
          <title>Statement - ${client.name}</title>
          <style>
            body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;}
            table{border-collapse: collapse; width: 100%;}
            th,td{border:1px solid #ddd; padding:6px; font-size:12px}
            th{background:#f6f6f6}
          </style>
        </head>
        <body>${html}</body>
      </html>`;
    const w = window.open("", "_blank");
    w.document.write(head);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold">{client.name}</h3>
        <span className="text-xs text-gray-500">{client.project}</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={printStatement} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border hover:bg-gray-50"><FileDown size={16}/> Print / PDF</button>
          <button onClick={() => onDeleteClient(client.id)} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border text-red-600 hover:bg-red-50"><Trash2 size={16}/> Delete Client</button>
        </div>
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        <Card title="Received" value={inr(summary.credit)} sub="from client" icon={<ArrowUpRight/>}/>
        <Card title="Spent" value={inr(summary.debit)} sub="on project" icon={<ArrowDownRight/>}/>
        <Card title="Balance" value={inr(summary.balance)} sub="available" icon={<IndianRupee/>}/>
        <div className="rounded-2xl border p-3">
          <div className="text-sm text-gray-600 mb-2">Expense Mix</div>
          <div className="h-40">
            {categories.length>0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} dataKey="value" nameKey="name" outerRadius={70}>
                    {categories.map((entry, index) => (
                      <Cell key={index} fill={`hsl(${index * 25}, 70%, 50%)`} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-400">No debits yet</div>
            )}
          </div>
        </div>
      </div>

      <ProjectManager
        client={client}
        projects={data.projects.filter(p => p.clientId === client.id)}
        onSave={onSaveProject}
        onEdit={setActiveProject}
      />

      {activeProject && (
        <ProjectPhases
          project={activeProject}
          txns={txns.filter(t => t.projectId === activeProject.id)}
          onSave={(updatedProject) => {
            onSaveProject(updatedProject);
            setActiveProject(updatedProject);
          }}
        />
      )}

      <div className="mt-4 flex items-center gap-2">
        <span className="text-sm text-gray-600">Filter:</span>
        {['all','credit','debit'].map(f => (
          <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1 rounded-xl border text-sm ${filter===f ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}>{f}</button>
        ))}
      </div>

      <div className="overflow-x-auto mt-2" ref={printRef}>
        <div className="text-right text-xs text-gray-500 mb-1">Statement Date: {new Date().toLocaleString()}</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Category</th>
              <th className="text-right">Amount</th>
              <th>Receipt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(t => (
              <tr key={t.id} className="border-t hover:bg-gray-50">
                <td className="py-2">{t.date}</td>
                <td className="capitalize">{t.type}</td>
                <td>{t.description}</td>
                <td>{t.type==='debit' ? (t.category||'-') : '-'}</td>
                <td className={`text-right ${t.type==='debit' ? 'text-red-600' : 'text-emerald-700'}`}>{inr(t.amount)}</td>
                <td>{t.receiptDataUrl ? <a href={t.receiptDataUrl} target="_blank" rel="noreferrer" className="underline text-blue-600">View</a> : '-'}</td>
                <td className="text-right">
                  <button onClick={()=>onDeleteTxn(t.id)} className="p-1 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
            {visible.length===0 && (
              <tr><td colSpan={7} className="text-center py-6 text-gray-400">No transactions</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BackupControls({ onExport, onImportClick }) {
  const [backups, setBackups] = useState([]);
  const [showBackups, setShowBackups] = useState(false);

  useEffect(() => {
    const backupsList = listBackups();
    setBackups(backupsList);
  }, []);

  const handleRestore = (backupKey) => {
    try {
      if (confirm('Are you sure you want to restore this backup? Current data will be replaced.')) {
        if (restoreBackup(backupKey)) {
          alert('Backup restored successfully! Page will reload.');
          window.location.reload();
        } else {
          alert('Failed to restore backup.');
        }
      }
    } catch (err) {
      console.error('Restore error:', err);
      alert('Failed to restore backup: ' + err.message);
    }
  };

  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <h3 className="font-semibold mb-2">Backup & Restore</h3>
      <div className="flex gap-2 mb-3">
        <button onClick={onExport} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border hover:bg-gray-50">
          <Download size={16}/> Export JSON
        </button>
        <button onClick={onImportClick} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border hover:bg-gray-50">
          <Upload size={16}/> Import JSON
        </button>
        <button 
          onClick={() => setShowBackups(!showBackups)} 
          className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border hover:bg-gray-50"
        >
          <Receipt size={16}/> {showBackups ? 'Hide' : 'Show'} Local Backups
        </button>
      </div>
      
      {showBackups && backups.length > 0 && (
        <div className="border rounded-xl p-2 max-h-60 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {backups.map(({ date, key }) => (
                <tr key={key} className="border-t">
                  <td className="py-2">{new Date(date).toLocaleDateString()}</td>
                  <td className="text-right">
                    <button
                      onClick={() => handleRestore(key)}
                      className="px-3 py-1 rounded-xl border text-sm hover:bg-gray-50"
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/************** Main App **************/
export default function App() {
  const [data, setData] = useLocalData();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [query, setQuery] = useState("");
  const [activeClientId, setActiveClientId] = useState(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState(null);
  const fileRef = useRef(null);

  // Derived view model
  const clientsVM = useMemo(() => (data?.clients || []).map(c => ({ 
    client: c, 
    txns: (data?.txns || []).filter(t => t.clientId === c.id) 
  })), [data]);
  
  const activeClient = useMemo(() => {
    const client = data?.clients?.find(c => c.id === activeClientId) || null;
    console.log("Active client ID:", activeClientId, "Found client:", client);
    return client;
  }, [data, activeClientId]);
  
  const activeTxns = useMemo(() => 
    (data?.txns || []).filter(t => t.clientId === activeClientId),
    [data, activeClientId]
  );

  const openAddClient = () => { setEditClient(null); setDrawerOpen(true); };
  const handleSaveClient = (form) => {
    if (!form.name) return alert("Client name is required.");
    if (editClient) {
      setData(d => ({ ...d, clients: d.clients.map(c => c.id===editClient.id ? { ...c, ...form } : c) }));
      setActiveClientId(editClient.id);
    } else {
      const id = uid();
      const client = { id, ...form, createdAt: new Date().toISOString() };
      setData(d => ({ ...d, clients: [...d.clients, client] }));
      // Ensure the new client is selected
      setActiveClientId(id);
    }
    setDrawerOpen(false);
  };

  const addTxn = (txn) => setData(d => ({ ...d, txns: [...d.txns, txn] }));
  const deleteTxn = (id) => setData(d => ({ ...d, txns: d.txns.filter(t => t.id !== id) }));
  const deleteClient = (id) => {
    if (!confirm("Delete client and all associated data (projects, transactions)?")) return;
    setData(d => ({
      ...d,
      clients: (d.clients || []).filter(c => c.id !== id),
      projects: (d.projects || []).filter(p => p.clientId !== id),
      txns: (d.txns || []).filter(t => t.clientId !== id)
    }));
    if (activeClientId === id) setActiveClientId(null);
  }

  const doExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ctm-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const onImportClick = () => setShowImportWizard(true);
  const handleImport = (importedData) => {
    setData(current => ({
      clients: [...current.clients, ...importedData.clients],
      projects: [...current.projects, ...importedData.projects],
      txns: [...current.txns, ...importedData.txns]
    }));
  };

  const handleSaveProject = (projectData) => {
    setData(current => {
      // Ensure projects array exists
      const currentProjects = current.projects || [];
      
      // If project has no ID, it's new
      const newProject = !projectData.id;
      const projectToSave = newProject 
        ? { ...projectData, id: crypto.randomUUID() }
        : projectData;

      return {
        ...current,
        projects: currentProjects.some(p => p.id === projectToSave.id)
          ? currentProjects.map(p => p.id === projectToSave.id ? projectToSave : p)
          : [...currentProjects, projectToSave]
      };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onAddClient={openAddClient} 
        onExport={doExport} 
        onImportClick={onImportClick}
        onShowReports={() => setShowReports(true)}
        onAddProject={() => {
          setShowNewProject(true);
          setNewProjectForm({});
        }}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <SummaryCards clients={data.clients} txns={data.txns} />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TransactionForm clients={data.clients} onAdd={addTxn} data={data} />
            {activeClientId && activeClient ? (
              <ClientDetail 
                client={activeClient} 
                data={data}
                projects={data.projects.filter(p => p.clientId === activeClient.id)}
                txns={activeTxns} 
                onAddTxn={addTxn} 
                onDeleteTxn={deleteTxn} 
                onDeleteClient={deleteClient}
                onSaveProject={handleSaveProject}
              />
            ) : (
              <div className="rounded-2xl border p-6 bg-white text-sm text-gray-500">
                Select a client from the list to view statement.
              </div>
            )}
          </div>

          <div className="space-y-6">
            <ClientsPanel data={clientsVM} onOpenClient={setActiveClientId} query={query} setQuery={setQuery} />
            <BackupControls onExport={doExport} onImportClick={onImportClick} />
          </div>
        </div>
      </main>

      <AnimatePresence>
        {drawerOpen && (
          <ClientDrawer 
            open={drawerOpen} 
            onClose={()=>setDrawerOpen(false)} 
            onSave={handleSaveClient} 
            initial={editClient} 
          />
        )}

        {showNewProject && (
          <div className="fixed inset-0 bg-black/30 z-50">
            <div className="absolute inset-8 bg-white rounded-2xl shadow-2xl p-6 overflow-y-auto max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">New Project</h2>
                <button onClick={() => setShowNewProject(false)} className="p-2 rounded-full hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="text-gray-600">Client *</span>
                  <select 
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    value={newProjectForm?.clientId || ''}
                    onChange={e => setNewProjectForm(prev => ({ ...prev, clientId: e.target.value }))}
                  >
                    <option value="">Select Client</option>
                    {data.clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Project Name *"
                  value={newProjectForm?.name || ''}
                  onChange={v => setNewProjectForm(prev => ({ ...prev, name: v }))}
                />
                <TextArea
                  label="Description"
                  value={newProjectForm?.description || ''}
                  onChange={v => setNewProjectForm(prev => ({ ...prev, description: v }))}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <button 
                    onClick={() => {
                      if (!newProjectForm?.clientId || !newProjectForm?.name) {
                        alert('Please select a client and enter project name');
                        return;
                      }
                      handleSaveProject({
                        ...newProjectForm,
                        status: 'active',
                        phases: [{
                          id: crypto.randomUUID(),
                          name: 'Phase 1',
                          budget: 0,
                          startDate: new Date().toISOString().slice(0, 10),
                          endDate: '',
                          status: 'planned'
                        }],
                        createdAt: new Date().toISOString()
                      });
                      setShowNewProject(false);
                      setNewProjectForm(null);
                    }}
                    className="px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-black"
                  >
                    Create Project
                  </button>
                  <button 
                    onClick={() => setShowNewProject(false)}
                    className="px-4 py-2 border rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {showReports && (
          <div className="fixed inset-0 bg-black/30 z-50">
            <div className="absolute inset-8 bg-white rounded-2xl shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Advanced Reports</h2>
                <button onClick={() => setShowReports(false)} className="p-2 rounded-full hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <AdvancedReporting data={data} />
            </div>
          </div>
        )}

        {showImportWizard && (
          <ImportWizard 
            onImport={handleImport}
            onClose={() => setShowImportWizard(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, Check, X } from 'lucide-react';

function ImportWizard({ onImport, onClose }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({
    clients: {},
    projects: {},
    transactions: {}
  });
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isJson = file.name.endsWith('.json');
    if (!isJson) {
      alert('Unsupported file type. Please select a JSON file.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // Check for the expected structure
        if (!data || !Array.isArray(data.clients) || !Array.isArray(data.projects) || !Array.isArray(data.txns)) {
          throw new Error('Invalid JSON format. Expected keys: clients, projects, txns.');
        }

        setFile(file);
        // For preview, we'll show transactions for now
        setPreview({
          headers: data.txns.length > 0 ? Object.keys(data.txns[0]) : [],
          rows: data.txns.slice(0, 5).map(obj => Object.values(obj)), // Preview first 5 rows of transactions
          fullData: data // Store the full parsed data for import
        });
        setStep(2);
      } catch (err) {
        alert('Error reading file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const processImport = async () => {
    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = preview.fullData; // Use the fullData stored during file selection
        
        // The data is already in the correct structure, so no further transformation or mapping is needed here.
        // We just need to ensure onImport can handle this structure.
        onImport(data);
        onClose();
      };
      reader.readAsText(file);
    } catch (err) {
      alert('Import failed: ' + err.message);
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50">
      <div className="absolute inset-8 bg-white rounded-2xl shadow-2xl p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Import Data</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
              <X />
            </button>
          </div>

          <div className="space-y-8">
            {step === 1 && (
              <div className="text-center py-12">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black"
                >
                  <Upload size={20}/> Select JSON File
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  Supported format: .json
                </p>
              </div>
            )}

            {step === 2 && preview && (
              <>
                <div className="space-y-6">
                  <section>
                    <h3 className="font-semibold mb-3">Map Client Fields</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {['name', 'contact', 'address', 'notes'].map(field => (
                        <div key={field} className="flex items-center gap-2">
                          <label className="block text-sm">
                            <span className="text-gray-600 capitalize">{field}</span>
                            <select
                              value={mapping.clients[field] || ''}
                              onChange={e => setMapping({
                                ...mapping,
                                clients: { ...mapping.clients, [field]: e.target.value }
                              })}
                              className="mt-1 w-full rounded-xl border px-3 py-2"
                            >
                              <option value="">Don't Import</option>
                              {preview.headers.map((h, i) => (
                                <option key={i} value={h}>{h}</option>
                              ))}
                            </select>
                          </label>
                          {field === 'name' && !mapping.clients.name && (
                            <AlertCircle className="text-amber-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-3">Map Project Fields</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {['name', 'description', 'status'].map(field => (
                        <div key={field} className="flex items-center gap-2">
                          <label className="block text-sm">
                            <span className="text-gray-600 capitalize">{field}</span>
                            <select
                              value={mapping.projects[field] || ''}
                              onChange={e => setMapping({
                                ...mapping,
                                projects: { ...mapping.projects, [field]: e.target.value }
                              })}
                              className="mt-1 w-full rounded-xl border px-3 py-2"
                            >
                              <option value="">Don't Import</option>
                              {preview.headers.map((h, i) => (
                                <option key={i} value={h}>{h}</option>
                              ))}
                            </select>
                          </label>
                          {field === 'name' && !mapping.projects.name && (
                            <AlertCircle className="text-amber-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="font-semibold mb-3">Map Transaction Fields</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {['date', 'type', 'amount', 'category', 'description'].map(field => (
                        <div key={field} className="flex items-center gap-2">
                          <label className="block text-sm">
                            <span className="text-gray-600 capitalize">{field}</span>
                            <select
                              value={mapping.transactions[field] || ''}
                              onChange={e => setMapping({
                                ...mapping,
                                transactions: { ...mapping.transactions, [field]: e.target.value }
                              })}
                              className="mt-1 w-full rounded-xl border px-3 py-2"
                            >
                              <option value="">Don't Import</option>
                              {preview.headers.map((h, i) => (
                                <option key={i} value={h}>{h}</option>
                              ))}
                            </select>
                          </label>
                          {(field === 'date' || field === 'amount') && 
                            !mapping.transactions[field] && (
                              <AlertCircle className="text-amber-500" />
                            )}
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="border rounded-xl p-4">
                    <h4 className="font-medium mb-2">Data Preview</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500">
                            {preview.headers.map((h, i) => (
                              <th key={i} className="py-2 pr-4">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map((row, i) => (
                            <tr key={i} className="border-t">
                              {row.map((cell, j) => (
                                <td key={j} className="py-2 pr-4">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl border"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={processImport}
                      disabled={importing || !mapping.clients.name}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-50"
                    >
                      {importing ? 'Importing...' : (
                        <><Check size={20}/> Start Import</>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportWizard;

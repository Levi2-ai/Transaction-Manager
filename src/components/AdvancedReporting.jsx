import React, { useState, useMemo } from 'react';
import { Download, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

function AdvancedReporting({ data }) {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10)
  });

  const [view, setView] = useState('monthly'); // monthly, quarterly, custom
  const [exportFormat, setExportFormat] = useState('json'); // json, xlsx, csv

  const filteredTxns = useMemo(() => {
    return data.txns.filter(t => 
      t.date >= dateRange.start && 
      t.date <= dateRange.end
    );
  }, [data.txns, dateRange]);

  const monthlyData = useMemo(() => {
    const months = new Map();
    filteredTxns.forEach(t => {
      const month = t.date.slice(0, 7);
      if (!months.has(month)) {
        months.set(month, { credit: 0, debit: 0 });
      }
      const entry = months.get(month);
      if (t.type === 'credit') entry.credit += Number(t.amount);
      else entry.debit += Number(t.amount);
    });
    return Array.from(months, ([month, data]) => ({
      month,
      ...data,
      net: data.credit - data.debit
    })).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredTxns]);

  const categoryData = useMemo(() => {
    const categories = new Map();
    filteredTxns
      .filter(t => t.type === 'debit')
      .forEach(t => {
        const cat = t.category || 'Uncategorized';
        categories.set(cat, (categories.get(cat) || 0) + Number(t.amount));
      });
    return Array.from(categories, ([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);
  }, [filteredTxns]);

  const projectData = useMemo(() => {
    const projects = new Map();
    filteredTxns.forEach(t => {
      if (!projects.has(t.projectId)) {
        const project = data.projects.find(p => p.id === t.projectId);
        projects.set(t.projectId, {
          name: project?.name || 'Unknown',
          credit: 0,
          debit: 0
        });
      }
      const entry = projects.get(t.projectId);
      if (t.type === 'credit') entry.credit += Number(t.amount);
      else entry.debit += Number(t.amount);
    });
    return Array.from(projects.values())
      .map(p => ({ ...p, net: p.credit - p.debit }))
      .sort((a, b) => b.debit - a.debit);
  }, [filteredTxns, data.projects]);

  const exportReport = () => {
    const report = {
      dateRange,
      summary: {
        totalCredit: filteredTxns.reduce((sum, t) => t.type === 'credit' ? sum + Number(t.amount) : sum, 0),
        totalDebit: filteredTxns.reduce((sum, t) => t.type === 'debit' ? sum + Number(t.amount) : sum, 0),
      },
      monthlyTrends: monthlyData,
      categoryBreakdown: categoryData,
      projectPerformance: projectData,
      transactions: filteredTxns.map(t => {
        const project = data.projects.find(p => p.id === t.projectId);
        const phase = project?.phases.find(p => p.id === t.phaseId);
        return {
          date: t.date,
          type: t.type,
          amount: t.amount,
          project: project?.name,
          phase: phase?.name,
          category: t.category,
          description: t.description
        };
      })
    };

    const fileName = `financial-report-${dateRange.start}-to-${dateRange.end}`;

    if (exportFormat === 'json') {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (exportFormat === 'xlsx') {
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const wsSummary = XLSX.utils.json_to_sheet([
        { key: 'Date Range Start', value: report.dateRange.start },
        { key: 'Date Range End', value: report.dateRange.end },
        { key: 'Total Credit', value: report.summary.totalCredit },
        { key: 'Total Debit', value: report.summary.totalDebit },
      ]);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Monthly Trends Sheet
      const wsMonthly = XLSX.utils.json_to_sheet(report.monthlyTrends);
      XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly Trends');

      // Category Breakdown Sheet
      const wsCategory = XLSX.utils.json_to_sheet(report.categoryBreakdown);
      XLSX.utils.book_append_sheet(wb, wsCategory, 'Category Breakdown');

      // Project Performance Sheet
      const wsProject = XLSX.utils.json_to_sheet(report.projectPerformance);
      XLSX.utils.book_append_sheet(wb, wsProject, 'Project Performance');

      // Transactions Sheet
      const wsTransactions = XLSX.utils.json_to_sheet(report.transactions);
      XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transactions');

      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else if (exportFormat === 'csv') {
      const csvContent = [];

      // Summary
      csvContent.push(`"Summary"`);
      csvContent.push(`"Date Range Start","${report.dateRange.start}"`);
      csvContent.push(`"Date Range End","${report.dateRange.end}"`);
      csvContent.push(`"Total Credit","${report.summary.totalCredit}"`);
      csvContent.push(`"Total Debit","${report.summary.totalDebit}"`);
      csvContent.push('');

      // Monthly Trends
      csvContent.push(`"Monthly Trends"`);
      csvContent.push(Object.keys(report.monthlyTrends[0] || {}).map(key => `"${key}"`).join(','));
      report.monthlyTrends.forEach(row => {
        csvContent.push(Object.values(row).map(value => `"${value}"`).join(','));
      });
      csvContent.push('');

      // Category Breakdown
      csvContent.push(`"Category Breakdown"`);
      csvContent.push(Object.keys(report.categoryBreakdown[0] || {}).map(key => `"${key}"`).join(','));
      report.categoryBreakdown.forEach(row => {
        csvContent.push(Object.values(row).map(value => `"${value}"`).join(','));
      });
      csvContent.push('');

      // Project Performance
      csvContent.push(`"Project Performance"`);
      csvContent.push(Object.keys(report.projectPerformance[0] || {}).map(key => `"${key}"`).join(','));
      report.projectPerformance.forEach(row => {
        csvContent.push(Object.values(row).map(value => `"${value}"`).join(','));
      });
      csvContent.push('');

      // Transactions
      csvContent.push(`"Transactions"`);
      csvContent.push(Object.keys(report.transactions[0] || {}).map(key => `"${key}"`).join(','));
      report.transactions.forEach(row => {
        csvContent.push(Object.values(row).map(value => `"${value}"`).join(','));
      });

      const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar size={20} />
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 rounded-xl border"
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 rounded-xl border"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={view}
            onChange={e => setView(e.target.value)}
            className="px-3 py-2 rounded-xl border"
          >
            <option value="monthly">Monthly View</option>
            <option value="quarterly">Quarterly View</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={exportFormat}
            onChange={e => setExportFormat(e.target.value)}
            className="px-3 py-2 rounded-xl border"
          >
            <option value="json">JSON</option>
            <option value="xlsx">XLSX</option>
            <option value="csv">CSV</option>
          </select>
        </div>
        <button
          onClick={exportReport}
          className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl border hover:bg-gray-50"
        >
          <Download size={16}/> Export Report
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="border rounded-xl p-4">
          <h3 className="font-semibold mb-4">Cash Flow Trends</h3>
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={monthlyData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={value => inr(value)} />
                <Line type="monotone" dataKey="credit" name="Credit" stroke="#047857" />
                <Line type="monotone" dataKey="debit" name="Debit" stroke="#DC2626" />
                <Line type="monotone" dataKey="net" name="Net" stroke="#1F2937" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border rounded-xl p-4">
          <h3 className="font-semibold mb-4">Expense Categories</h3>
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={categoryData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={value => inr(value)} />
                <Bar dataKey="value" fill="#4B5563">
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={`hsl(${index * 25}, 70%, 50%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="border rounded-xl p-4">
        <h3 className="font-semibold mb-4">Project Performance</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Project</th>
              <th className="text-right">Income</th>
              <th className="text-right">Expense</th>
              <th className="text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {projectData.map((p, i) => (
              <tr key={i} className="border-t">
                <td className="py-2">{p.name}</td>
                <td className="text-right text-emerald-700">{inr(p.credit)}</td>
                <td className="text-right text-red-600">{inr(p.debit)}</td>
                <td className={`text-right font-medium ${p.net < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {inr(p.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n || 0));

export default AdvancedReporting;

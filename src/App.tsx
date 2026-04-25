import React, { useEffect, useState } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { useState, useEffect, FormEvent } from 'react';
import { 
  Users, 
  Briefcase, 
  MapPin, 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  ChevronRight,
  Search,
  Filter,
  Download,
  Activity,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  X,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Employee {
  "id": string | number;
  "sn": number;
  "level": string;
  "employee_no": string;
  "employee_name": string;
  "department": string;
  "recommended_for": string;
  "date_of_joining": string;
  "designation": string;
  "gender": string;
  "dob": string;
  "qualification": string;
  "nationality": string;
  "kpi": string;
  "project": string;
  "line_manager": string;
  "area_manager": string;
  "bu_manager": string;
  "tbms_designation": string;
  "assigned_to": string;
  "project_code": string;
}

interface Stats {
  kpiDistribution: Record<string, number>;
  employeesPerProject: Record<string, number>;
  qualificationBreakdown: Record<string, number>;
}

export default function App() {
  const [projects, setProjects] = useState<string[]>([]);
  const [lineManagers, setLineManagers] = useState<string[]>([]);
  const [areaManagers, setAreaManagers] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedLineManager, setSelectedLineManager] = useState('');
  const [selectedAreaManager, setSelectedAreaManager] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Admin Portal State
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminSearchResults, setAdminSearchResults] = useState<Employee[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setFirebaseStatus(data))
      .catch(err => console.error('Health check failed:', err));

   

const db = getFirestore();

async function loadProjects() {
  try {
    const snapshot = await getDocs(collection(db, "projects"));
    const data = snapshot.docs.map(doc => doc.data());

    setProjects(data);
    setError(null);
  } catch (err) {
    console.error(err);
    setError(err.message);
    setProjects([]);
  }
}

loadProjects();
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setProjects([]);
        } else if (Array.isArray(data)) {
          setProjects(data);
          setError(null);
        } else {
          setProjects([]);
        }
      })
      .catch(err => {
        console.error('Projects fetch error:', err);
        setError('Connection failed. Please check your firestore secrets.');
      });
    
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setStats(data);
        } else if (data && data.error) {
          console.warn('Stats API reported error:', data.error);
        }
      })
      .catch(err => console.error('Stats fetch error:', err));
  }, []);

  useEffect(() => {
    if (selectedProject) {
      setLoading(true);
      fetch(`/api/line-managers?project=${encodeURIComponent(selectedProject)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.error) {
            setError(data.error);
            setLineManagers([]);
          } else if (Array.isArray(data)) {
            setLineManagers(data);
            setError(null);
          } else {
            setLineManagers([]);
          }
          setSelectedLineManager('');
          setAreaManagers([]);
          setSelectedAreaManager('');
          setEmployees([]);
          setLoading(false);
        })
        .catch(err => setError('Failed to fetch line managers.'));
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedLineManager) {
      setLoading(true);
      fetch(`/api/area-managers?line_manager=${encodeURIComponent(selectedLineManager)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.error) {
            setError(data.error);
            setAreaManagers([]);
          } else if (Array.isArray(data)) {
            setAreaManagers(data);
            setError(null);
          } else {
            setAreaManagers([]);
          }
          setSelectedAreaManager('');
          setEmployees([]);
          setLoading(false);
        })
        .catch(err => setError('Failed to fetch area managers.'));
    }
  }, [selectedLineManager]);

  useEffect(() => {
    if (selectedAreaManager) {
      setLoading(true);
      fetch(`/api/employees?area_manager=${encodeURIComponent(selectedAreaManager)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.error) {
            setError(data.error);
            setEmployees([]);
          } else if (Array.isArray(data)) {
            setEmployees(data);
            setError(null);
          } else {
            setEmployees([]);
          }
          setLoading(false);
        })
        .catch(err => setError('Failed to fetch employees.'));
    }
  }, [selectedAreaManager]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      const delayDebounceFn = setTimeout(() => {
        setSearchLoading(true);
        fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setSearchResults(data);
            }
            setSearchLoading(false);
          })
          .catch(err => {
            console.error('Search error:', err);
            setSearchLoading(false);
          });
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (adminSearchTerm.length >= 2) {
      const delayDebounceFn = setTimeout(() => {
        fetch(`/api/search?q=${encodeURIComponent(adminSearchTerm)}`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setAdminSearchResults(data);
          })
          .catch(err => console.error('Admin search error:', err));
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setAdminSearchResults([]);
    }
  }, [adminSearchTerm]);

  const handleSaveEmployee = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingEmployee?.employee_no) return;
    setFormLoading(true);
    
    const method = editingEmployee.id ? 'PUT' : 'POST';
    const url = editingEmployee.id ? `/api/employees/${editingEmployee.employee_no}` : '/api/employees';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEmployee)
      });
      const data = await res.json();
      if (data.success) {
        setShowEmployeeForm(false);
        setEditingEmployee(null);
        // Refresh stats/search if needed
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee record?')) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAdminSearchResults(prev => prev.filter(emp => emp.employee_no !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const activeEmployeeList = searchTerm.length >= 2 ? searchResults : employees;

  const exactMatch = searchResults.find(emp => 
    (emp.employee_no || "").toLowerCase() === searchTerm.toLowerCase()
  );

  const filteredEmployees = activeEmployeeList.filter(emp => {
    const name = (emp.employee_name || "").toLowerCase();
    const id = (emp.employee_no || "").toLowerCase();
    const dept = (emp.department || "").toLowerCase();
    const query = searchTerm.toLowerCase();
    return name.includes(query) || id.includes(query) || dept.includes(query);
  });

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmjqIjLT1M9XvjYDBcYbm2BSr5Q-AxtJYg0g&s" 
              alt="Trojan Logo" 
              className="h-16 w-auto object-contain rounded"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${error || (firebaseStatus && !firebaseStatus.firebaseInitialized) ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
                  {error ? `Error: ${error}` : 
                   (firebaseStatus && !firebaseStatus.firebaseInitialized) ? 'Setup Required: Firebase Issue' : 
                   `Connected: Firebase DB (${firebaseStatus?.tableInfo?.count || 0} rows)`}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['Dashboard', 'Reports', 'Documentation', 'Settings'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                  activeTab === tab 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {activeTab === 'Dashboard' && (
            <>
              {/* Filter Section - STICKY */}
              <section className="bg-white p-5 rounded-xl shadow-md border border-slate-200 flex flex-col md:flex-row items-end gap-6 sticky top-0 z-40">
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Briefcase className="w-3 h-3" /> Project
            </label>
            <select 
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full filter-select"
            >
              <option value="">Select Project</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex-1 w-full space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Line Manager
            </label>
            <select 
              value={selectedLineManager}
              disabled={!selectedProject}
              onChange={(e) => setSelectedLineManager(e.target.value)}
              className="w-full filter-select disabled:opacity-50"
            >
              <option value="">Select Line Manager</option>
              {lineManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex-1 w-full space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Area Manager
            </label>
            <select 
              value={selectedAreaManager}
              disabled={!selectedLineManager}
              onChange={(e) => setSelectedAreaManager(e.target.value)}
              className="w-full filter-select disabled:opacity-50"
            >
              <option value="">Select Area Manager</option>
              {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          
          <div className="w-12 h-10 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
            <Filter className="w-5 h-5 text-slate-400" />
          </div>
        </section>

        {/* Bento Grid */}
        <div className="grid grid-cols-12 gap-6 pb-12">
          
          {/* Main List - Left Side */}
          <section className="col-span-12 lg:col-span-8 space-y-6">
            
            {/* Exact Match Detail View */}
            <AnimatePresence>
              {exactMatch && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl shadow-lg border-2 border-indigo-500 overflow-hidden"
                >
                  <div className="bg-indigo-600 px-6 py-4 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Direct Match Found</div>
                        <h3 className="text-lg font-bold">Employee Full Profile</h3>
                      </div>
                    </div>
                    <div className="text-xs font-mono bg-white/10 px-2 py-1 rounded">
                      {exactMatch.employee_no}
                    </div>
                  </div>
                  
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Basic Information</div>
                        <div className="space-y-2">
                          <p className="text-sm"><span className="text-slate-500 font-medium">Name:</span> <span className="font-bold text-slate-800">{exactMatch.employee_name}</span></p>
                          <p className="text-sm"><span className="text-slate-500 font-medium">Gender:</span> <span className="font-bold text-slate-800">{exactMatch.gender}</span></p>
                          <p className="text-sm"><span className="text-slate-500 font-medium">Nationality:</span> <span className="font-bold text-slate-800">{exactMatch.nationality}</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Professional Details</div>
                        <div className="space-y-2">
                          <p className="text-sm"><span className="text-slate-500 font-medium">Department:</span> <span className="font-bold text-slate-800">{exactMatch.department}</span></p>
                          <p className="text-sm"><span className="text-slate-500 font-medium">Designation:</span> <span className="font-bold text-slate-800">{exactMatch.designation}</span></p>
                          <p className="text-sm"><span className="text-slate-500 font-medium">Level:</span> <span className="font-bold text-slate-800">{exactMatch.level}</span></p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assignment & Management</div>
                        <div className="space-y-2">
                          <p className="text-sm truncate"><span className="text-slate-500 font-medium">Project:</span> <span className="font-bold text-slate-800">{exactMatch.project}</span></p>
                          <p className="text-sm"><span className="text-slate-500 font-medium">Line Manager:</span> <span className="font-bold text-slate-800">{exactMatch.line_manager}</span></p>
                          <p className="text-sm"><span className="text-slate-500 font-medium">KPI Score:</span> <span className="font-bold text-indigo-600">{exactMatch.kpi}%</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bento-card flex flex-col min-h-[500px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Employee Performance Roster</h2>
                  <div className="text-xs text-slate-400 font-medium">
                    {searchTerm.length >= 2 ? `Showing search results for "${searchTerm}"` : 
                     selectedAreaManager ? `Showing results for ${selectedAreaManager}` : 'Select hierarchy or search globally'}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search name, ID, dept..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                      >
                        ✕
                      </button>
                    )}
                    {searchLoading && (
                      <div className="absolute right-8 top-1/2 -translate-y-1/2">
                        <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-left text-sm border-t border-slate-100">
                <thead className="bg-slate-50/50">
                  <tr className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3">ID / Employee</th>
                    <th className="px-5 py-3 text-center">KPI Score</th>
                    <th className="px-5 py-3">Qualification</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence initial={false}>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center">
                          <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </td>
                      </tr>
                    ) : filteredEmployees.length > 0 ? (
                      filteredEmployees.map((emp) => (
                        <motion.tr 
                          key={emp.employee_no}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-700 font-bold text-sm uppercase">
                                {(emp.employee_name || "?").charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800">{emp.employee_name}</div>
                                <div className="text-[10px] font-mono text-slate-400 tracking-tight">{emp.employee_no}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="text-xs font-bold text-slate-700">{emp.kpi || '0'}%</div>
                              <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                {(() => {
                                  const score = parseFloat(emp.kpi || '0') || 0;
                                  return (
                                    <div 
                                      className={`h-full rounded-full ${
                                        score > 80 ? 'bg-emerald-500' : score > 60 ? 'bg-indigo-500' : 'bg-rose-400'
                                      }`}
                                      style={{ width: `${score}%` }}
                                    ></div>
                                  );
                                })()}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wide">
                              {emp.qualification}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right underline underline-offset-2">
                            <button 
                              onClick={() => setSearchTerm(emp.employee_no)}
                              className="text-indigo-600 font-bold text-xs hover:text-indigo-800 transition-colors"
                            >
                              Details
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-slate-400 text-xs italic">
                          {selectedAreaManager ? 'No employees matches search criteria.' : 'Please select a hierarchy above to view data.'}
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div className="mt-auto pt-4 flex justify-between items-center border-t border-slate-100">
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <button key={i} className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold ${i === 1 ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' : 'text-slate-400 hover:bg-slate-100'}`}>{i}</button>
                ))}
              </div>
              <button className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1 group">
                Next Page <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </section>

          {/* Right Side Column */}
          <div className="col-span-12 lg:col-span-4 grid grid-cols-1 gap-6">
            
            {/* Summary Tag */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bento-card bg-indigo-900 border-none text-white relative overflow-hidden group h-36 flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users className="w-20 h-20 rotate-12" />
              </div>
              <div className="relative z-10">
                <h2 className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1">Active Headcount</h2>
                <div className="text-3xl font-bold flex items-baseline gap-2">
                  {stats ? Object.values(stats.employeesPerProject).reduce((a: number, b: number) => a + b, 0).toLocaleString() : '0'} 
                  <span className="text-emerald-400 text-xs font-semibold">+0.0%</span>
                </div>
              </div>
              <div className="relative z-10 flex gap-4">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-tight">Avg KPI</div>
                  <div className="text-lg font-bold text-white">
                    {stats ? Math.round((Object.entries(stats.kpiDistribution) as [string, number][]).reduce((acc: number, [range, count]) => {
                      const mid = range === '0-60' ? 30 : range === '61-80' ? 70 : 90;
                      return acc + (mid * count);
                    }, 0) / Math.max(1, (Object.values(stats.kpiDistribution) as number[]).reduce((a: number, b: number) => a + b, 0))) : 0}%
                  </div>
                </div>
                <div className="space-y-0.5 border-l border-indigo-700 pl-4">
                  <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-tight">Active Projects</div>
                  <div className="text-lg font-bold text-white">{projects.length}</div>
                </div>
              </div>
            </motion.div>

            {/* KPI Distribution */}
            {stats && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bento-card h-[280px] flex flex-col"
              >
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-500" /> KPI Score Levels
                </h3>
                <div className="flex-1 min-h-0">
                  <Bar 
                    data={{
                      labels: Object.keys(stats.kpiDistribution),
                      datasets: [{
                        data: Object.values(stats.kpiDistribution),
                        backgroundColor: ['#f87171', '#fbbf24', '#10b981'],
                        borderRadius: 4,
                        barThickness: 32
                      }]
                    }}
                    options={{
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { 
                        y: { display: false }, 
                        x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' as const }, color: '#94a3b8' } } 
                      }
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* Qualifications */}
            {stats && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bento-card h-[280px] flex flex-col"
              >
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <PieChartIcon className="w-3.5 h-3.5 text-indigo-500" /> Qualification Share
                </h3>
                <div className="flex-1 relative flex items-center">
                  <div className="w-full h-40">
                    <Pie 
                      data={{
                        labels: Object.keys(stats.qualificationBreakdown),
                        datasets: [{
                          data: Object.values(stats.qualificationBreakdown),
                          backgroundColor: ['#6366f1', '#818cf8', '#a5b4fc', '#e2e8f0'],
                          borderWidth: 0
                        }]
                      }}
                      options={{
                        maintainAspectRatio: false,
                        plugins: { 
                          legend: { 
                            position: 'right' as const, 
                            labels: { boxWidth: 8, usePointStyle: true, font: { size: 10, weight: 'bold' as const }, color: '#64748b' } 
                          } 
                        }
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </>
    )}

          {activeTab === 'Documentation' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bento-card">
                <div className="mb-8 pb-6 border-b border-slate-100 flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">HSE Leadership & Documentation</h2>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-50 flex items-center justify-center p-6 rounded-2xl border border-slate-100 overflow-hidden">
                    <img 
                      src="https://procurement.trojanholding.ae/Styles/Images/trojanconstructiongroupalllogo.png" 
                      alt="Trojan Construction Group" 
                      className="w-full max-w-2xl h-auto object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    {
                      name: "Ahmed Mohamed Abbas Ahmed",
                      role: "HSSE Manager",
                      dept: "HSE Department",
                      project: "Trojan HQ",
                      email: "ahmed.abbas@trojanholding.com",
                      img: "https://media.licdn.com/dms/image/v2/C4D03AQG_2PVLqp894g/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1655174534836?e=1778716800&v=beta&t=CI5DMnpbVpj8ED7tFmYiPttn4-bAx-m_i1t-ymsP2Ds",
                      gradient: "from-indigo-500 to-indigo-700"
                    },
                    {
                      name: "Amal Jagadi",
                      role: "HSE Manager",
                      dept: "HSE Department",
                      project: "Trojan HQ",
                      email: "amal.j@npc.ae",
                      img: "https://media.licdn.com/dms/image/v2/D4E03AQHdfMf-x-xIAw/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1718246131677?e=1778716800&v=beta&t=FGhvZ2Qvwc8B0J0YXo7IyJS1dCaNPbNE52n-gZwMM5s",
                      gradient: "from-slate-700 to-slate-900"
                    },
                    {
                      name: "Irshad Basha Syed",
                      role: "Safety Engineer",
                      dept: "NPC",
                      project: "Zayed National Museum",
                      id: "TG2082",
                      email: "irshad.syed@npc.ae",
                      gradient: "from-emerald-500 to-emerald-700"
                    },
                    {
                      name: "Vidyaasree Vijayakrishnan",
                      role: "HSE Analyst",
                      dept: "Trojan",
                      id: "TR101847",
                      email: "vidyaasree.v@trojan.ae",
                      gradient: "from-blue-500 to-blue-700"
                    },
                    {
                      name: "Alshifa Najiminisa Sajeer",
                      role: "HSE Admin",
                      dept: "Trojan",
                      id: "TR101838",
                      email: "alshifa.s@trojan.ae",
                      gradient: "from-purple-500 to-purple-700"
                    },
                    {
                      name: "Alejandro Llaguno",
                      role: "HSE Admin",
                      dept: "Trojan",
                      email: "alejandro.l@trojan.ae",
                      gradient: "from-amber-500 to-amber-700"
                    },
                    {
                      name: "Muhammad Shahbaz Muhammad Ilyas",
                      role: "Safety Engineer",
                      dept: "Trojan",
                      email: "m.shahbaz@trojan.ae",
                      gradient: "from-rose-500 to-rose-700"
                    },
                    {
                      name: "Mohammed Razal",
                      role: "HSE Officer",
                      dept: "Trojan",
                      email: "m.razal@trojan.ae",
                      gradient: "from-cyan-500 to-cyan-700"
                    }
                  ].map((profile, i) => (
                    <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                      <div className={`h-24 bg-gradient-to-r ${profile.gradient}`}></div>
                      <div className="px-6 pb-6 -mt-12 text-center">
                        <div className="relative inline-block mb-3">
                          {profile.img ? (
                            <img 
                              src={profile.img} 
                              alt={profile.name}
                              className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md group-hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-2xl bg-slate-100 border-4 border-white shadow-md flex items-center justify-center text-slate-400 font-bold text-3xl group-hover:scale-105 transition-transform">
                              {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white"></div>
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm mb-0.5 line-clamp-1">{profile.name}</h3>
                        <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-wider mb-3 leading-tight">{profile.role}</p>
                        
                        <div className="flex justify-center mb-4">
                          <a 
                            href={`mailto:${profile.email}`}
                            className="bg-slate-50 hover:bg-indigo-50 p-2 rounded-lg text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 flex items-center gap-2 group/btn"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold text-slate-500 group-hover/btn:text-indigo-600">{profile.email.split('@')[0]}</span>
                          </a>
                        </div>

                        <div className="space-y-1 pt-3 border-t border-slate-50 text-left">
                          <p className="text-[10px] flex justify-between"><span className="text-slate-400 font-medium">Dept:</span> <span className="font-bold text-slate-700">{profile.dept}</span></p>
                          {profile.project && <p className="text-[10px] flex justify-between"><span className="text-slate-400 font-medium">Project:</span> <span className="font-bold text-slate-700 truncate ml-2">{profile.project}</span></p>}
                          {profile.id && <p className="text-[10px] flex justify-between"><span className="text-slate-400 font-medium">ID:</span> <span className="font-bold text-slate-700">{profile.id}</span></p>}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Documentation Links */}
                  <div className="flex flex-col gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Standard Operating Procedures</h4>
                      <div className="space-y-2">
                        {['Incident Reporting Protocol', 'Site Access Control V2', 'Emergency Evacuation Plan'].map((doc) => (
                          <div key={doc} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between hover:border-indigo-200 transition-colors cursor-pointer group">
                            <span className="text-[10px] font-bold text-slate-600 group-hover:text-indigo-600">{doc}</span>
                            <Download className="w-3.5 h-3.5 text-slate-300" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Reports' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bento-card">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Safety & Performance Reports</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {['HSE Performance Q1', 'Individual KPI Breakdown', 'Project Safety Audit', 'Incident Frequency Rate', 'Workforce Training Status'].map((report) => (
                    <div key={report} className="p-4 border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-slate-50 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                          <BarChart3 className="w-5 h-5" />
                        </div>
                        <Download className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      </div>
                      <h3 className="font-bold text-slate-700 mb-1">{report}</h3>
                      <p className="text-[10px] text-slate-400 font-medium">Generated: Apr 25, 2026 • 2.4MB PDF</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Settings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bento-card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-800">System Settings</h2>
                  <button 
                    onClick={() => setIsAdminMode(!isAdminMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      isAdminMode 
                        ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                        : 'bg-indigo-600 text-white shadow-sm'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {isAdminMode ? 'Exit Admin Portal' : 'Enter Admin Portal'}
                  </button>
                </div>

                {!isAdminMode ? (
                  <div className="max-w-xl space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <h4 className="font-bold text-slate-700">Real-time Analytics</h4>
                        <p className="text-xs text-slate-400">Sync with Firebase every 5 seconds</p>
                      </div>
                      <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
                        <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <h4 className="font-bold text-slate-700">Audit Logging</h4>
                        <p className="text-xs text-slate-400">Track all employee detail modifications</p>
                      </div>
                      <div className="w-10 h-5 bg-slate-300 rounded-full relative">
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          placeholder="Search for employee to manage..."
                          value={adminSearchTerm}
                          onChange={(e) => setAdminSearchTerm(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          setEditingEmployee({});
                          setShowEmployeeForm(true);
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Add New Employee
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50">
                          <tr className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <th className="px-5 py-3">Employee No / Name</th>
                            <th className="px-5 py-3">Project</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {adminSearchResults.length > 0 ? adminSearchResults.map(emp => (
                            <tr key={emp.employee_no} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3">
                                <div className="font-bold text-slate-800">{emp.employee_name}</div>
                                <div className="text-[10px] text-slate-400">{emp.employee_no}</div>
                              </td>
                              <td className="px-5 py-3 text-slate-500 text-xs">{emp.project}</td>
                              <td className="px-5 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => {
                                      setEditingEmployee(emp);
                                      setShowEmployeeForm(true);
                                    }}
                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteEmployee(emp.employee_no)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={3} className="px-5 py-8 text-center text-slate-400 text-xs italic">
                                Search for an employee to manage their record.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Employee Edit/Create Modal */}
          <AnimatePresence>
            {showEmployeeForm && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
                >
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">
                      {editingEmployee?.id ? 'Edit Employee Record' : 'Create New Employee Record'}
                    </h3>
                    <button onClick={() => setShowEmployeeForm(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSaveEmployee} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Employee Number</label>
                        <input 
                          type="text"
                          required
                          disabled={!!editingEmployee?.id}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={editingEmployee?.employee_no || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, employee_no: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                        <input 
                          type="text"
                          required
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={editingEmployee?.employee_name || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, employee_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</label>
                        <input 
                          type="text"
                          required
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={editingEmployee?.department || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, department: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Designation</label>
                        <input 
                          type="text"
                          required
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={editingEmployee?.designation || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, designation: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Project</label>
                        <input 
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={editingEmployee?.project || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, project: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Line Manager</label>
                        <input 
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={editingEmployee?.line_manager || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, line_manager: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Area Manager</label>
                        <input 
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={editingEmployee?.area_manager || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, area_manager: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Qualification</label>
                        <input 
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={editingEmployee?.qualification || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, qualification: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">KPI Score (%)</label>
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={editingEmployee?.kpi || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, kpi: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                      <button 
                        type="button" 
                        onClick={() => setShowEmployeeForm(false)}
                        className="px-6 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={formLoading}
                        className="px-8 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {formLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        Save Employee Record
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Firebase Live Sync Active
            </p>
          </div>
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab('Documentation')}
              className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'Documentation' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5' : 'text-slate-400 hover:text-indigo-600'}`}
            >
              Documentation
            </button>
            <button 
              onClick={() => setActiveTab('Reports')}
              className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'Reports' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5' : 'text-slate-400 hover:text-indigo-600'}`}
            >
              Support
            </button>
            <button 
              onClick={() => setActiveTab('Reports')}
              className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'Reports' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5' : 'text-slate-400 hover:text-indigo-600'}`}
            >
              Safety Report
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

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
  User,
  X,
  Mail,
  Github,
  Moon,
  Sun,
  Camera,
  LogIn,
  LogOut,
  RefreshCw
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
import { PieChart, Pie as RePie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend as ReLegend } from 'recharts';


// Firebase imports
import { initializeApp } from 'firebase/app';
import { 
  getAuth
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDoc,
  getDocs,
  query, 
  where,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
  "email": string;
}

interface Stats {
  kpiDistribution: Record<string, number>;
  employeesPerProject: Record<string, number>;
  qualificationBreakdown: Record<string, number>;
  designationBreakdown: Record<string, number>;
}

interface ManagementProfile {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  department: string;
  officeLocation: string;
  photoUrl?: string;
  updatedAt?: string;
}

export default function App() {
  const [projects, setProjects] = useState<string[]>([]);
  const [lineManagers, setLineManagers] = useState<string[]>([]);
  const [areaManagers, setAreaManagers] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  // Admin Portal State
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  // Global stats - always visible
  const [globalLineManagers, setGlobalLineManagers] = useState<string[]>([]);
  const [globalAreaManagers, setGlobalAreaManagers] = useState<string[]>([]);
  const [overviewStats, setOverviewStats] = useState({ total: 0, projects: 0, lm: 0, am: 0 });

  useEffect(() => {
    if (isAdminMode && allEmployees.length > 0) {
        setOverviewStats({
            total: allEmployees.length,
            projects: new Set(allEmployees.map(e => e.project)).size,
            lm: new Set(allEmployees.map(e => e.line_manager)).size,
            am: new Set(allEmployees.map(e => e.area_manager)).size,
        });
    } else if (stats) {
        setOverviewStats({
            total: Object.values(stats.employeesPerProject).reduce((a: number, b: number) => a + b, 0),
            projects: Object.keys(stats.employeesPerProject).length,
            lm: globalLineManagers.length,
            am: globalAreaManagers.length,
        });
    }
  }, [isAdminMode, allEmployees, stats, globalLineManagers, globalAreaManagers]);

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedLineManager, setSelectedLineManager] = useState('');
  const [selectedAreaManager, setSelectedAreaManager] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Admin Portal State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminSearchResults, setAdminSearchResults] = useState<Employee[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(localStorage.getItem('hse_session_email'));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [bulkUpdateField, setBulkUpdateField] = useState('');
  const [bulkUpdateValue, setBulkUpdateValue] = useState('');

  // Monitor session state
  useEffect(() => {
    if (isAdminMode) {
      const q = collection(db, 'hse_employees');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setAllEmployees(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Employee)));
      });
      return () => unsubscribe();
    }
  }, [isAdminMode]);

  useEffect(() => {
    if (sessionEmail) {
      const email = sessionEmail.toLowerCase();
      if (authorizedUsers.includes(email)) {
        setIsAdminMode(true);
        // Using email as UID for the profile fetch since we removed real Auth
        const profileRef = doc(db, 'management_profiles', email.replace(/[.@]/g, '_'));
        getDoc(profileRef).then(snap => {
          if (snap.exists()) {
            setProfile(snap.data() as ManagementProfile);
          } else {
            const initialProfile: ManagementProfile = {
              uid: email.replace(/[.@]/g, '_'),
              email: email,
              fullName: email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
              phoneNumber: '',
              role: 'HSE Manager',
              department: 'HSE',
              officeLocation: 'Head Office',
              photoUrl: ''
            };
            setProfile(initialProfile);
          }
        });
      } else {
        setIsAdminMode(false);
        setProfile(null);
        setSessionEmail(null);
        localStorage.removeItem('hse_session_email');
      }
    } else {
      setIsAdminMode(false);
      setProfile(null);
    }
  }, [sessionEmail]);

  // Authorized HSE Leadership members
  const authorizedUsers = [
    'ahmed.abbas@trojanholding.com',
    'amal.j@npc.ae',
    'irshad.syed@npc.ae',
    'vidyaasree.v@trojan.ae',
    'alshifa.s@trojan.ae',
    'alejandro.l@trojan.ae',
    'm.shahbaz@trojan.ae',
    'm.razal@trojan.ae',
    'elius.n@trojan.ae',
    'niwamanyaelius95@gmail.com'
  ];

  const [error, setError] = useState<string | null>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<any>(null);
  const [profile, setProfile] = useState<ManagementProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<ManagementProfile[]>([]);
  const [saveProfileLoading, setSaveProfileLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setFirebaseStatus(data))
      .catch(err => console.error('Health check failed:', err));

    fetch('/api/projects')
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
        setError('Connection failed. Please check your Supabase secrets.');
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

    // Fetch global line managers and area managers for Overview card
    fetch('/api/line-managers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGlobalLineManagers(data);
        }
      })
      .catch(err => console.error('Global line managers fetch error:', err));

    fetch('/api/area-managers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGlobalAreaManagers(data);
        }
      })
      .catch(err => console.error('Global area managers fetch error:', err));
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
      const term = adminSearchTerm.toLowerCase();
      const results = allEmployees.filter(emp => 
        emp.employee_name?.toLowerCase().includes(term) || 
        emp.employee_no?.toLowerCase().includes(term)
      );
      setAdminSearchResults(results);
    } else {
      setAdminSearchResults([]);
    }
  }, [adminSearchTerm, allEmployees]);

  const syncLeadershipProfiles = async () => {
    if (!isAdminMode || !sessionEmail) return;
    setProfilesLoading(true);
    try {
      for (const email of authorizedUsers) {
        const docId = email.toLowerCase().replace(/[.@]/g, '_');
        const docRef = doc(db, 'management_profiles', docId);
        const snap = await getDoc(docRef);
        
        if (!snap.exists()) {
          // Create a placeholder profile
          const name = email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
          await setDoc(docRef, {
            email: email.toLowerCase(),
            fullName: name,
            role: 'HSE Leadership',
            department: 'HSE',
            officeLocation: 'Head Office',
            uid: docId,
            updatedAt: new Date().toISOString()
          });
        }
      }
      alert('Leadership profiles synced successfully!');
      // Refresh list
      const snapshot = await getDocs(collection(db, 'management_profiles'));
      setAllProfiles(snapshot.docs.map(d => d.data() as ManagementProfile));
    } catch (err: any) {
      console.error('Sync error:', err);
      alert('Sync failed: ' + err.message);
    } finally {
      setProfilesLoading(false);
    }
  };

  const handleAdminAccess = () => {
    if (sessionEmail) {
      // Logout
      setSessionEmail(null);
      localStorage.removeItem('hse_session_email');
      setIsAdminMode(false);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleAuthSubmit = () => {
    const email = authEmail.toLowerCase().trim();
    if (authorizedUsers.includes(email)) {
      setSessionEmail(email);
      localStorage.setItem('hse_session_email', email);
      setShowAuthModal(false);
      setAuthEmail('');
    } else {
      alert('Access denied. This email is not in the HSE Leadership list.');
    }
  };

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailModal(true);
  };

  useEffect(() => {
    if (isAdminMode) {
      setProfilesLoading(true);
      // Fetch all profiles from Firestore directly
      const q = collection(db, 'management_profiles');
      getDocs(q).then(snapshot => {
        const data = snapshot.docs.map(d => d.data() as ManagementProfile);
        setAllProfiles(data);
        setProfilesLoading(false);
      }).catch(err => {
        console.error('All profiles fetch error:', err);
        setProfilesLoading(false);
      });
    }
  }, [isAdminMode]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !sessionEmail) return;
    setSaveProfileLoading(true);

    try {
      const docRef = doc(db, 'management_profiles', profile.uid);
      await setDoc(docRef, { 
        ...profile, 
        updatedAt: new Date().toISOString() 
      }, { merge: true });
      alert('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (err: any) {
      console.error('Profile save error:', err);
      alert('Failed to save profile updates: ' + err.message);
    } finally {
      setSaveProfileLoading(false);
    }
  };

  const handleImportEmployees = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const text = (event.target?.result as string).replace(/\r/g, ''); // Fix CR LF
            const lines = text.split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) {
                alert('File is empty or missing data lines');
                return;
            }
            const header = lines[0].split(',').map(h => h.trim());
            
            const headerMapping: {[key: string]: string} = {
                'SN': 'sn',
                'Employee No.': 'employee_no',
                'Employee Name': 'employee_name',
                'Department': 'department',
                'Recommended for': 'recommended_for',
                'Date of Joining': 'date_of_joining',
                'Designation': 'designation',
                'Gender': 'gender',
                'DOB': 'dob',
                'Qualification': 'qualification',
                'Nationality': 'nationality',
                'Project': 'project',
                'Line Manager': 'line_manager',
                'TBMS Designation': 'tbms_designation',
                'Assigned to': 'assigned_to'
            };
            
            const batch = writeBatch(db);
            let addedCount = 0;
            let skippedCount = 0;
            
            // To ensure we don't add duplicates in the same batch or existing in DB
            const existingFirestoreEmployees = new Set(allEmployees.map(e => String(e.employee_no)));
            const newBatchEmployees = new Set();
            
            for (let i = 1; i < lines.length; i++) {
               const row = lines[i].split(',').map(v => v.trim());
               if (row.length < header.length) {
                   continue;
               }
               
               const employee: any = {};
               header.forEach((h, index) => {
                   const fieldName = headerMapping[h] || h.toLowerCase().replace(/ /g, '_');
                   employee[fieldName] = row[index];
               });
               
               if (employee.employee_no) {
                   const empNo = String(employee.employee_no);
                   // Check if in DB
                   if (existingFirestoreEmployees.has(empNo) || newBatchEmployees.has(empNo)) {
                       skippedCount++;
                       continue;
                   }
                   
                   newBatchEmployees.add(empNo);
                   const docRef = doc(db, 'hse_employees', empNo);
                   batch.set(docRef, employee, { merge: true });
                   addedCount++;
               }
            }
            if (addedCount > 0) await batch.commit();
            alert(`Import complete! Added: ${addedCount}, Skipped (existing or duplicate in file): ${skippedCount}`);
        } catch (err: any) {
            console.error('Import error:', err);
            alert('Import failed: ' + err.message);
        } finally {
            setImportLoading(false);
        }
    };
    reader.readAsText(file);
  };

  const handleSaveEmployee = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingEmployee?.employee_no) {
        alert('Employee No is required');
        return;
    }
    setFormLoading(true);

    try {
      const docId = String(editingEmployee.employee_no);
      const docRef = doc(db, 'hse_employees', docId);
      
      const payload = {
        ...editingEmployee,
        updated_at: new Date().toISOString()
      };

      // Ensure SN is a number
      if (payload.sn) payload.sn = Number(payload.sn);
      
      await setDoc(docRef, payload, { merge: true });
      
      alert('Employee record saved successfully!');
      setShowEmployeeForm(false);
      setEditingEmployee(null);
      
      // Refresh admin search if active
      if (adminSearchTerm) {
         setAdminSearchTerm(adminSearchTerm + ' '); // Trigger re-search
         setTimeout(() => setAdminSearchTerm(adminSearchTerm), 50);
      }
    } catch (err: any) {
      console.error('Save error:', err);
      alert('Failed to save employee: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      const docRef = doc(db, 'hse_employees', String(id));
      await deleteDoc(docRef);
      alert('Record deleted.');
      setAdminSearchResults(prev => prev.filter(emp => String(emp.employee_no) !== String(id)));
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Delete failed: ' + err.message);
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkUpdateField || !bulkUpdateValue || selectedEmployeeIds.size === 0) return;
    
    setFormLoading(true);
    try {
      const batch = writeBatch(db);
      for (const id of selectedEmployeeIds) {
        const docRef = doc(db, 'hse_employees', id);
        batch.update(docRef, { [bulkUpdateField]: bulkUpdateValue, updated_at: new Date().toISOString() });
      }
      await batch.commit();
      alert(`Bulk updated ${selectedEmployeeIds.size} employees.`);
      setSelectedEmployeeIds(new Set());
      setBulkUpdateField('');
      setBulkUpdateValue('');
    } catch (err: any) {
      console.error('Bulk update error:', err);
      alert('Bulk update failed: ' + err.message);
    } finally {
      setFormLoading(false);
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

  // Reset pagination when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProject, selectedLineManager, selectedAreaManager, searchTerm]);

  // Calculate department statistics
  const departmentStats = filteredEmployees.reduce((acc, emp) => {
    const dept = emp.department || 'Unknown';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 dark' : 'bg-slate-50'}`}>
      {/* Header */}
      <header className={`border-b flex-shrink-0 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmjqIjLT1M9XvjYDBcYbm2BSr5Q-AxtJYg0g&s" 
              alt="Trojan Logo" 
              className="h-16 w-auto object-contain rounded"
              referrerPolicy="no-referrer"
            />
            <div className="hidden sm:block">
              <h1 className={`text-lg font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>HSE TEAM MANAGEMENT SYSTEM</h1>
              <p className={`text-[10px] font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Employee Performance & Safety Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1 p-1 rounded-xl ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
              {['Dashboard', 'Documentation', 'Support', 'Settings'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                    activeTab === tab 
                      ? isDarkMode ? 'bg-slate-600 text-indigo-400 shadow-sm' : 'bg-white text-indigo-600 shadow-sm'
                      : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'Settings' ? 'System Settings' : tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {activeTab === 'Dashboard' && (
            <>
              {/* Filter Section - STICKY */}
              <section className={`p-4 rounded-xl shadow-sm border flex flex-col md:flex-row items-end gap-4 sticky top-0 z-40 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex-1 w-full space-y-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-50'}`}>
                      <Briefcase className="w-3 h-3 text-indigo-500" />
                    </div>
                    Project
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
                  <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isDarkMode ? 'bg-emerald-900/50' : 'bg-emerald-50'}`}>
                      <Users className="w-3 h-3 text-emerald-500" />
                    </div>
                    Line Manager
                  </label>
                  <select 
                    value={selectedLineManager}
                    disabled={!selectedProject}
                    onChange={(e) => setSelectedLineManager(e.target.value)}
                    className="w-full filter-select disabled:opacity-50"
                  >
                    <option value="">{selectedProject ? 'Select Line Manager' : 'Select Project First'}</option>
                    {lineManagers.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="flex-1 w-full space-y-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isDarkMode ? 'bg-amber-900/50' : 'bg-amber-50'}`}>
                      <MapPin className="w-3 h-3 text-amber-500" />
                    </div>
                    Area Manager
                  </label>
                  <select 
                    value={selectedAreaManager}
                    disabled={!selectedLineManager}
                    onChange={(e) => setSelectedAreaManager(e.target.value)}
                    className="w-full filter-select disabled:opacity-50"
                  >
                    <option value="">{selectedLineManager ? 'Select Area Manager' : 'Select Line Manager First'}</option>
                    {areaManagers.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                
                <div className={`w-10 h-10 flex items-center justify-center rounded-lg border cursor-pointer transition-colors ${isDarkMode ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                  <Filter className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
              </section>

        {/* Hierarchy Selection - Shows when Project is selected */}
        {selectedProject && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Line Manager Selection */}
            {lineManagers.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl border border-indigo-100"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Line Managers <span className="text-indigo-600 font-normal">• {selectedProject}</span>
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lineManagers.map((manager) => (
                    <button
                      key={manager}
                      onClick={() => setSelectedLineManager(manager)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        selectedLineManager === manager
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200'
                      }`}
                    >
                      {manager}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Area Manager Selection */}
            {selectedLineManager && areaManagers.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-xl border border-emerald-100"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Area Managers <span className="text-emerald-600 font-normal">• {selectedLineManager}</span>
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {areaManagers.map((manager) => (
                    <button
                      key={manager}
                      onClick={() => setSelectedAreaManager(manager)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        selectedAreaManager === manager
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200'
                      }`}
                    >
                      {manager}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

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

            <div className={`rounded-xl border shadow-sm flex flex-col min-h-[500px] max-h-[600px] ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 flex-shrink-0 p-5">
                <div>
                  <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Employee Performance Roster</h2>
                  <div className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                    {searchTerm.length >= 2 ? `Showing search results for "${searchTerm}"` : 
                     selectedAreaManager ? `Showing results for ${selectedAreaManager}` : 'Select hierarchy or search globally'}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 sm:w-64">
                    <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input 
                      type="text" 
                      placeholder="Search name, ID, dept, designation..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full rounded-lg pl-9 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200'}`}
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
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

            <div className="flex-1 overflow-y-auto overflow-x-auto -mx-5 min-h-0 px-5">
              <table className="w-full text-left text-sm">
                <thead className={isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50/50'}>
                  <tr className={`font-bold uppercase tracking-wider text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <th className="px-5 py-3">ID / Employee</th>
                    <th className="px-5 py-3 text-center">KPI Score</th>
                    <th className="px-5 py-3">Qualification</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                  <AnimatePresence initial={false}>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center">
                          <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </td>
                      </tr>
                    ) : filteredEmployees.length > 0 ? (
                      filteredEmployees
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((emp) => (
                        <motion.tr 
                          key={emp.employee_no}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm uppercase ${isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                                {(emp.employee_name || "?").charAt(0)}
                              </div>
                              <div>
                                <div className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{emp.employee_name}</div>
                                <div className={`text-[10px] font-mono tracking-tight ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{emp.employee_no}</div>
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

            <div className={`mt-auto pt-4 flex justify-between items-center border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              <div className="flex gap-1">
                {Array.from({ length: Math.ceil(filteredEmployees.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page} 
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold transition-colors ${
                      page === currentPage 
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' 
                        : isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length}
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredEmployees.length / itemsPerPage)))}
                  disabled={currentPage >= Math.ceil(filteredEmployees.length / itemsPerPage)}
                  className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 group transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'
                  }`}
                >
                  Next Page <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </section>

          {/* Right Side Column */}
          <div className="col-span-12 lg:col-span-4 grid grid-cols-1 gap-6">
            
            {/* Overview Card - Always Visible */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-indigo-600/90 to-indigo-800/90 rounded-xl p-4 text-white relative overflow-hidden shadow-lg"
            >
              {/* Background Logo with Blur */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img 
                  src="https://media.licdn.com/dms/image/v2/D4D0BAQEQEl1DLgh1LQ/company-logo_200_200/B4DZ12BoSDLQAI-/0/1775801632458/trojanconstructiongroup_logo?e=2147483647&v=beta&t=0usctUmO-DibcIv8aqWULOCkmIbnchhXs6HPh8prAi8" 
                  alt="Trojan" 
                  className="w-48 h-48 object-contain opacity-15 blur-sm"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden backdrop-blur-sm border border-white/10">
                    <img 
                      src="https://media.licdn.com/dms/image/v2/D4D0BAQEQEl1DLgh1LQ/company-logo_200_200/B4DZ12BoSDLQAI-/0/1775801632458/trojanconstructiongroup_logo?e=2147483647&v=beta&t=0usctUmO-DibcIv8aqWULOCkmIbnchhXs6HPh8prAi8" 
                      alt="Trojan" 
                      className="w-8 h-8 object-contain rounded"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Overview</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold">{overviewStats.total.toLocaleString()}</div>
                    <div className="text-[10px] text-indigo-200">Total Employees</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold">{overviewStats.projects}</div>
                    <div className="text-[10px] text-indigo-200">Projects</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold">{overviewStats.lm}</div>
                    <div className="text-[10px] text-indigo-200">Line Managers</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <div className="text-2xl font-bold">{overviewStats.am}</div>
                    <div className="text-[10px] text-indigo-200">Area Managers</div>
                  </div>
                </div>
                {/* No designation breakdown */}
              </div>
            </motion.div>

            {/* Department Distribution */}
            {Object.keys(departmentStats).length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={`rounded-xl p-5 shadow-sm border flex flex-col h-[280px] ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
              >
                <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Users className="w-3.5 h-3.5 text-indigo-500" /> Department Distribution
                </h3>
                <div className="flex-1">
                  <div className="space-y-2">
                    {Object.entries(departmentStats)
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .map(([dept, count], index) => (
                        <div key={dept} className={`flex items-center justify-between p-2 rounded-lg ${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              index === 0 ? 'bg-indigo-500' :
                              index === 1 ? 'bg-emerald-500' :
                              index === 2 ? 'bg-amber-500' :
                              'bg-slate-400'
                            }`} />
                            <span className={`text-sm font-medium truncate max-w-[140px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{dept}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
                              <div 
                                className={`h-full rounded-full ${
                                  index === 0 ? 'bg-indigo-500' :
                                  index === 1 ? 'bg-emerald-500' :
                                  index === 2 ? 'bg-amber-500' :
                                  'bg-slate-400'
                                }`}
                                style={{ width: `${(Math.max(...Object.values(departmentStats) as number[]) > 0 ? (((count as number) / Math.max(...Object.values(departmentStats) as number[])) * 100) : 0)}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold w-8 text-right ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{count}</span>
                          </div>
                        </div>
                      ))}
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
              <div className={`rounded-xl p-5 shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`mb-8 pb-6 border-b flex flex-col gap-6 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>HSE Leadership & Documentation</h2>
                      </div>
                    </div>
                  </div>
                  <div className={`w-full flex items-center justify-center p-6 rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                    <img 
                      src="https://procurement.trojanholding.ae/Styles/Images/trojanconstructiongroupalllogo.png" 
                      alt="Trojan Construction Group" 
                      className="w-full max-w-2xl h-auto object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {[
                    {
                      name: "Ahmed Mohamed Abbas Ahmed",
                      role: "HSSE Manager",
                      dept: "Department",
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
                    },
                    {
                      name: "Elius",
                      role: "Tech Support",
                      dept: "Technical Assistance",
                      project: "System Support",
                      email: "elius.n@trojan.ae",
                      github: "https://github.com/s6ft256",
                      id: "TR47934",
                      gradient: "from-violet-500 to-violet-700"
                    }
                  ].map((profile, i) => (
                    <div key={i} className={`rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                      <div className={`h-16 bg-gradient-to-r ${profile.gradient}`}></div>
                      <div className="px-4 pb-4 -mt-8 text-center">
                        <div className="relative inline-block mb-2">
                          {profile.img ? (
                            <img 
                              src={profile.img} 
                              alt={profile.name}
                              className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={`w-16 h-16 rounded-xl border-2 border-white shadow-sm flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>
                              {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white"></div>
                        </div>
                        <h3 className={`font-bold text-xs mb-0.5 line-clamp-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{profile.name}</h3>
                        <p className="text-indigo-600 font-bold text-[8px] uppercase tracking-wider mb-2 leading-tight">{profile.role}</p>
                        
                        <div className="flex justify-center mb-2">
                          <a 
                            href={`mailto:${profile.email}`}
                            className={`p-1.5 rounded-lg flex items-center gap-1 group/btn transition-all border ${isDarkMode ? 'bg-slate-700 hover:bg-indigo-900/50 text-slate-400 hover:text-indigo-300 border-slate-600' : 'bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 border-slate-100'}`}
                          >
                            <Mail className="w-3 h-3" />
                            <span className={`text-[8px] font-bold group-hover/btn:text-indigo-600 ${isDarkMode ? 'text-slate-400 group-hover/btn:text-indigo-300' : 'text-slate-500'}`}>{profile.email.split('@')[0]}</span>
                          </a>
                        </div>

                        <div className={`space-y-1 pt-2 border-t text-left ${isDarkMode ? 'border-slate-700' : 'border-slate-50'}`}>
                          <p className="text-[8px] flex justify-between"><span className={`font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Dept:</span> <span className={`font-bold truncate ml-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{profile.dept}</span></p>
                          {profile.project && <p className="text-[8px] flex justify-between"><span className={`font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Project:</span> <span className={`font-bold truncate ml-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{profile.project}</span></p>}
                          {profile.github && <p className="text-[8px] flex justify-between"><span className={`font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>GitHub:</span> <a href={profile.github} target="_blank" rel="noopener noreferrer" className={`font-bold truncate ml-1 ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'}`}>s6ft256</a></p>}
                          {profile.id && <p className="text-[8px] flex justify-between"><span className={`font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ID:</span> <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{profile.id}</span></p>}
                        </div>
                      </div>
                    </div>
                  ))}

                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Support' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className={`rounded-xl p-5 shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`mb-8 pb-6 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-50'}`}>
                        <Mail className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>HSE Leadership & Support</h2>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Contact our HSE team for assistance and support</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`text-sm font-bold mb-4 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>HSE Leadership & Support Contacts</div>
                  
                  {[
                    {
                      name: "Ahmed Mohamed Abbas Ahmed",
                      role: "HSSE Manager",
                      project: "Trojan HQ",
                      email: "ahmed.abbas@trojanholding.com"
                    },
                    {
                      name: "Amal Jagadi",
                      role: "HSE Manager",
                      project: "Trojan HQ",
                      email: "amal.j@npc.ae"
                    },
                    {
                      name: "Vidyaasree Vijayakrishnan",
                      role: "HSE Analyst",
                      project: "Trojan HQ",
                      email: "vidyaasree.v@trojan.ae"
                    },
                    {
                      name: "Mohammed Ali Khan",
                      role: "Safety Officer",
                      project: "Construction Site A",
                      email: "mohammed.k@trojan.ae"
                    },
                    {
                      name: "Sarah Johnson",
                      role: "Environmental Coordinator",
                      project: "Trojan HQ",
                      email: "sarah.j@trojan.ae"
                    },
                    {
                      name: "Hassan Mahmoud",
                      role: "Training Coordinator",
                      project: "All Projects",
                      email: "hassan.m@trojan.ae"
                    },
                    {
                      name: "Elius",
                      role: "Tech Support",
                      project: "Technical Assistance",
                      email: "elius.n@trojan.ae",
                      github: "https://github.com/s6ft256",
                      reference: "TR47934"
                    }
                  ].map((person, index) => (
                    <motion.div
                      key={person.email}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all ${isDarkMode ? 'bg-slate-700/50 border-slate-600 hover:border-indigo-500 hover:bg-slate-700' : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{person.name}</h3>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                            {person.role}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 text-[10px] mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Briefcase className="w-3 h-3" />
                          {person.project}
                        </div>
                        <div className="flex items-center gap-4">
                          <a 
                            href={`mailto:${person.email}`}
                            className={`flex items-center gap-1 text-xs transition-colors ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'}`}
                          >
                            <Mail className="w-3 h-3" />
                            {person.email}
                          </a>
                          {person.github && (
                            <a 
                              href={person.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-1 text-xs transition-colors ${isDarkMode ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'}`}
                            >
                              <Github className="w-3 h-3" />
                              GitHub
                            </a>
                          )}
                          {person.reference && (
                            <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {person.reference}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

              </div>
            </motion.div>
          )}

          {activeTab === 'Settings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className={`rounded-xl p-5 shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>System Settings</h2>
                  <button 
                    onClick={handleAdminAccess}
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
                  <div className="max-w-xl space-y-6">
                    {/* Add Pie Chart here */}
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                      <h4 className={`font-bold mb-4 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Employees Per Project</h4>
                      {stats?.employeesPerProject && (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <RePie
                              data={Object.entries(stats.employeesPerProject).map(([name, value]) => ({ name, value }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {Object.values(stats.employeesPerProject).map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                              ))}
                            </RePie>
                            <ReTooltip />
                            <ReLegend />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  
                    <div className={`flex items-center justify-between p-4 rounded-xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                      <div>
                        <h4 className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Real-time Analytics</h4>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>Sync with Firebase every 5 seconds</p>
                      </div>
                      <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
                        <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                      </div>
                    </div>
                    <div className={`flex items-center justify-between p-4 rounded-xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                      <div>
                        <h4 className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Audit Logging</h4>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>Track all employee detail modifications</p>
                      </div>
                      <div className="w-10 h-5 bg-slate-300 rounded-full relative">
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                      </div>
                    </div>

                    {/* Theme Toggle */}
                    <div className={`flex items-center justify-between p-4 rounded-xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-indigo-900' : 'bg-amber-100'}`}>
                          {isDarkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-600" />}
                        </div>
                        <div>
                          <h4 className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Appearance</h4>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>{isDarkMode ? 'Dark mode enabled' : 'Light mode enabled'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`w-14 h-7 rounded-full relative transition-colors ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${isDarkMode ? 'right-0.5' : 'left-0.5'}`}>
                          {isDarkMode ? <Moon className="w-3 h-3 text-indigo-600 m-1.5" /> : <Sun className="w-3 h-3 text-amber-600 m-1.5" />}
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Management Profile Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3 mb-6">
                          <User className="w-5 h-5 text-indigo-500" />
                          <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Personal Profile</h3>
                        </div>
                        
                        <div className="flex flex-col gap-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 ${isDarkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-white'} flex items-center justify-center relative group`}>
                                {profile?.photoUrl ? (
                                  <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-6 h-6 text-slate-300" />
                                )}
                                {isEditingProfile && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer">
                                    <Camera className="w-4 h-4 text-white" />
                                    <input 
                                      type="url" 
                                      placeholder="Paste Image URL"
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                      onChange={(e) => {
                                        const url = prompt('Enter Profile Picture URL:');
                                        if (url) setProfile(prev => ({ ...prev!, photoUrl: url }));
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                              <div>
                                  <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profile?.fullName || 'Manager Profile'}</h4>
                                  <p className="text-[10px] text-slate-500">{profile?.email}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setIsEditingProfile(!isEditingProfile)}
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${isEditingProfile ? 'bg-slate-200 text-slate-700' : 'bg-indigo-50 text-indigo-600'}`}
                            >
                              <Edit2 className="w-3 h-3" />
                              {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
                            </button>
                          </div>

                          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Full Name</label>
                              {isEditingProfile ? (
                                <input 
                                  type="text"
                                  required
                                  className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200'}`}
                                  value={profile?.fullName || ''}
                                  onChange={e => setProfile(prev => ({ ...prev!, fullName: e.target.value }))}
                                />
                              ) : (
                                <p className={`text-xs px-3 py-1.5 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profile?.fullName}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Phone</label>
                              {isEditingProfile ? (
                                <input 
                                  type="tel"
                                  className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200'}`}
                                  value={profile?.phoneNumber || ''}
                                  onChange={e => setProfile(prev => ({ ...prev!, phoneNumber: e.target.value }))}
                                />
                              ) : (
                                <p className={`text-xs px-3 py-1.5 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profile?.phoneNumber || 'N/A'}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Role</label>
                              {isEditingProfile ? (
                                <input 
                                  type="text"
                                  className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200'}`}
                                  value={profile?.role || ''}
                                  onChange={e => setProfile(prev => ({ ...prev!, role: e.target.value }))}
                                />
                              ) : (
                                <p className={`text-xs px-3 py-1.5 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profile?.role}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Department</label>
                              {isEditingProfile ? (
                                <input 
                                  type="text"
                                  className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-200'}`}
                                  value={profile?.department || ''}
                                  onChange={e => setProfile(prev => ({ ...prev!, department: e.target.value }))}
                                />
                              ) : (
                                <p className={`text-xs px-3 py-1.5 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profile?.department}</p>
                              )}
                            </div>
                            {isEditingProfile && (
                                <div className="md:col-span-2 pt-2 flex justify-end">
                                  <button 
                                    type="submit"
                                    disabled={saveProfileLoading}
                                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                  >
                                    {saveProfileLoading ? (
                                      <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                      <ShieldCheck className="w-3 h-3" />
                                    )}
                                    Save Profile Changes
                                  </button>
                                </div>
                            )}
                          </form>
                        </div>
                      </div>

                      {/* Management Directory */}
                      <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-emerald-500" />
                                <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Management Directory</h3>
                                <button 
                                  onClick={syncLeadershipProfiles}
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${isDarkMode ? 'bg-indigo-900/30 text-indigo-300 hover:bg-indigo-900/50' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 shadow-sm'}`}
                                  title="Add All Authorized Users to Directory"
                                >
                                  <RefreshCw className={`w-3 h-3 ${profilesLoading ? 'animate-spin' : ''}`} />
                                  Import HSE Leadership
                                </button>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400">
                                {allProfiles.length} Members
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {profilesLoading ? (
                                <div className="py-8 text-center">
                                    <div className="inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : allProfiles.length > 0 ? (
                                allProfiles.map((p) => (
                                    <div key={p.uid} className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:border-indigo-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                                        <div className={`w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'} flex items-center justify-center`}>
                                            {p.photoUrl ? (
                                                <img src={p.photoUrl} alt={p.fullName} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-4 h-4 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className={`text-xs font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{p.fullName}</h4>
                                            <p className="text-[9px] text-slate-500 truncate">{p.role} • {p.email}</p>
                                        </div>
                                        <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                                            {p.department || 'HSE'}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center text-[10px] italic text-slate-400">
                                    No other profiles found.
                                </div>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Employee Management Section */}
                    <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-3 mb-6">
                        <Users className="w-5 h-5 text-emerald-500" />
                        <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Employee Management</h3>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
                        <div className="relative flex-1 w-full">
                          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                          <input 
                            type="text" 
                            placeholder="Search for employee to manage..."
                            value={adminSearchTerm}
                            onChange={(e) => setAdminSearchTerm(e.target.value)}
                            className={`w-full rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200'}`}
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
                        <div className="relative w-full sm:w-auto">
                            <input 
                              type="file" 
                              accept=".csv"
                              onChange={handleImportEmployees}
                              className="hidden"
                              id="csv-upload"
                            />
                            <div className="flex flex-col gap-1">
                                <label 
                                    htmlFor="csv-upload"
                                    className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    {importLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    {importLoading ? 'Importing...' : 'Import CSV'}
                                </label>
                                <span className="text-[9px] text-slate-400">Required headers: employee_no, employee_name, ...</span>
                            </div>
                        </div>
                      </div>

                      {/* Admin Search Results */}
                      {adminSearchResults.length > 0 && (
                        <div className="space-y-3 mt-4">
                          {/* Bulk Actions Panel */}
                          {selectedEmployeeIds.size > 0 && (
                            <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center gap-4 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-indigo-50 border-indigo-200'}`}>
                                <span className="text-xs font-bold">{selectedEmployeeIds.size} employees selected:</span>
                                
                                <select 
                                    onChange={(e) => setBulkUpdateField(e.target.value)}
                                    value={bulkUpdateField}
                                    className={`text-xs rounded-lg p-2 border outline-none ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}
                                >
                                    <option value="">Select Field to Update</option>
                                    <option value="department">Department</option>
                                    <option value="project">Project</option>
                                    <option value="designation">Designation</option>
                                </select>

                                <input 
                                    type="text"
                                    placeholder="New Value..."
                                    value={bulkUpdateValue}
                                    onChange={(e) => setBulkUpdateValue(e.target.value)}
                                    className={`text-xs rounded-lg p-2 border outline-none ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}
                                />

                                <button 
                                    onClick={handleBulkUpdate}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    Apply Changes
                                </button>
                            </div>
                          )}

                          <h4 className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Search Results</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {adminSearchResults.map(emp => (
                              <div key={emp.id || emp.employee_no} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isDarkMode ? 'bg-slate-800/50 border-slate-700 hover:border-slate-500' : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm'}`}>
                                <div className="flex items-center gap-3">
                                  <input 
                                    type="checkbox"
                                    checked={selectedEmployeeIds.has(String(emp.employee_no))}
                                    onChange={(e) => {
                                      const newSet = new Set(selectedEmployeeIds);
                                      if (e.target.checked) newSet.add(String(emp.employee_no));
                                      else newSet.delete(String(emp.employee_no));
                                      setSelectedEmployeeIds(newSet);
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <div className={`w-8 h-8 rounded bg-indigo-50 flex items-center justify-center`}>
                                    <User className="w-4 h-4 text-indigo-500" />
                                  </div>
                                  <div>
                                    <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{emp.employee_name}</div>
                                    <div className="text-[9px] text-slate-500">{emp.employee_no} • {emp.designation}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => {
                                      setEditingEmployee(emp);
                                      setShowEmployeeForm(true);
                                    }}
                                    className={`p-1.5 rounded hover:bg-indigo-50 text-indigo-600 transition-colors`}
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                        if (confirm(`Are you sure you want to delete ${emp.employee_name}?`)) {
                                            handleDeleteEmployee(String(emp.employee_no));
                                        }
                                    }}
                                    className={`p-1.5 rounded hover:bg-rose-50 text-rose-600 transition-colors`}
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {adminSearchTerm.length >= 2 && adminSearchResults.length === 0 && (
                        <div className="py-4 text-center text-xs italic text-slate-400">
                          No employees found matching "{adminSearchTerm}"
                        </div>
                      )}
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
                  className={`rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
                >
                  <div className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      {editingEmployee?.id ? 'Edit Employee Record' : 'Create New Employee Record'}
                    </h3>
                    <button onClick={() => setShowEmployeeForm(false)} className={`transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSaveEmployee} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Employee Number</label>
                        <input 
                          type="text"
                          required
                          disabled={!!editingEmployee?.id}
                          className={`w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border border-slate-200'}`}
                          value={editingEmployee?.employee_no || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, employee_no: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Full Name</label>
                        <input 
                          type="text"
                          required
                          className={`w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border border-slate-200'}`}
                          value={editingEmployee?.employee_name || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, employee_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Department</label>
                        <input 
                          type="text"
                          required
                          className={`w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border border-slate-200'}`}
                          value={editingEmployee?.department || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, department: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Designation</label>
                        <input 
                          type="text"
                          required
                          className={`w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border border-slate-200'}`}
                          value={editingEmployee?.designation || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, designation: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Gender</label>
                        <select 
                          required
                          className={`w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border border-slate-200'}`}
                          value={editingEmployee?.gender || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, gender: e.target.value }))}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Nationality</label>
                        <input 
                          type="text"
                          required
                          className={`w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border border-slate-200'}`}
                          value={editingEmployee?.nationality || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, nationality: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Project</label>
                        <input 
                          type="text"
                          className={`w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border border-slate-200'}`}
                          value={editingEmployee?.project || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, project: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Line Manager</label>
                        <input 
                          type="text"
                          className={`w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border border-slate-200'}`}
                          value={editingEmployee?.line_manager || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, line_manager: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Area Manager</label>
                        <input 
                          type="text"
                          className={`w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border border-slate-200'}`}
                          value={editingEmployee?.area_manager || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, area_manager: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Qualification</label>
                        <input 
                          type="text"
                          className={`w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border border-slate-200'}`}
                          value={editingEmployee?.qualification || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, qualification: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>KPI Score (%)</label>
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          className={`w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border border-slate-200'}`}
                          value={editingEmployee?.kpi || ''}
                          onChange={e => setEditingEmployee(prev => ({ ...prev!, kpi: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className={`pt-4 flex justify-end gap-3 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                      <button 
                        type="button" 
                        onClick={() => setShowEmployeeForm(false)}
                        className={`px-6 py-2 text-xs font-bold transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <p className="text-xs text-slate-600 font-medium">
              Developed by <span className="text-indigo-600 font-bold">@Elius 2026</span>
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span>TR47934</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <a 
              href="https://github.com/s6ft256" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
            
            <a 
              href="mailto:elius.n@trojan.ae" 
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </a>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('Documentation')}
                className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'Documentation' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5' : 'text-slate-400 hover:text-indigo-600'}`}
              >
                Documentation
              </button>
              <button 
                onClick={() => setActiveTab('Support')}
                className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'Support' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5' : 'text-slate-400 hover:text-indigo-600'}`}
              >
                Support
              </button>
              <button 
                onClick={() => setActiveTab('Settings')}
                className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'Settings' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5' : 'text-slate-400 hover:text-indigo-600'}`}
              >
                Safety Report
              </button>
            </div>
          </div>
        </div>
      </footer>


      {/* Authentication Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`rounded-2xl p-6 max-w-md w-full shadow-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-50'}`}>
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Admin Portal Access</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Verify your HSE Leadership credentials</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className={`transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAuthSubmit()}
                    placeholder="Enter your authorized email"
                    className={`w-full px-4 py-3 rounded-lg outline-none transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white focus:ring-indigo-500' : 'bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-slate-800'}`}
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAuthSubmit}
                    className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                  >
                    Verify Access
                  </button>
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className={`flex-1 px-4 py-3 rounded-lg font-bold transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employee Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`rounded-2xl p-6 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-50'}`}>
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Employee Details</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{selectedEmployee.employee_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className={`transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>Basic Information</h4>
                    <div className="space-y-2">
                      <p className="text-sm"><span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Employee No:</span> <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedEmployee.employee_no}</span></p>
                      <p className="text-sm"><span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Name:</span> <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedEmployee.employee_name}</span></p>
                      <p className="text-sm"><span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Gender:</span> <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedEmployee.gender}</span></p>
                      <p className="text-sm"><span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Nationality:</span> <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedEmployee.nationality}</span></p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>Professional Details</h4>
                    <div className="space-y-2">
                      <p className="text-sm"><span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Department:</span> <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedEmployee.department}</span></p>
                      <p className="text-sm"><span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Designation:</span> <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedEmployee.designation}</span></p>
                      <p className="text-sm"><span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Level:</span> <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedEmployee.level}</span></p>
                      <p className="text-sm"><span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Qualification:</span> <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedEmployee.qualification}</span></p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>Assignment & Management</h4>
                    <div className="space-y-2">
                      <p className="text-sm"><span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Project:</span> <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedEmployee.project}</span></p>
                      <p className="text-sm"><span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Line Manager:</span> <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedEmployee.line_manager}</span></p>
                      <p className="text-sm"><span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Area Manager:</span> <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedEmployee.area_manager}</span></p>
                      <p className="text-sm"><span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>KPI Score:</span> <span className="font-bold text-indigo-600">{selectedEmployee.kpi}%</span></p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className={`px-6 py-2 rounded-lg font-bold transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setEditingEmployee(selectedEmployee);
                    setShowEmployeeForm(true);
                    setShowDetailModal(false);
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                >
                  Edit Employee
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
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
  RefreshCw,
  FileSpreadsheet,
  Headset,
  CheckCircle,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
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

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

interface Stats {
  kpiDistribution: Record<string, number>;
  qualificationBreakdown: Record<string, number>;
  designationBreakdown: Record<string, number>;
  projectBreakdown?: Record<string, number>;
  totalEmployees?: number;
  totalProjects?: number;
  totalLineManagers?: number;
  totalAreaManagers?: number;
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

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
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
            total: stats.totalEmployees || 0,
            projects: stats.totalProjects || 0,
            lm: stats.totalLineManagers || 0,
            am: stats.totalAreaManagers || 0,
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

  useEffect(() => {
    document.title = "HSE TEAM";
  }, []);

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
      const path = 'hse_employees';
      const q = collection(db, path);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setAllEmployees(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Employee)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
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
        const profileId = email.replace(/[.@]/g, '_');
        const path = `management_profiles/${profileId}`;
        const profileRef = doc(db, 'management_profiles', profileId);
        getDoc(profileRef).then(snap => {
          if (snap.exists()) {
            setProfile(snap.data() as ManagementProfile);
          } else {
            const initialProfile: ManagementProfile = {
              uid: profileId,
              email: email,
              fullName: generateNameFromEmail(email),
              phoneNumber: '',
              role: getRoleFromEmail(email),
              department: leadershipDirectory.find(p => p.email.toLowerCase() === email.toLowerCase())?.dept || 'HSE',
              officeLocation: 'Head Office',
              photoUrl: ''
            };
            setProfile(initialProfile);
          }
        }).catch(err => handleFirestoreError(err, OperationType.GET, path));
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

  const leadershipDirectory = [
    { name: "Ahmed Mohamed Abbas Ahmed", role: "HSSE Manager", email: "ahmed.abbas@trojanholding.com", dept: "Corporate" },
    { name: "Amal Jagadi", role: "HSE Manager", email: "amal.j@npc.ae", dept: "Corporate" },
    { name: "Irshad Basha Syed", role: "Safety Engineer", email: "irshad.syed@npc.ae", dept: "NPC" },
    { name: "Vidyaasree Vijayakrishnan", role: "HSE Analyst", email: "vidyaasree.v@trojan.ae", dept: "Trojan" },
    { name: "Alshifa Najiminisa Sajeer", role: "HSE Admin", email: "alshifa.s@trojan.ae", dept: "Trojan" },
    { name: "Alejandro Llaguno", role: "HSE Admin", email: "alejandro.l@trojan.ae", dept: "Trojan" },
    { name: "Muhammad Shahbaz Muhammad Ilyas", role: "Safety Engineer", email: "m.shahbaz@trojan.ae", dept: "Trojan" },
    { name: "Mohammed Razal", role: "HSE Officer", email: "m.razal@trojan.ae", dept: "Trojan" },
    { name: "Elius", role: "Tech Support", email: "elius.n@trojan.ae", dept: "Technical Support" }
  ];

  const generateNameFromEmail = (email: string) => {
    const known = leadershipDirectory.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (known) return known.name;
    
    return email.split('@')[0].split('.').map(s => {
      if (s.length <= 1) return s.toUpperCase() + '.';
      return s.charAt(0).toUpperCase() + s.slice(1);
    }).join(' ');
  };

  const getRoleFromEmail = (email: string) => {
    const known = leadershipDirectory.find(p => p.email.toLowerCase() === email.toLowerCase());
    return known ? known.role : 'HSE Leadership';
  };

  const [error, setError] = useState<string | null>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<any>(null);
  const [profile, setProfile] = useState<ManagementProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<ManagementProfile[]>([]);
  const [saveProfileLoading, setSaveProfileLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [previewSheet, setPreviewSheet] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    try {
        const [healthRes, projectsRes, statsRes, lmRes, amRes] = await Promise.all([
          fetch('/api/health').then(res => res.json()).catch(() => null),
          fetch('/api/projects').then(res => res.json()).catch(() => ({ error: 'Fetch failed' })),
          fetch('/api/stats').then(res => res.json()).catch(() => null),
          fetch('/api/line-managers').then(res => res.json()).catch(() => []),
          fetch('/api/area-managers').then(res => res.json()).catch(() => [])
        ]);

        if (healthRes) setFirebaseStatus(healthRes);

        if (projectsRes.error) {
          setError(projectsRes.error);
          setProjects([]);
        } else if (Array.isArray(projectsRes)) {
          setProjects([...projectsRes].sort((a, b) => a.localeCompare(b)));
          setError(null);
        }

        if (statsRes && !statsRes.error) {
          setStats(statsRes);
        }

        if (Array.isArray(lmRes)) setGlobalLineManagers([...lmRes].sort((a, b) => a.localeCompare(b)));
        if (Array.isArray(amRes)) setGlobalAreaManagers([...amRes].sort((a, b) => a.localeCompare(b)));
    } catch (err) {
        console.error('Data refresh failed:', err);
        setError('Failed to refresh data.');
    } finally {
        setTimeout(() => setRefreshing(false), 500);
    }
  };

  useEffect(() => {
    loadData();
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
            setLineManagers([...data].sort((a, b) => a.localeCompare(b)));
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
            setAreaManagers([...data].sort((a, b) => a.localeCompare(b)));
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
        const path = `management_profiles/${docId}`;
        const docRef = doc(db, 'management_profiles', docId);
        const snap = await getDoc(docRef).catch(err => {
            handleFirestoreError(err, OperationType.GET, path);
            return null;
        });
        
        if (snap && !snap.exists()) {
          // Create a placeholder profile
          const name = generateNameFromEmail(email);
          const role = getRoleFromEmail(email);
          const dept = leadershipDirectory.find(p => p.email.toLowerCase() === email.toLowerCase())?.dept || 'HSE';
          
          const payload = {
            email: email.toLowerCase(),
            fullName: name,
            role: role,
            department: dept,
            officeLocation: 'Head Office',
            uid: docId,
            updatedAt: new Date().toISOString()
          };
          await setDoc(docRef, payload).catch(err => handleFirestoreError(err, OperationType.WRITE, path));
        }
      }
      alert('Leadership profiles synced successfully!');
      // Refresh list
      const snapshot = await getDocs(collection(db, 'management_profiles')).catch(err => {
          handleFirestoreError(err, OperationType.LIST, 'management_profiles');
          return { docs: [] } as any;
      });
      setAllProfiles(snapshot.docs.map((d: any) => d.data() as ManagementProfile));
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

  const handleImportEmployees = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportStatus(null);
    
    const reader = new FileReader();
    reader.onerror = (err) => {
        console.error('FileReader error:', err);
        setImportStatus({ type: 'error', message: 'File reading failed: ' + err });
        setImportLoading(false);
    };
    reader.onload = async (event) => {
        try {
            if (!event.target?.result) {
                throw new Error('FileReader result is empty');
            }
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, {type: 'array'});
            
            console.log('Available sheets:', workbook.SheetNames);
            
            let targetSheetName = '';
            let targetData: any[] = [];
            
            // Priority 1: Look for a sheet that contains employee_no column
            for (const name of workbook.SheetNames) {
                const sheet = workbook.Sheets[name];
                const json: any[] = XLSX.utils.sheet_to_json(sheet);
                if (json.length > 0 && Object.keys(json[0]).some(key => key.toLowerCase() === 'employee_no')) {
                    targetSheetName = name;
                    targetData = json;
                    break;
                }
            }
            
            // Priority 2: Fallback to the first sheet if nothing found with employee_no
            if (!targetSheetName && workbook.SheetNames.length > 0) {
                targetSheetName = workbook.SheetNames[0];
                targetData = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheetName]);
            }
            
            if (targetData.length === 0) {
                setImportStatus({ type: 'error', message: `No data found in any sheet. Available sheets: ${workbook.SheetNames.join(', ')}` });
                return;
            }

            setPendingData({
                sheetName: targetSheetName,
                data: targetData
            });
            setPreviewSheet(targetSheetName);
            setImportStatus({ type: 'success', message: `File parsed! Found data in sheet: "${targetSheetName}"` });
        } catch (err: any) {
            console.error('Import error:', err);
            setImportStatus({ type: 'error', message: 'Import failed: ' + err.message });
        } finally {
            setImportLoading(false);
        }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleProceedImport = async () => {
    if (!pendingData || !pendingData.data) return;
    setImportLoading(true);
    try {
        const batch = writeBatch(db);
        const data = pendingData.data as any[];
        
        const hasEmployeeNo = data.length > 0 && Object.keys(data[0]).some(key => key.toLowerCase() === 'employee_no');
        
        if (hasEmployeeNo) {
            const seenEmployeeNos = new Set();
            for (const emp of data) {
                // Find the exact key for employee_no (might be case sensitive or have spaces)
                const empNoKey = Object.keys(emp).find(k => k.toLowerCase() === 'employee_no');
                if (empNoKey && emp[empNoKey]) {
                    const empNo = String(emp[empNoKey]);
                    if (seenEmployeeNos.has(empNo)) continue;
                    
                    seenEmployeeNos.add(empNo);
                    const docRef = doc(db, 'hse_employees', empNo);
                    
                    // Normalize keys to match our interface if possible
                    const normalizedEmp: any = {};
                    Object.keys(emp).forEach(k => {
                        // More robust normalization: lowercase, remove special chars, trim
                        const lowKey = k.toLowerCase().trim()
                            .replace(/[.\s()\-]+/g, '_') // Replace dots, spaces, parens, hyphens with _
                            .replace(/_+/g, '_')         // dedupe underscores
                            .replace(/^_+|_+$/g, '');    // trim underscores
                        
                        normalizedEmp[lowKey] = emp[k];
                    });
                    
                    // Specific mapping for common employee fields if missing
                    if (!normalizedEmp.employee_no && empNoKey) {
                        normalizedEmp.employee_no = String(emp[empNoKey]);
                    }
                    
                    if (!normalizedEmp.employee_name) {
                        const nameKey = Object.keys(emp).find(k => 
                            ['name', 'full name', 'employee name', 'staff name'].includes(k.toLowerCase().trim())
                        );
                        if (nameKey) normalizedEmp.employee_name = emp[nameKey];
                    }
                    
                    batch.set(docRef, normalizedEmp, { merge: true });
                }
            }
            await batch.commit();
            setImportStatus({ type: 'success', message: `Successfully imported ${seenEmployeeNos.size} employees from "${pendingData.sheetName}"` });
        } else {
            // Generic import for other data types if no employee_no
            for (const row of data) {
                const colRef = collection(db, 'imported_data');
                const docRef = doc(colRef);
                batch.set(docRef, row);
            }
            await batch.commit();
            setImportStatus({ type: 'success', message: `Successfully imported ${data.length} records to default collection from "${pendingData.sheetName}"` });
        }
        
        setPendingData(null);
        setPreviewSheet(null);
    } catch (err: any) {
        console.error('Import error:', err);
        setImportStatus({ type: 'error', message: 'Import failed: ' + err.message });
    } finally {
        setImportLoading(false);
    }
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
      const path = `hse_employees/${docId}`;
      const docRef = doc(db, 'hse_employees', docId);
      
      const payload = {
        ...editingEmployee,
        updated_at: new Date().toISOString()
      };

      // Ensure SN is a number
      if (payload.sn) payload.sn = Number(payload.sn);
      
      await setDoc(docRef, payload, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, path));
      
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
      const path = `hse_employees/${id}`;
      const docRef = doc(db, 'hse_employees', String(id));
      await deleteDoc(docRef).catch(err => handleFirestoreError(err, OperationType.DELETE, path));
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
        const path = `hse_employees/${id}`;
        const docRef = doc(db, 'hse_employees', id);
        batch.update(docRef, { [bulkUpdateField]: bulkUpdateValue, updated_at: new Date().toISOString() });
      }
      await batch.commit().catch(err => handleFirestoreError(err, OperationType.WRITE, 'bulk_update'));
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
                      ? isDarkMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-900/40' : 'bg-white text-indigo-600 shadow-sm'
                      : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'Settings' ? 'System Settings' : tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
                <button 
                  onClick={loadData}
                  disabled={refreshing}
                  className={`p-2 rounded-lg transition-all ${isDarkMode ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} relative`}
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                  )}
                </button>

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
              <section className={`p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row items-end gap-4 glass-morphism ${isDarkMode ? 'border-slate-700 shadow-slate-950/20' : 'border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex-1 w-full space-y-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-50/50'}`}>
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
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isDarkMode ? 'bg-emerald-900/50' : 'bg-emerald-50/50'}`}>
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
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isDarkMode ? 'bg-amber-900/50' : 'bg-amber-50/50'}`}>
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
                
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl border cursor-pointer transition-all active:scale-95 ${isDarkMode ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600' : 'bg-slate-50 border-slate-200 hover:bg-white hover:shadow-md'}`}>
                  <Filter className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
              </section>

        {/* Hierarchy Selection - Shows when Project is selected */}
        {selectedProject && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Line Manager Selection */}
            {lineManagers.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bento-card relative overflow-hidden group ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full bg-indigo-500`} />
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-50'}`}>
                    <Users className="w-4 h-4 text-indigo-500" />
                  </div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Line Managers <span className="text-indigo-500 font-normal opacity-60">• {selectedProject}</span>
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lineManagers.map((manager) => (
                    <button
                      key={manager}
                      onClick={() => setSelectedLineManager(manager)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all transform active:scale-95 ${
                        selectedLineManager === manager
                          ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                          : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-50 text-slate-600 hover:bg-white hover:shadow-md border border-slate-100 hover:border-indigo-200'
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className={`bento-card relative overflow-hidden group ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full bg-emerald-500`} />
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-emerald-900/50' : 'bg-emerald-50'}`}>
                    <MapPin className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Area Managers <span className="text-emerald-500 font-normal opacity-60">• {selectedLineManager}</span>
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {areaManagers.map((manager) => (
                    <button
                      key={manager}
                      onClick={() => setSelectedAreaManager(manager)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all transform active:scale-95 ${
                        selectedAreaManager === manager
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                          : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-50 text-slate-600 hover:bg-white hover:shadow-md border border-slate-100 hover:border-emerald-200'
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
                  className={`rounded-2xl shadow-2xl overflow-hidden border-2 border-indigo-500 glass-morphism ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
                >
                  <div className="bg-indigo-600 px-8 py-5 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-800" />
                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Direct Match Found</div>
                        <h3 className="text-xl font-display font-bold">Employee Full Profile</h3>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-bold bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10 relative z-10">
                      {exactMatch.employee_no}
                    </div>
                  </div>
                  
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <User className="w-3 h-3" /> Basic Information
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Full Name</span>
                            <span className={`font-bold text-base ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{exactMatch.employee_name}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Gender / Nationality</span>
                            <span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{exactMatch.gender} • {exactMatch.nationality}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Briefcase className="w-3 h-3" /> Professional Details
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Department</span>
                            <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{exactMatch.department}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Designation</span>
                            <span className={`font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{exactMatch.designation} (Level {exactMatch.level})</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3" /> Performance & Reporting
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Project Assignment</span>
                            <span className={`font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`} title={exactMatch.project}>{exactMatch.project}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-indigo-500 font-bold uppercase">KPI Score</span>
                              <span className="text-xl font-display font-black text-indigo-600">{exactMatch.kpi}%</span>
                            </div>
                            <div className="w-12 h-12 rounded-full border-4 border-indigo-100 flex items-center justify-center">
                              <div className="text-[10px] font-black text-indigo-400">Score</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`bento-card flex flex-col min-h-[500px] max-h-[600px] ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 flex-shrink-0">
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
                              onClick={() => handleViewEmployee(emp)}
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
              className="relative overflow-hidden group shadow-2xl rounded-3xl"
            >
              {/* Animated Background Gradients */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900" />
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-12 -mt-12 blur-3xl animate-pulse" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full -ml-8 -mb-8 blur-2xl" />

              <div className="relative z-10 p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xl border border-white/20 overflow-hidden shadow-inner">
                      <img 
                        src="https://media.licdn.com/dms/image/v2/D4D0BAQEQEl1DLgh1LQ/company-logo_200_200/B4DZ12BoSDLQAI-/0/1775801632458/trojanconstructiongroup_logo?e=2147483647&v=beta&t=0usctUmO-DibcIv8aqWULOCkmIbnchhXs6HPh8prAi8" 
                        alt="Trojan" 
                        className="w-7 h-7 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100/70">Performance Hub</h4>
                      <h3 className="text-sm font-display font-bold text-white tracking-tight">Organization Overview</h3>
                    </div>
                  </div>
                  <div className="bg-white/10 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10">
                    <Activity className="w-3.5 h-3.5 text-indigo-200" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-sm group-hover:bg-white/15 transition-colors">
                    <div className="text-2xl font-display font-black text-white">{overviewStats.total.toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-indigo-100/70 uppercase tracking-widest mt-1">Total Staff</div>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-sm group-hover:bg-white/15 transition-colors">
                    <div className="text-2xl font-display font-black text-white">{overviewStats.projects}</div>
                    <div className="text-[10px] font-bold text-indigo-100/70 uppercase tracking-widest mt-1">Active Projects</div>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-sm group-hover:bg-white/15 transition-colors text-emerald-100">
                    <div className="text-2xl font-display font-black text-white">{overviewStats.lm}</div>
                    <div className="text-[10px] font-bold text-indigo-100/70 uppercase tracking-widest mt-1">Line Mgrs</div>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-sm group-hover:bg-white/15 transition-colors text-amber-100">
                    <div className="text-2xl font-display font-black text-white">{overviewStats.am}</div>
                    <div className="text-[10px] font-bold text-indigo-100/70 uppercase tracking-widest mt-1">Area Mgrs</div>
                  </div>
                </div>
              </div>
            </motion.div>



            {/* Department Distribution */}
            {Object.keys(departmentStats).length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={`bento-card flex flex-col h-[320px] ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Users className="w-4 h-4 text-indigo-500" /> Department Mix
                  </h3>
                  <div className="text-[10px] font-bold text-slate-400">Top 5</div>
                </div>
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  <div className="space-y-3">
                    {Object.entries(departmentStats)
                      .sort(([,a], [,b]) => (b as number) - (a as number))
                      .slice(0, 8)
                      .map(([dept, count], index) => (
                        <div key={dept} className="space-y-1.5 group cursor-default">
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-bold truncate max-w-[170px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{dept}</span>
                            <span className={`text-[11px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{count}</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(Math.max(...Object.values(departmentStats) as number[]) > 0 ? (((count as number) / Math.max(...Object.values(departmentStats) as number[])) * 100) : 0)}%` }}
                              transition={{ duration: 0.8, delay: 0.3 + (index * 0.05) }}
                              className={`h-full rounded-full bg-gradient-to-r ${
                                index === 0 ? 'from-indigo-500 to-indigo-600 shadow-sm shadow-indigo-500/30' :
                                index === 1 ? 'from-emerald-500 to-emerald-600 shadow-sm shadow-emerald-500/30' :
                                index === 2 ? 'from-amber-500 to-amber-600 shadow-sm shadow-amber-500/30' :
                                'from-slate-400 to-slate-500'
                              }`}
                            />
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
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-8"
            >
              <div className={`bento-card relative overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full -ml-24 -mb-24 blur-3xl" />

                <div className={`relative z-10 mb-10 pb-8 border-b flex flex-col gap-8 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-50'}`}>
                        <ShieldCheck className="w-8 h-8 text-indigo-500" />
                      </div>
                      <div>
                        <h2 className={`text-2xl font-display font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>HSE Leadership Network</h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Strategic oversight and direct field management protocols</p>
                      </div>
                    </div>
                  </div>
                  <div className={`w-full flex items-center justify-center p-12 rounded-[2rem] border overflow-hidden relative group/logo ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover/logo:opacity-100 transition-opacity" />
                    <img 
                      src="https://procurement.trojanholding.ae/Styles/Images/trojanconstructiongroupalllogo.png" 
                      alt="Trojan Construction Group" 
                      className="w-full max-w-3xl h-auto object-contain relative z-10 drop-shadow-2xl group-hover:scale-[1.02] transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">

                  {leadershipDirectory.map((profile, i) => (
                    <motion.div 
                      key={profile.email}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className={`relative group rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col h-full ${isDarkMode ? 'bg-slate-800/50 border-slate-700 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5'}`}
                    >
                      <div className={`h-16 bg-gradient-to-br ${i % 3 === 0 ? 'from-indigo-500 to-indigo-800' : i % 3 === 1 ? 'from-blue-500 to-blue-800' : 'from-slate-700 to-slate-950'} relative overflow-hidden flex-shrink-0`}>
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                      </div>
                      
                      <div className="px-4 pb-4 -mt-8 relative z-10 flex flex-col flex-grow items-center">
                        <div className="relative mb-3">
                          <div className={`w-14 h-14 rounded-2xl border-4 ${isDarkMode ? 'border-slate-800 bg-slate-900 shadow-xl' : 'border-white bg-white shadow-md'} overflow-hidden transition-transform group-hover:scale-105 duration-300 flex items-center justify-center`}>
                            <div className="w-full h-full flex items-center justify-center font-display font-black text-lg text-slate-400 bg-slate-100/10 uppercase">
                              {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-3.5 h-3.5 rounded-full border-2 border-white"></div>
                        </div>
                        
                        <div className="text-center w-full mb-3">
                          <h3 className={`font-display font-bold text-[11px] leading-tight line-clamp-2 mb-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profile.name}</h3>
                          <div className={`inline-block px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                            {profile.role}
                          </div>
                        </div>

                        <div className="w-full mt-auto">
                          <a 
                            href={`mailto:${profile.email}`}
                            title={profile.email}
                            className={`w-full h-8 rounded-xl flex items-center justify-center gap-1.5 border transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-sm shadow-indigo-500/5'}`}
                          >
                            <Mail className="w-3 h-3" />
                            <span className="text-[10px] font-bold">Message</span>
                          </a>
                        </div>

                        <div className="w-full mt-auto mb-4 border-t pt-3 border-slate-100/5 items-center justify-between group/info flex">
                           <span className={`text-[9px] font-bold uppercase tracking-tighter ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Department</span>
                           <span className={`text-[10px] font-bold truncate max-w-[90px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{profile.dept}</span>
                        </div>
                      </div>
                    </motion.div>
                   ))}
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'Support' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className={`bento-card ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                <div className={`mb-8 pb-8 border-b flex items-start justify-between ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-50'}`}>
                      <Headset className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                      <h2 className={`text-xl font-display font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Contact & Support</h2>
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Direct access to HSE leadership and technical assistance</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      name: "Ahmed Mohamed Abbas Ahmed",
                      role: "HSSE Manager",
                      project: "Trojan HQ",
                      email: "ahmed.abbas@trojanholding.com",
                      color: 'indigo'
                    },
                    {
                      name: "Amal Jagadi",
                      role: "HSE Manager",
                      project: "Trojan HQ",
                      email: "amal.j@npc.ae",
                      color: 'slate'
                    },
                    {
                      name: "Vidyaasree Vijayakrishnan",
                      role: "HSE Analyst",
                      project: "Trojan HQ",
                      email: "vidyaasree.v@trojan.ae",
                      color: 'blue'
                    },
                    {
                      name: "Irshad Basha Syed",
                      role: "Safety Engineer",
                      project: "NPC",
                      email: "irshad.syed@npc.ae",
                      color: 'emerald'
                    },
                    {
                      name: "Elius",
                      role: "Tech Support",
                      project: "Technical Assistance",
                      email: "elius.n@trojan.ae",
                      github: "https://github.com/s6ft256",
                      reference: "TR47934",
                      color: 'violet'
                    }
                  ].map((person, index) => (
                    <motion.div
                      key={person.email}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex flex-col p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-700/30 border-slate-600 hover:border-indigo-500 hover:bg-slate-700/50' : 'bg-slate-50/50 border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5'}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-1">
                          <h3 className={`font-bold text-sm leading-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{person.name}</h3>
                          <div className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                            {person.role}
                          </div>
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-white shadow-sm'}`}>
                           <User className={`w-4 h-4 text-${person.color}-500`} />
                        </div>
                      </div>

                      <div className="space-y-2.5 mt-auto">
                        <div className={`flex items-center gap-2 text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500 uppercase tracking-tight'}`}>
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          {person.project}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100/10">
                          <a 
                            href={`mailto:${person.email}`}
                            className={`flex flex-1 items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] font-bold transition-all border ${isDarkMode ? 'bg-indigo-900/20 border-indigo-900/50 text-indigo-300 hover:bg-indigo-600 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-md'}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Email
                          </a>
                          {person.github && (
                            <a 
                              href={person.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[10px] font-bold transition-all border ${isDarkMode ? 'bg-slate-700/50 border-slate-600 text-slate-400 hover:text-indigo-400' : 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-md'}`}
                            >
                              <Github className="w-3.5 h-3.5" />
                              GitHub
                            </a>
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
                            className={`w-full rounded-lg pl-9 pr-10 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-slate-50 border-slate-200'}`}
                          />
                          {adminSearchTerm && (
                            <button 
                              onClick={() => setAdminSearchTerm('')}
                              className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
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

                      {/* Admin Search Results */}
                      {adminSearchTerm.length >= 2 && (
                        <div className={`text-xs mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          Searching for: <span className="font-bold">"{adminSearchTerm}"</span>
                        </div>
                      )}

                      {adminSearchResults.length > 0 ? (
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

                          <h4 className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Search Results ({adminSearchResults.length})</h4>
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
                      ) : adminSearchTerm.length >= 2 ? (
                        <div className="py-4 text-center text-xs italic text-slate-400">
                          No employees found matching "{adminSearchTerm}"
                        </div>
                      ) : null}
                    </div>

                    {/* Data Management - Excel Import */}
                    <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-700/30 border-slate-600' : 'bg-indigo-50/30 border-indigo-100'}`}>
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
                              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Data Management (Excel Import)</h3>
                          </div>
                          {importStatus && (
                            <button 
                              onClick={() => setImportStatus(null)}
                              className={`text-[10px] px-2 py-1 rounded ${importStatus.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                            >
                              Dismiss {importStatus.type === 'success' ? 'Success' : 'Error'}
                            </button>
                          )}
                        </div>

                        {importStatus && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
                              importStatus.type === 'success' 
                                ? isDarkMode ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : isDarkMode ? 'bg-red-900/20 text-red-400 border border-red-800/50' : 'bg-red-50 text-red-700 border border-red-100'
                            }`}
                          >
                            {importStatus.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                            <div className="text-sm font-medium">{importStatus.message}</div>
                          </motion.div>
                        )}

                        {pendingData ? (
                            <div className={`p-6 rounded-xl border-2 border-indigo-200 ${isDarkMode ? 'bg-slate-800 border-indigo-900/50' : 'bg-white shadow-xl shadow-indigo-100'}`}>
                                <h4 className="font-bold mb-4 flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                  Import Preview: {pendingData.sheetName}
                                </h4>
                                <div className="grid grid-cols-1 gap-4 mb-6">
                                    <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Records found in "{pendingData.sheetName}"</div>
                                        <div className="text-2xl font-bold">{pendingData.data?.length || 0}</div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    <button
                                      onClick={() => setPreviewSheet(previewSheet ? null : pendingData.sheetName)}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                        previewSheet 
                                          ? 'bg-indigo-600 text-white shadow-md' 
                                          : isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
                                      }`}
                                    >
                                      {previewSheet ? 'Hide Preview' : 'Show Preview'}
                                    </button>
                                </div>

                                <AnimatePresence>
                                  {previewSheet && pendingData.data?.length > 0 && (
                                    <motion.div 
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className={`overflow-hidden mb-6`}
                                    >
                                      <div className={`max-h-60 overflow-auto border rounded-lg p-1 text-[10px] shadow-inner ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                        <table className="w-full border-collapse">
                                          <thead className="sticky top-0 bg-inherit shadow-sm">
                                            <tr>
                                              {Object.keys(pendingData.data[0]).map(key => (
                                                <th key={key} className="text-left font-bold border-b p-2 whitespace-nowrap bg-indigo-50/50 uppercase tracking-tighter">{key}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {pendingData.data.slice(0, 5).map((row: any, idx: number) => (
                                              <tr key={idx} className="hover:bg-indigo-50/20">
                                                {Object.values(row).map((val: any, vIdx: number) => (
                                                  <td key={vIdx} className="border-b p-2 opacity-80">{String(val)}</td>
                                                ))}
                                              </tr>
                                            ))}
                                            {pendingData.data.length > 5 && (
                                              <tr>
                                                <td colSpan={100} className="p-2 text-center text-slate-400 italic">
                                                  And {pendingData.data.length - 5} more records...
                                                </td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                <div className="flex gap-3 pt-4 border-t border-slate-100">
                                    <button 
                                        onClick={handleProceedImport}
                                        disabled={importLoading}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50"
                                    >
                                        {importLoading ? (
                                          <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <ShieldCheck className="w-4 h-4" />
                                        )}
                                        {importLoading ? 'Importing...' : 'Proceed with Final Import'}
                                    </button>
                                    <button 
                                        onClick={() => { setPendingData(null); setPreviewSheet(null); }}
                                        className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                          <div className={`relative group p-8 rounded-2xl border-2 border-dashed transition-all ${
                            isDarkMode 
                              ? 'bg-slate-800/50 border-slate-700 hover:border-indigo-500/50' 
                              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50'
                          }`}>
                              <input
                                  type="file"
                                  onChange={handleImportEmployees}
                                  disabled={importLoading}
                                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                  accept=".xlsx"
                              />
                              <div className="flex flex-col items-center justify-center text-center">
                                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                                    <FileSpreadsheet className={`w-8 h-8 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                  </div>
                                  <div className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                      {importLoading ? 'Reading File...' : 'Upload Excel Data File'}
                                  </div>
                                  <p className={`text-sm max-w-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                      Select <span className="font-mono text-indigo-500 font-bold">data.xlsx</span> to import employee List, sheet2, and sheet3.
                                  </p>
                                  <div className="mt-6 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold ring-4 ring-indigo-50/50">
                                    Click or Drag & Drop
                                  </div>
                              </div>
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

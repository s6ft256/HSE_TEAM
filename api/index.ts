import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit, where, getCountFromServer, doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Initialize Firebase
let db: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Firebase config file not found at ${configPath}`);
  }
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  console.log('Firebase initialized successfully with database:', firebaseConfig.firestoreDatabaseId);
} catch (e: any) {
  console.error('Firebase initialization error:', e.message);
  // Do NOT return response here, let the request handlers handle db === null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req;
  const path = url?.split('?')[0];
  
  if (!db && path?.startsWith('/api') && path !== '/api/health') {
    return res.status(200).json({ 
      error: 'Firebase is not initialized. Check your configuration.' 
    });
  }

  try {
    // Health check
    if (path === '/api/health' || path === '/api/health/') {
      let tableInfo = { count: 0, sampleColumns: [] as string[], error: null as any };
      
      if (db) {
        try {
          const coll = collection(db, 'hse_employees');
          const snapshot = await getCountFromServer(coll);
          const sampleQuery = query(coll, limit(1));
          const sampleSnapshot = await getDocs(sampleQuery);

          tableInfo.count = snapshot.data().count;
          if (!sampleSnapshot.empty) {
            tableInfo.sampleColumns = Object.keys(sampleSnapshot.docs[0].data());
          }
        } catch (e: any) {
          console.error('Health check error:', e);
          tableInfo.error = e.message;
        }
      }

      return res.json({
        status: 'ok',
        firebaseInitialized: !!db,
        tableInfo
      });
    }

    // Profile endpoints
    if (path === '/api/profile' || path === '/api/profile/') {
      if (!db) throw new Error('DB not initialized');
      const uid = (req.query.uid as string) || (req.body?.uid as string);
      if (!uid) throw new Error('UID is required');

      if (req.method === 'GET') {
        const docRef = doc(db, 'management_profiles', uid);
        const profileSnap = await getDoc(docRef);
        if (!profileSnap.exists()) {
          return res.json(null);
        }
        return res.json(profileSnap.data());
      }

      if (req.method === 'POST' || req.method === 'PUT') {
        const profile = req.body;
        const docRef = doc(db, 'management_profiles', uid);
        await setDoc(docRef, { ...profile, uid, updatedAt: new Date().toISOString() }, { merge: true });
        return res.json({ success: true });
      }
    }

    // Projects endpoint
    if (path === '/api/projects' || path === '/api/projects/') {
      if (!db) throw new Error('DB not initialized');
      const snapshot = await getDocs(collection(db, 'hse_employees'));
      const projects = [...new Set(snapshot.docs.map(doc => doc.data().project))].filter(Boolean);
      return res.json(projects);
    }

    // Line managers endpoint
    if (path === '/api/line-managers' || path === '/api/line-managers/') {
      if (!db) throw new Error('DB not initialized');
      const project = req.query.project as string;
      const q = query(collection(db, 'hse_employees'), where('project', '==', project));
      const snapshot = await getDocs(q);
      
      const managers = [...new Set(snapshot.docs.map(doc => doc.data().line_manager))].filter(Boolean);
      return res.json(managers);
    }

    // Area managers endpoint
    if (path === '/api/area-managers' || path === '/api/area-managers/') {
      if (!db) throw new Error('DB not initialized');
      const lineManager = req.query.line_manager as string;
      const q = query(collection(db, 'hse_employees'), where('line_manager', '==', lineManager));
      const snapshot = await getDocs(q);
      
      const managers = [...new Set(snapshot.docs.map(doc => doc.data().area_manager))].filter(Boolean);
      return res.json(managers);
    }

    // Employees endpoint
    if (path === '/api/employees' || path === '/api/employees/') {
      if (!db) throw new Error('DB not initialized');
      const areaManager = req.query.area_manager as string;
      const q = query(collection(db, 'hse_employees'), where('area_manager', '==', areaManager));
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json(data);
    }

    // Search endpoint
    if (path === '/api/search' || path === '/api/search/') {
      if (!db) throw new Error('DB not initialized');
      const queryTerm = req.query.q as string;
      if (!queryTerm) return res.json([]);

      const coll = collection(db, 'hse_employees');
      const snapshot = await getDocs(coll);
      
      const term = queryTerm.toLowerCase();
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(emp => {
          return (emp.employee_no?.toLowerCase().includes(term)) ||
                 (emp.employee_name?.toLowerCase().includes(term)) ||
                 (emp.department?.toLowerCase().includes(term)) ||
                 (emp.designation?.toLowerCase().includes(term));
        })
        .slice(0, 50);
      
      return res.json(results);
    }

    // Create employee endpoint
    if ((path === '/api/employees' || path === '/api/employees/') && req.method === 'POST') {
      if (!db) throw new Error('DB not initialized');
      const employee = req.body;
      if (!employee.employee_no) throw new Error('Employee No is required');
      
      const docRef = doc(db, 'hse_employees', employee.employee_no);
      await setDoc(docRef, { ...employee, updated_at: new Date().toISOString() });
      return res.json({ success: true, id: employee.employee_no });
    }

    // Update employee endpoint
    if (path?.startsWith('/api/employees/') && req.method === 'PUT') {
      if (!db) throw new Error('DB not initialized');
      const id = path.split('/').pop();
      const body = req.body;
      
      const docRef = doc(db, 'hse_employees', id as string);
      await updateDoc(docRef, { ...body, updated_at: new Date().toISOString() });
      return res.json({ success: true });
    }

    // Delete employee endpoint
    if (path?.startsWith('/api/employees/') && req.method === 'DELETE') {
      if (!db) throw new Error('DB not initialized');
      const id = path.split('/').pop();
      const docRef = doc(db, 'hse_employees', id as string);
      await deleteDoc(docRef);
      return res.json({ success: true });
    }

    // Stats endpoint
    if (path === '/api/stats' || path === '/api/stats/') {
      if (!db) throw new Error('DB not initialized');
      const snapshot = await getDocs(collection(db, 'hse_employees'));
      const data = snapshot.docs.map(doc => doc.data());
      
      const safeData = data || [];
      const parsedData = safeData.map((e: any) => ({
        ...e,
        kpiNumeric: parseFloat(e.kpi || '0') || 0
      }));

      const kpiDistribution = {
        '0-60': parsedData.filter((e: any) => e.kpiNumeric <= 60).length,
        '61-80': parsedData.filter((e: any) => e.kpiNumeric > 60 && e.kpiNumeric <= 80).length,
        '81-100': parsedData.filter((e: any) => e.kpiNumeric > 80).length,
      };

      const totalEmployees = safeData.length;
      const totalProjects = new Set(safeData.map((e: any) => e.project).filter(Boolean)).size;
      const totalLineManagers = new Set(safeData.map((e: any) => e.line_manager).filter(Boolean)).size;
      const totalAreaManagers = new Set(safeData.map((e: any) => e.area_manager).filter(Boolean)).size;

      const qualificationBreakdown = safeData.reduce((acc: any, curr: any) => {
        if (curr.qualification) {
          acc[curr.qualification] = (acc[curr.qualification] || 0) + 1;
        }
        return acc;
      }, {});

      const designationBreakdown = safeData.reduce((acc: any, curr: any) => {
        if (curr.designation) {
          acc[curr.designation] = (acc[curr.designation] || 0) + 1;
        }
        return acc;
      }, {});

      return res.json({
        kpiDistribution,
        qualificationBreakdown,
        designationBreakdown,
        totalEmployees,
        totalProjects,
        totalLineManagers,
        totalAreaManagers
      });
    }

    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (err: any) {
    console.error('API Error:', err.message);
    return res.status(200).json({ error: err.message });
  }
}

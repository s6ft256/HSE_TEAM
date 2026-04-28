import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit, where, getCountFromServer, doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

// Initialize Firebase safely
let db: any = null;
try {
  const firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  console.log('Firebase initialized successfully with database:', firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.error('Firebase initialization error:', e);
}

// Middleware to check for Firebase configuration
app.use((req, res, next) => {
  if (!db && req.path.startsWith('/api') && req.path !== '/api/health') {
    return res.status(200).json({ 
      error: 'Firebase is not initialized. Check your configuration.' 
    });
  }
  next();
});

// API Endpoints
app.get('/api/health', async (req, res) => {
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

  res.json({
    status: 'ok',
    firebaseInitialized: !!db,
    tableInfo
  });
});

// Profile endpoints
app.all('/api/profile', async (req, res) => {
  try {
    if (!db) throw new Error('DB not initialized');
    const uid = (req.query.uid as string) || (req.body?.uid as string);
    
    if (req.method === 'GET') {
      if (uid) {
        const docRef = doc(db, 'management_profiles', uid);
        const profileSnap = await getDoc(docRef);
        if (!profileSnap.exists()) {
          return res.json(null);
        }
        return res.json(profileSnap.data());
      } else {
        const snapshot = await getDocs(collection(db, 'management_profiles'));
        const profiles = snapshot.docs.map(doc => doc.data());
        return res.json(profiles);
      }
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const profile = req.body;
      const docRef = doc(db, 'management_profiles', uid);
      await setDoc(docRef, { ...profile, uid, updatedAt: new Date().toISOString() }, { merge: true });
      return res.json({ success: true });
    }
  } catch (err: any) {
    res.status(200).json({ error: err.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    if (!db) throw new Error('DB not initialized');
    const snapshot = await getDocs(collection(db, 'hse_employees'));
    const projects = [...new Set(snapshot.docs.map(doc => doc.data().project))].filter(Boolean).sort();
    res.json(projects);
  } catch (err: any) {
    console.error('Projects API Error:', err.message);
    res.status(200).json({ error: err.message });
  }
});

app.get('/api/line-managers', async (req, res) => {
  try {
    if (!db) throw new Error('DB not initialized');
    const project = req.query.project as string;
    const q = query(collection(db, 'hse_employees'), where('project', '==', project));
    const snapshot = await getDocs(q);
    
    const managers = [...new Set(snapshot.docs.map(doc => doc.data().line_manager))].filter(Boolean).sort();
    res.json(managers);
  } catch (err: any) {
    res.status(200).json({ error: err.message });
  }
});

app.get('/api/area-managers', async (req, res) => {
  try {
    if (!db) throw new Error('DB not initialized');
    const lineManager = req.query.line_manager as string;
    const q = query(collection(db, 'hse_employees'), where('line_manager', '==', lineManager));
    const snapshot = await getDocs(q);
    
    const managers = [...new Set(snapshot.docs.map(doc => doc.data().area_manager))].filter(Boolean).sort();
    res.json(managers);
  } catch (err: any) {
    res.status(200).json({ error: err.message });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    if (!db) throw new Error('DB not initialized');
    const areaManager = req.query.area_manager as string;
    const q = query(collection(db, 'hse_employees'), where('area_manager', '==', areaManager));
    const snapshot = await getDocs(q);
    
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(data);
  } catch (err: any) {
    res.status(200).json({ error: err.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
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
    
    res.json(results);
  } catch (err: any) {
    res.status(200).json({ error: err.message });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    if (!db) throw new Error('DB not initialized');
    const employee = req.body;
    if (!employee.employee_no) throw new Error('Employee No is required');
    
    const docRef = doc(db, 'hse_employees', employee.employee_no);
    await setDoc(docRef, { ...employee, updated_at: new Date().toISOString() });
    res.json({ success: true, id: employee.employee_no });
  } catch (err: any) {
    console.error('Create Employee Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    if (!db) throw new Error('DB not initialized');
    const { id } = req.params;
    const body = req.body;
    
    const docRef = doc(db, 'hse_employees', id);
    await updateDoc(docRef, { ...body, updated_at: new Date().toISOString() });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Update Employee Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    if (!db) throw new Error('DB not initialized');
    const { id } = req.params;
    const docRef = doc(db, 'hse_employees', id);
    await deleteDoc(docRef);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete Employee Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:employee_no', async (req, res) => {
  try {
    if (!db) throw new Error('DB not initialized');
    const { employee_no } = req.params;
    const updates = req.body;
    
    // Find the document ID for this employee_no
    const q = query(collection(db, 'hse_employees'), where('employee_no', '==', employee_no));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const docId = snapshot.docs[0].id;
    await updateDoc(doc(db, 'hse_employees', docId), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/all-employees', async (req, res) => {
  try {
    if (!db) throw new Error('DB not initialized');
    const snapshot = await getDocs(collection(db, 'hse_employees'));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(data);
  } catch (err: any) {
    res.status(200).json({ error: err.message });
  }
});

// Stats API for charts
app.get('/api/stats', async (req, res) => {
  try {
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

    const projectBreakdown = safeData.reduce((acc: any, curr: any) => {
      if (curr.project) {
        acc[curr.project] = (acc[curr.project] || 0) + 1;
      }
      return acc;
    }, {});

    res.json({
      kpiDistribution,
      qualificationBreakdown,
      designationBreakdown,
      projectBreakdown,
      totalEmployees,
      totalProjects,
      totalLineManagers,
      totalAreaManagers
    });
  } catch (err: any) {
    res.status(200).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

startServer();

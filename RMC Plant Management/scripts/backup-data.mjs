import fs from 'fs';
import path from 'path';

async function backup() {
  const { db } = await import('../src/config/firebase.js');
  const { collection, getDocs } = await import('firebase/firestore');

  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const collections = ['users', 'employees', 'auditLogs', 'attendance', 'shifts', 'companies'];
  const fullBackup = {
    timestamp: new Date().toISOString(),
    environment: 'production-smconcretech-2149c',
    collections: {},
  };

  for (const col of collections) {
    const snap = await getDocs(collection(db, col));
    fullBackup.collections[col] = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
    console.log(`Backed up ${col}: ${snap.docs.length} documents`);
  }

  const backupPath = path.join(backupDir, 'firestore-backup-2026-10-16.json');
  fs.writeFileSync(backupPath, JSON.stringify(fullBackup, null, 2), 'utf-8');
  console.log('Verified backup saved to:', backupPath);
  process.exit(0);
}

backup().catch((err) => {
  console.error('Backup error:', err);
  process.exit(1);
});

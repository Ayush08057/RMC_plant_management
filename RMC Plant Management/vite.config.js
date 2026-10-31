import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

// Local High-Speed Live Telemetry & Attendance Sync Hub for instant Mobile <-> Web admin updates
function liveSyncPlugin() {
  const syncFile = path.resolve(__dirname, 'src/data/live_sync_attendance.json');
  let memoryStore = { attendance: [], liveLocations: {} };

  try {
    if (fs.existsSync(syncFile)) {
      memoryStore = JSON.parse(fs.readFileSync(syncFile, 'utf8'));
    }
  } catch (_) {}

  return {
    name: 'live-sync-hub',
    configureServer(server) {
      server.middlewares.use('/api/sync/attendance', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            try {
              const payload = JSON.parse(body || '{}');
              if (payload.attendanceRecord) {
                const rec = payload.attendanceRecord;
                const idx = memoryStore.attendance.findIndex(a => a.id === rec.id || (a.employeeId === rec.employeeId && a.date === rec.date));
                if (idx >= 0) {
                  memoryStore.attendance[idx] = { ...memoryStore.attendance[idx], ...rec };
                } else {
                  memoryStore.attendance.unshift(rec);
                }
              }

              if (payload.employeeId && payload.location) {
                const empId = payload.employeeId.toString().trim().toUpperCase();
                memoryStore.liveLocations[empId] = {
                  ...payload.location,
                  employeeId: empId,
                  updatedAt: new Date().toISOString()
                };

                // Also update corresponding attendance record if exists
                const attIdx = memoryStore.attendance.findIndex(a => a.employeeId?.toUpperCase() === empId);
                if (attIdx >= 0) {
                  const att = memoryStore.attendance[attIdx];
                  att.lastKnownLocation = payload.location;
                  att.gpsLocation = payload.location;
                  if (!att.routeTrail) att.routeTrail = [];
                  att.routeTrail.push({
                    stopNo: att.routeTrail.length + 1,
                    lat: payload.location.lat,
                    lng: payload.location.lng,
                    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
                    address: payload.location.address || 'Live Location',
                    title: payload.location.landmarkName || 'En Route'
                  });
                }
              }

              // Persist non-blocking to disk
              fs.writeFile(syncFile, JSON.stringify(memoryStore, null, 2), () => {});

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true, count: memoryStore.attendance.length }));
            } catch (err) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            attendance: memoryStore.attendance || [],
            liveLocations: memoryStore.liveLocations || {}
          }));
        }

        res.statusCode = 405;
        res.end();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    liveSyncPlugin(),
  ],
  server: {
    host: true,
    port: 3000,
    open: false,
  },
});

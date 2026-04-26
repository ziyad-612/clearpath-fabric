'use strict';

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { getContract } = require('./fabricClient');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Serve Frontend Static Files ──────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── In-memory sessions: token → { userID, name, role, email } ───
const sessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ─── Auth middleware ───────────────────────────────────────────────
function auth(req, res, next) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token || !sessions.has(token))
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  req.user = sessions.get(token);
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'Admin')
    return res.status(403).json({ error: 'Admin access required.' });
  next();
}

// Role-based middleware factory
function roles(...allowed) {
  return (req, res, next) => {
    if (!allowed.includes(req.user.role))
      return res.status(403).json({ error: `Access denied. Required role: ${allowed.join(' or ')}.` });
    next();
  };
}

// Shorthand middleware sets
const canRegister = roles('Admin', 'Manufacturer');
const canTransfer = roles('Admin', 'Manufacturer', 'Logistics', 'Retailer');
const canIoT = roles('Admin', 'Manufacturer', 'Logistics', 'Retailer');
const canReport = roles('Admin', 'Manufacturer', 'Logistics', 'Retailer');

// ─── Fabric helper ────────────────────────────────────────────────
async function submit(fn, ...args) {
  const { contract, gateway, client } = await getContract();
  try {
    const bytes = await contract.submitTransaction(fn, ...args);
    return JSON.parse(Buffer.from(bytes).toString('utf8'));
  } finally { gateway.close(); client.close(); }
}

async function evaluate(fn, ...args) {
  const { contract, gateway, client } = await getContract();
  try {
    const bytes = await contract.evaluateTransaction(fn, ...args);
    const str = Buffer.from(bytes).toString('utf8');
    try { return JSON.parse(str); } catch { return str; }
  } finally { gateway.close(); client.close(); }
}

// ═══════════════════════════════════════════════════════════════════
//  HEALTH
// ═══════════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ═══════════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════════
app.post('/api/auth/register', async (req, res) => {
  const { userID, name, email, role, password } = req.body;
  if (!userID || !name || !email || !role || !password)
    return res.status(400).json({ error: 'All fields are required.' });
  try {
    const result = await submit('CreateUser', userID, name, email, role, password);
    
    // Auto-disable non-consumer accounts so Admin must approve them
    if (role !== 'Consumer' && role !== 'Admin' && userID !== 'admin') {
      try {
        await submit('DisableUser', userID);
      } catch (err) {
        console.error('Failed to auto-disable user for approval:', err);
      }
    }
    
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { userID, password } = req.body;
  if (!userID || !password)
    return res.status(400).json({ error: 'userID and password are required.' });
  try {
    // Auto-create admin if first time
    if (userID === 'admin') {
      try {
        const existing = await evaluate('AuthenticateUser', 'admin', password);
        if (existing.success) {
          const token = generateToken();
          sessions.set(token, { userID: existing.userID, name: existing.name, role: existing.role, email: existing.email });
          return res.json({ token, user: { userID: existing.userID, name: existing.name, role: existing.role, email: existing.email } });
        }
        if (existing.message === 'User not found') {
          // Create default admin
          await submit('CreateUser', 'admin', 'System Admin', 'admin@clearpath.com', 'Admin', 'admin123');
          const created = await evaluate('AuthenticateUser', 'admin', password);
          if (created.success) {
            const token = generateToken();
            sessions.set(token, { userID: created.userID, name: created.name, role: created.role, email: created.email });
            return res.json({ token, user: { userID: created.userID, name: created.name, role: created.role, email: created.email } });
          }
          return res.status(401).json({ error: created.message || 'Invalid credentials' });
        }
        return res.status(401).json({ error: existing.message || 'Invalid credentials' });
      } catch (inner) {
        // Fallback if chaincode not yet deployed
        console.error('Admin auto-init error:', inner.message);
        return res.status(500).json({ error: 'Cannot connect to blockchain. Is the network running?' });
      }
    }
    // Normal login for non-admin
    const result = await evaluate('AuthenticateUser', userID, password);
    if (!result.success) {
      let errMsg = result.message;
      if (errMsg === 'Account is disabled') {
        errMsg = 'Account is pending Admin approval. Please wait to be enabled.';
      }
      return res.status(401).json({ error: errMsg });
    }
    const token = generateToken();
    sessions.set(token, { userID: result.userID, name: result.name, role: result.role, email: result.email });
    res.json({ token, user: { userID: result.userID, name: result.name, role: result.role, email: result.email } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


app.post('/api/auth/logout', auth, (req, res) => {
  const token = req.headers['authorization'].replace('Bearer ', '').trim();
  sessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/auth/me', auth, (req, res) => res.json(req.user));

// ═══════════════════════════════════════════════════════════════════
//  USER MANAGEMENT  (Admin only)
// ═══════════════════════════════════════════════════════════════════
app.get('/api/users', auth, adminOnly, async (req, res) => {
  try { res.json(await evaluate('GetAllUsers')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/users/:id/role', auth, adminOnly, async (req, res) => {
  const { role } = req.body;
  try { res.json(await submit('UpdateUserRole', req.params.id, role)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/users/:id/disable', auth, adminOnly, async (req, res) => {
  try { res.json(await submit('DisableUser', req.params.id)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/users/:id/enable', auth, adminOnly, async (req, res) => {
  try { res.json(await submit('EnableUser', req.params.id)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/profile', auth, async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required.' });
  try {
    const result = await submit('UpdateProfile', req.user.userID, name, email);
    // Update session
    sessions.forEach((val, key) => {
      if (val.userID === req.user.userID) { val.name = name; val.email = email; }
    });
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════════════════════════════
app.post('/api/register', auth, canRegister, async (req, res) => {
  const { batchID, productName, manufacturer, productionDate, minTemp, maxTemp, minHum, maxHum } = req.body;
  if (!batchID || !productName || !manufacturer || !productionDate)
    return res.status(400).json({ error: 'All product fields are required.' });
  try { res.json(await submit('RegisterProduct', batchID, productName, manufacturer, productionDate, String(minTemp || ''), String(maxTemp || ''), String(minHum || ''), String(maxHum || ''))); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/tx', auth, canTransfer, async (req, res) => {
  const { batchID, newOwner, location, temperature, minTemp, maxTemp, minHum, maxHum } = req.body;
  try { res.json(await submit('RecordTransaction', batchID, newOwner, location, temperature, String(minTemp || ''), String(maxTemp || ''), String(minHum || ''), String(maxHum || ''))); }
  catch (e) {
    console.error('TX ERROR:', e);
    res.status(500).json({ error: e.message, details: e.details });
  }
});

app.get('/api/trace/:batchID', async (req, res) => {
  try { res.json(await evaluate('TraceProduct', req.params.batchID)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/verify/:batchID', async (req, res) => {
  try { res.json(await evaluate('VerifyProduct', req.params.batchID)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/products', auth, async (req, res) => {
  try { res.json(await evaluate('GetAllProducts')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Search
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter "q" is required.' });
  try { res.json(await evaluate('SearchProducts', q)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
//  IoT
// ═══════════════════════════════════════════════════════════════════
app.post('/api/iot', auth, canIoT, async (req, res) => {
  const { batchID, deviceID, sensorType, value, unit } = req.body;
  if (!batchID || !deviceID || !sensorType || value === undefined || !unit)
    return res.status(400).json({ error: 'All IoT fields are required.' });
  try { res.json(await submit('RecordIoTReading', batchID, deviceID, sensorType, String(value), unit)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
//  REPORTS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/reports', auth, canReport, async (req, res) => {
  const { startDate = '', endDate = '' } = req.query;
  try { res.json(await evaluate('GenerateReport', startDate, endDate)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════
app.get('/api/notifications', auth, async (req, res) => {
  try { res.json(await evaluate('GetNotifications')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notifications/read', auth, async (req, res) => {
  try { res.json(await submit('MarkAllNotificationsRead')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════════════════════
async function initAdmin() {
  try {
    const check = await evaluate('AuthenticateUser', 'admin', 'admin123');
    if (check.message === 'User not found') {
      await submit('CreateUser', 'admin', 'System Admin', 'admin@clearpath.com', 'Admin', 'admin123');
      console.log('✅ Default admin account created (admin / admin123)');
    } else {
      console.log('ℹ️  Admin account already exists.');
    }
  } catch (e) {
    console.warn('⚠️  Could not auto-init admin (blockchain may not be ready):', e.message);
  }
}

const PORT = 3000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ ClearPath API running on http://localhost:${PORT}`);
  console.log(`🌐 Frontend available at http://localhost:${PORT}`);
  await initAdmin();
});

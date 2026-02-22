'use strict';

const express = require('express');
const cors = require('cors');
const { getContract } = require('./fabricClient');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Register product
app.post('/api/register', async (req, res) => {
  const { batchID, productName, manufacturer, productionDate } = req.body;

  try {
    const { contract, gateway, client } = await getContract();
    const resultBytes = await contract.submitTransaction(
      'RegisterProduct',
      batchID,
      productName,
      manufacturer,
      productionDate
    );

    gateway.close();
    client.close();

    const result = Buffer.from(resultBytes).toString('utf8');
    res.json(JSON.parse(result));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Record transaction
app.post('/api/tx', async (req, res) => {
  const { batchID, newOwner, location, temperature } = req.body;
  let gateway, client;

  try {
    const conn = await getContract();
    gateway = conn.gateway;
    client = conn.client;
    const contract = conn.contract;

    const resultBytes = await contract.submitTransaction(
      'RecordTransaction',
      batchID,
      newOwner,
      location,
      temperature
    );

    res.json(JSON.parse(Buffer.from(resultBytes).toString('utf8')));
  } catch (e) {
    console.error('ERROR FULL:', e);
    res.status(500).json({
      error: e.message,
      name: e.name,
      code: e.code,
      details: e.details,
      cause: e.cause?.message,
      stack: e.stack,
    });
  } finally {
    gateway?.close();
    client?.close();
  }
});

// Trace product
app.get('/api/trace/:batchID', async (req, res) => {
  const { batchID } = req.params;

  try {
    const { contract, gateway, client } = await getContract();
    const resultBytes = await contract.evaluateTransaction('TraceProduct', batchID);

    gateway.close();
    client.close();

    res.json(JSON.parse(Buffer.from(resultBytes).toString('utf8')));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Verify product
app.get('/api/verify/:batchID', async (req, res) => {
  const { batchID } = req.params;

  try {
    const { contract, gateway, client } = await getContract();
    const resultBytes = await contract.evaluateTransaction('VerifyProduct', batchID);

    gateway.close();
    client.close();

    res.json({ message: Buffer.from(resultBytes).toString('utf8') });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = 3001;
app.listen(PORT, '127.0.0.1', () => console.log(`✅ API running on http://localhost:${PORT}`));

#!/usr/bin/env node

/**
 * Debug Express routing issue
 */

require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

// Create a simple test router
const testRouter = express.Router();

testRouter.use((req, res, next) => {
  console.log(`[ROUTER] ${req.method} ${req.path} ${req.originalUrl}`);
  next();
});

testRouter.get('/test', (req, res) => {
  console.log('TEST ROUTE HIT!');
  res.json({ success: true, message: 'Test route working' });
});

// Add main app middleware
app.use((req, res, next) => {
  console.log(`[APP] ${req.method} ${req.path} ${req.originalUrl}`);
  next();
});

app.use('/daimo', testRouter);

const PORT = 3002;
const server = app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  
  const axios = require('axios');
  
  console.log('\\n=== Testing /daimo/test ===');
  axios.get(`http://localhost:${PORT}/daimo/test`)
    .then(response => {
      console.log('✅ SUCCESS:', response.data);
    })
    .catch(error => {
      console.error('❌ FAILED:', error.response?.status, error.response?.data);
    })
    .finally(() => {
      server.close();
    });
});
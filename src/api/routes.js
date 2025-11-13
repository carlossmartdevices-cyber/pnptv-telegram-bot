const express = require('express');
const router = express.Router();

// Import all API route modules
const primeActivationRoutes = require('./primeActivation');

// Register routes
router.use('/prime-activation', primeActivationRoutes);

module.exports = router;

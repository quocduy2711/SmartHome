const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authGuard, authorizeRoles } = require('../middleware/auth');

// ─── List & Read ──────────────────────────────────────────────
router.get('/',            authGuard,                            deviceController.getAllDevices);
router.get('/logs',        authGuard,                            deviceController.getRecentLogs);
router.get('/:id',         authGuard,                            deviceController.getDeviceById);
router.get('/:id/history', authGuard,                            deviceController.getDeviceHistory);
router.get('/:id/logs',    authGuard,                            deviceController.getDeviceCommandLogs);

// ─── Create / Update / Delete (Admin only) ───────────────────
router.post('/',    authGuard, authorizeRoles('admin'),          deviceController.createDevice);
router.put('/:id',  authGuard, authorizeRoles('admin'),          deviceController.updateDevice);
router.delete('/:id', authGuard, authorizeRoles('admin'),        deviceController.deleteDevice);

// ─── Control ─────────────────────────────────────────────────
router.post('/:id/control', authGuard,                           deviceController.controlDevice);
router.post('/:id/toggle',  authGuard,                           deviceController.toggleDevice);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getItems, addItem } = require('./itemController.js');

// GET /api/items
router.get('/', getItems);

// POST /api/items (optional)
router.post('/', addItem);

module.exports = router;

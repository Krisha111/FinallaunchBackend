const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const itemRoutes = require('./itemRoute.js');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://127.0.0.1:27017/myAppDB')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

app.use('/api/items', itemRoutes);

app.listen(5000, () => console.log('Server running on port 5000'));

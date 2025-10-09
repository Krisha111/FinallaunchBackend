// models/Authentication/SignUp.js

import mongoose from 'mongoose';

const signUpSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  }
}, { timestamps: true });

const signUpUser = mongoose.model('signUpUser', signUpSchema);

export default signUpUser;

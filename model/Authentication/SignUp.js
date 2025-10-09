// // import mongoose from 'mongoose';
// // import bcrypt from 'bcrypt';
// // import jwt from 'jsonwebtoken';

// const signUpSchema = new mongoose.Schema({
//   username: {
//     type: String,
//     required: true,
//     unique: true,
//     trim: true,
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//     trim: true,
//   },
//   password: {
//     type: String,
//     required: true,
//     minlength: 6,
//   },
// });

// // Hash password before saving
// signUpSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return next(); // Only hash if password changed

//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (err) {
//     next(err);
//   }
// });

// // Compare password method for login
// signUpSchema.methods.comparePassword = async function (candidatePassword) {
//   return bcrypt.compare(candidatePassword, this.password);
// };

// // New: Generate JWT token method on user instance
// signUpSchema.methods.generateAuthToken = function () {
//   // Use your JWT_SECRET from environment variables
//   return jwt.sign(
//     { id: this._id, username: this.username, email: this.email },
//     process.env.JWT_SECRET,
//     { expiresIn: '7d' } // token expires in 7 days (adjust as you want)
//   );
// };

// const signUpUser = mongoose.model('signUpUser', signUpSchema);
// export default signUpUser;

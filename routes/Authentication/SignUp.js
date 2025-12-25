import express from 'express';
import { signUpRouteUser, getAllUsers,updateProfileImage, deleteAccount } from '../../controller/Authentication/SignUp.js';
import { protect } from '../../MiddleWare/authMiddleware.js'; // ✅ import protect middleware

const router = express.Router();

router.delete('/delete-account', protect, deleteAccount);


// 🔐 Public route - used for signing up
router.post('/signUp', signUpRouteUser);

// 🔐 Protected route - only accessible with valid JWT
router.get('/getSignedUp', protect, getAllUsers);
router.put("/profile-image",protect, updateProfileImage);
export default router;

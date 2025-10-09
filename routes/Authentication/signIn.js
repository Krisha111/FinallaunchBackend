import express from 'express';
import { signInRouteUser} from '../../controller/Authentication/SignIn.js';

const router = express.Router();

router.post('/signIn', signInRouteUser); // Matches your frontend endpoint

export default router;

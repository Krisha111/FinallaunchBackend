import express from 'express';
import  {getAllPublicContent}  from '../../controllers/PublicContent/getAllPublicContent.js';

const router = express.Router();

router.get('/getAllPublicContent', getAllPublicContent);

export default router;

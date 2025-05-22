import express, { RequestHandler } from 'express';
import { register, login, forgotPassword, validateResetToken, resetPassword } from '../controllers/authController';

const router = express.Router();

router.post('/register', register as RequestHandler);
router.post('/login', login as RequestHandler);
router.post('/forgot-password', forgotPassword as RequestHandler);
router.get('/reset-password/:token', validateResetToken as RequestHandler);
router.post('/reset-password/:token', resetPassword as RequestHandler<{ token: string }, any, { password: string }>);

export default router; 
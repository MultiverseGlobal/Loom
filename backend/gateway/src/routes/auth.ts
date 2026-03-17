import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/supabase-auth.js';
import { db } from '../db/memory.js';

const JWT_SECRET = process.env.JWT_SECRET || 'loom_dev_secret_change_in_production';

const generateToken = (userId: string): string => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export async function registerAuthRoutes(server: FastifyInstance) {
    // Sign up
    server.post('/api/auth/signup', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { name, email, password } = request.body as any;

            // Validation
            if (!name || !email || !password) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: 'MISSING_FIELDS',
                        message: 'Name, email, and password are required'
                    }
                });
            }

            if (password.length < 8) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: 'WEAK_PASSWORD',
                        message: 'Password must be at least 8 characters'
                    }
                });
            }

            // Check if user exists
            const existingUser = await db.getUserByEmail(email);
            if (existingUser) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: 'EMAIL_EXISTS',
                        message: 'Email already registered'
                    }
                });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Create user
            const user = await db.createUser(name, email, passwordHash);

            // Generate token
            const token = generateToken(user.id);

            // Create session
            await db.createSession(user.id, token);

            reply.send({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        createdAt: user.created_at
                    },
                    token
                }
            });
        } catch (error) {
            server.log.error(error, 'Signup error');
            reply.status(500).send({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to create account'
                }
            });
        }
    });

    // Login
    server.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { email, password } = request.body as any;

            // Validation
            if (!email || !password) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: 'MISSING_FIELDS',
                        message: 'Email and password are required'
                    }
                });
            }

            // Find user
            const user = await db.getUserByEmail(email);
            if (!user) {
                return reply.status(401).send({
                    success: false,
                    error: {
                        code: 'INVALID_CREDENTIALS',
                        message: 'Invalid email or password'
                    }
                });
            }

            // Verify password
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                return reply.status(401).send({
                    success: false,
                    error: {
                        code: 'INVALID_CREDENTIALS',
                        message: 'Invalid email or password'
                    }
                });
            }

            // Generate token
            const token = generateToken(user.id);

            // Create session
            await db.createSession(user.id, token);

            reply.send({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        createdAt: user.created_at
                    },
                    token
                }
            });
        } catch (error) {
            server.log.error(error, 'Login error');
            reply.status(500).send({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to login'
                }
            });
        }
    });

    // Logout
    server.post('/api/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const authHeader = request.headers.authorization;
            const token = authHeader?.substring(7);

            if (token) {
                await db.deleteSession(token);
            }

            reply.send({
                success: true,
                data: { message: 'Logged out successfully' }
            });
        } catch (error) {
            server.log.error(error, 'Logout error');
            reply.status(500).send({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to logout'
                }
            });
        }
    });

    // Get current user
    server.get('/api/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const authHeader = request.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return reply.status(401).send({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'No token provided'
                    }
                });
            }

            const token = authHeader.substring(7);

            // Get session
            const session = await db.getSessionByToken(token);
            if (!session) {
                return reply.status(401).send({
                    success: false,
                    error: {
                        code: 'SESSION_EXPIRED',
                        message: 'Session expired'
                    }
                });
            }

            // Get user
            const user = await db.getUserById(session.user_id);
            if (!user) {
                return reply.status(404).send({
                    success: false,
                    error: {
                        code: 'USER_NOT_FOUND',
                        message: 'User not found'
                    }
                });
            }

            reply.send({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        createdAt: user.created_at
                    }
                }
            });
        } catch (error) {
            server.log.error(error, 'Get user error');
            reply.status(500).send({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to get user'
                }
            });
        }
    });
}

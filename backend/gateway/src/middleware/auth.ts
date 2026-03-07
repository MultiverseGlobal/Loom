import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'loom_dev_secret_change_in_production';

export const generateToken = (userId: string): string => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): { userId: string } | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch (error) {
        return null;
    }
};

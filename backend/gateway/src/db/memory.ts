// Simple in-memory database for V1 testing
// TODO: Replace with PostgreSQL in production

interface User {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    created_at: Date;
}

interface Session {
    id: string;
    user_id: string;
    token: string;
    expires_at: Date;
    created_at: Date;
}

class InMemoryDB {
    private users: Map<string, User> = new Map();
    private sessions: Map<string, Session> = new Map();
    private usersByEmail: Map<string, User> = new Map();

    // User operations
    async createUser(name: string, email: string, password_hash: string): Promise<User> {
        const id = crypto.randomUUID();
        const user: User = {
            id,
            name,
            email: email.toLowerCase(),
            password_hash,
            created_at: new Date(),
        };

        this.users.set(id, user);
        this.usersByEmail.set(email.toLowerCase(), user);
        return user;
    }

    async getUserByEmail(email: string): Promise<User | null> {
        return this.usersByEmail.get(email.toLowerCase()) || null;
    }

    async getUserById(id: string): Promise<User | null> {
        return this.users.get(id) || null;
    }

    // Session operations
    async createSession(user_id: string, token: string, expiresInDays: number = 7): Promise<Session> {
        const id = crypto.randomUUID();
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + expiresInDays);

        const session: Session = {
            id,
            user_id,
            token,
            expires_at,
            created_at: new Date(),
        };

        this.sessions.set(token, session);
        return session;
    }

    async getSessionByToken(token: string): Promise<Session | null> {
        const session = this.sessions.get(token);
        if (!session) return null;

        // Check if expired
        if (session.expires_at < new Date()) {
            this.sessions.delete(token);
            return null;
        }

        return session;
    }

    async deleteSession(token: string): Promise<void> {
        this.sessions.delete(token);
    }

    // Cleanup expired sessions periodically
    cleanupExpiredSessions(): void {
        const now = new Date();
        for (const [token, session] of this.sessions.entries()) {
            if (session.expires_at < now) {
                this.sessions.delete(token);
            }
        }
    }
}

export const db = new InMemoryDB();

// Cleanup expired sessions every hour
setInterval(() => {
    db.cleanupExpiredSessions();
}, 60 * 60 * 1000);

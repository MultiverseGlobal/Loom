import { createClient } from '@/lib/supabase';

type SocketCallback = (message: any) => void;

class SocketService {
    private ws: WebSocket | null = null;
    private subscribers: Set<SocketCallback> = new Set();
    private isConnected = false;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private statusListeners: Set<(isOnline: boolean) => void> = new Set();

    constructor() {
        if (typeof window !== 'undefined') {
            this.connect();
        }
    }

    private async connect() {
        // In real app, get this from env
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:4000/ws';

        console.log(`Frontend connecting to: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = async () => {
            console.log('Frontend WS Connected');
            this.isConnected = true;
            this.notifyStatus(true);

            // Authenticate (Mocking for now, could grab session token)
            // const supabase = createClient();
            // const { data } = await supabase.auth.getSession();
            // const token = data.session?.access_token;

            this.send({
                type: 'AUTH',
                payload: {
                    apiKey: 'web-client-dummy-key', // Ideally use session token
                    projectId: 'active-project-id' // Could be dynamic
                }
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.subscribers.forEach(cb => cb(message));
            } catch (e) {
                console.error('WS Parse Error', e);
            }
        };

        this.ws.onclose = () => {
            console.log('Frontend WS Closed');
            this.isConnected = false;
            this.notifyStatus(false);
            this.scheduleReconnect();
        };

        this.ws.onerror = (err) => {
            // Only log if we were connected to avoid noise on initial load
            if (this.isConnected) {
                console.error('Frontend WS Error', err);
            }
        };
    }

    private scheduleReconnect() {
        if (!this.reconnectTimer) {
            this.reconnectTimer = setInterval(() => {
                if (this.ws?.readyState === WebSocket.CLOSED) {
                    this.connect();
                }
            }, 5000);
        }
    }

    public send(message: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    public subscribe(callback: SocketCallback) {
        this.subscribers.add(callback);
        return () => { this.subscribers.delete(callback); };
    }

    public onStatusChange(callback: (isOnline: boolean) => void) {
        this.statusListeners.add(callback);
        // Initial state
        callback(this.isConnected);
        return () => { this.statusListeners.delete(callback); };
    }

    private notifyStatus(isOnline: boolean) {
        this.statusListeners.forEach(cb => cb(isOnline));
    }
}

export const socketService = new SocketService();

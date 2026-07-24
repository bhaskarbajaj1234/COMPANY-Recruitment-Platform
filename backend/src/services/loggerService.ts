import { EventEmitter } from 'events';

class LoggerService extends EventEmitter {
    logActivity(message: string, type: 'INFO' | 'SUCCESS' | 'ALERT' = 'INFO') {
        const logPayload = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            timestamp: new Date().toLocaleTimeString(),
            message,
            type
        };
        this.emit('new-log', logPayload);
    }
}

export const loggerService = new LoggerService();
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface AppErrorEntry {
    id: string;
    timestamp: string;
    message: string;
    context?: string;
    synced: boolean;
}

@Injectable()
export class ErrorLogService {
    private readonly logger = new Logger(ErrorLogService.name);
    private readonly logDir = path.resolve('error-logs');
    private readonly logFile = path.join(this.logDir, 'app-errors.json');

    async saveEntries(entries: AppErrorEntry[]): Promise<void> {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        let existing: AppErrorEntry[] = [];
        if (fs.existsSync(this.logFile)) {
            try {
                const raw = fs.readFileSync(this.logFile, 'utf8');
                existing = JSON.parse(raw) as AppErrorEntry[];
            } catch {
                existing = [];
            }
        }

        const existingIds = new Set(existing.map((e) => e.id));
        const newEntries = entries.filter((e) => !existingIds.has(e.id));

        if (newEntries.length === 0) {
            return;
        }

        const merged = [...existing, ...newEntries];
        fs.writeFileSync(this.logFile, JSON.stringify(merged, null, 2), 'utf8');
        this.logger.log(`Saved ${newEntries.length} new error log entries to ${this.logFile}`);
    }
}

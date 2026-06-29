import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { ErrorLogService, AppErrorEntry } from './error-log.service';

interface SyncErrorLogsRequest {
    entries: AppErrorEntry[];
}

@Controller('error-log')
export class ErrorLogController {
    constructor(private readonly errorLogService: ErrorLogService) { }

    @Post()
    @HttpCode(200)
    async syncErrors(@Body() body: SyncErrorLogsRequest): Promise<{ success: boolean }> {
        await this.errorLogService.saveEntries(body.entries ?? []);
        return { success: true };
    }
}

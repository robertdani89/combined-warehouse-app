import { Module } from '@nestjs/common';
import { ErrorLogController } from './error-log.controller';
import { ErrorLogService } from './error-log.service';

@Module({
    controllers: [ErrorLogController],
    providers: [ErrorLogService],
    exports: [ErrorLogService],
})
export class ErrorLogModule { }

import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ReportFeladat, TaskItem, TaskRecord, TasksService } from './tasks.service';

interface MarkReceivedRequest {
  taskIds: number[];
}

interface ReportTasksRequest {
  feladatok: ReportFeladat[];
  telefonIdo?: string;
}

interface RequestTasksRequest {
  userName: string;
  taskIds: number[];
}

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async getFeladatok(@Query('userName') userName: string): Promise<TaskRecord[]> {
    return this.tasksService.getFeladatok(userName);
  }

  @Get('has-empty')
  async hasEmptyTask(): Promise<{ van: number }> {
    const van = await this.tasksService.vanUresFeladat();
    return { van };
  }

  @Post('received')
  async markReceived(@Body() body: MarkReceivedRequest): Promise<{ success: boolean }> {
    await this.tasksService.updateTaskStatusReceived(body.taskIds ?? []);
    return { success: true };
  }

  @Get(':id/items')
  async getTetelek(@Param('id', ParseIntPipe) id: number): Promise<TaskItem[]> {
    return this.tasksService.getTetelek(id);
  }

  @Post('report')
  async reportFeladatok(@Body() body: ReportTasksRequest): Promise<{ success: boolean }> {
    await this.tasksService.reportFeladatok(body.feladatok ?? [], body.telefonIdo ?? '');
    return { success: true };
  }

  @Get('free/list')
  async szabadFeladatok(): Promise<Array<Record<string, unknown>>> {
    return this.tasksService.szabadFeladatok();
  }

  @Post('request')
  async requestTasks(@Body() body: RequestTasksRequest): Promise<{ success: boolean }> {
    const success = await this.tasksService.kertFeladat(
      body.userName,
      body.taskIds ?? [],
    );
    return { success };
  }

  @Get(':id/route')
  async utvonal(@Param('id', ParseIntPipe) id: number): Promise<{ route: string[] }> {
    const route = await this.tasksService.utvonal(id);
    return { route };
  }
}

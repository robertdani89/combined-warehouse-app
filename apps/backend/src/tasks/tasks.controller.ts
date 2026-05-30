import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ReportItem, ReportTask, TaskItem, TaskRecord, TasksService } from './tasks.service';

interface MarkReceivedRequest {
  taskIds: number[];
}

interface ReportTasksRequest {
  tasks: ReportTask[];
  phoneTime?: string;
}

interface ReportTaskItemRequest {
  item: ReportItem;
  phoneTime?: string;
}

interface RequestTasksRequest {
  userName: string;
  taskIds: number[];
}

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async getTasks(@Query('userName') userName: string): Promise<TaskRecord[]> {
    return this.tasksService.getTasks(userName);
  }

  @Get('has-empty')
  async hasEmptyTask(): Promise<{ van: number }> {
    const van = await this.tasksService.hasEmptyTask();
    return { van };
  }

  @Post('received')
  async markReceived(@Body() body: MarkReceivedRequest): Promise<{ success: boolean }> {
    await this.tasksService.updateTaskStatusReceived(body.taskIds ?? []);
    return { success: true };
  }

  @Get(':id/items')
  async getTaskItems(@Param('id', ParseIntPipe) id: number): Promise<TaskItem[]> {
    return this.tasksService.getTaskItems(id);
  }

  @Put('report-item')
  async reportTaskItem(@Body() body: ReportTaskItemRequest): Promise<{ success: boolean }> {
    await this.tasksService.reportItem(body.item, +(body.phoneTime ?? 0));
    return { success: true };
  }

  @Post('report')
  async reportTasks(@Body() body: ReportTasksRequest): Promise<{ success: boolean }> {
    await this.tasksService.reportTasks(body.tasks ?? [], body.phoneTime ?? '');
    return { success: true };
  }

  @Get('free/list')
  async getFreeTasks(): Promise<Array<Record<string, unknown>>> {
    return this.tasksService.getFreeTasks();
  }

  @Post('request')
  async requestTasks(@Body() body: RequestTasksRequest): Promise<{ success: boolean }> {
    const success = await this.tasksService.requestTasks(
      body.userName,
      body.taskIds ?? [],
    );
    return { success };
  }

  @Get(':id/route')
  async getRoute(@Param('id', ParseIntPipe) id: number): Promise<{ route: string[] }> {
    const route = await this.tasksService.getRoute(id);
    return { route };
  }
}

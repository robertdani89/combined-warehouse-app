import { Injectable } from '@nestjs/common';
import { MssqlService } from '../database/mssql.service';
import { MessagesService } from '../messages/messages.service';
import { TaskRecord, TaskItem, ReportTask, ReportItem } from './tasks.type';

@Injectable()
export class TasksService {
  constructor(
    private readonly mssqlService: MssqlService,
    private readonly messagesService: MessagesService,
  ) { }

  private async safeQuery<T>(
    context: string,
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    try {
      return await this.mssqlService.query<T>(sql, params);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`SQL query failed in ${context}: ${message}\nSQL: ${sql}\nParams: ${JSON.stringify(params)}`);
    }
  }

  private async safeExecute(
    context: string,
    sql: string,
    params?: unknown[],
  ): Promise<void> {
    try {
      await this.mssqlService.execute(sql, params);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`SQL execute failed in ${context}: ${message}\nSQL: ${sql}\nParams: ${JSON.stringify(params)}`);
    }
  }

  async getTasks(userName: string): Promise<TaskRecord[]> {
    const sql = `
      SELECT fel.[_id], allapot, [felado], [fel_tipus], surgosseg,
      CONVERT(varchar(5), befejezte, 108) AS befejezte,
      CONVERT(varchar(5), elkezdte, 108) AS elkezdte,
      CONVERT(varchar(19), [datum], 120) AS datum,
      CONVERT(varchar(16), kelt, 120) AS kelt,
      [hivatkozas], ISNULL(comment, '') comment, fel.megnevezes
      FROM [Raktaros_feladatok] fel
      WHERE raktaros = @p0 AND datum = CONVERT(date, SYSDATETIME())
      ORDER BY CASE WHEN allapot >= 4 THEN 1 ELSE 0 END DESC, kelt ASC;
    `;

    const tasks = await this.safeQuery<TaskRecord>('getTasks.tasks', sql, [userName]);
    const taskIds: number[] = [];

    for (const task of tasks) {
      taskIds.push(task._id);
      // if ((task.allapot ?? 0) < 5) {
      //   task.items = await this.getTaskItems(task._id);
      // }
      task.messages = await this.messagesService.getMessages(task._id);
      task.hasUnread = await this.messagesService.hasUnreadMessages(task._id, userName);
    }

    if (taskIds.length > 0) {
      this.updateTaskStatusReceived(taskIds).catch((error) => {
        console.error('Failed to update task status to received:', error);
      });
    }

    return tasks;
  }

  async hasEmptyTask(): Promise<number> {
    const sql = `
      SELECT CASE
      WHEN EXISTS(
        SELECT 1
        FROM robie.dbo.raktaros_feladatok
        WHERE datum = CONVERT(date, SYSDATETIME())
        AND ISNULL(raktaros, '') = ''
      )
      THEN 1 ELSE 0 END van;
    `;

    const row = await this.safeQuery<{ van: number }>('hasEmptyTask', sql);
    return row[0]?.van ?? 0;
  }

  async updateTaskStatusReceived(taskIds: number[]): Promise<void> {
    if (taskIds.length === 0) {
      return;
    }

    const placeholders = taskIds.map((_, index) => `@p${index}`).join(',');
    const sql = `
      SET NOCOUNT ON;
      UPDATE [Robie].[dbo].[Raktaros_feladatok]
      SET megkapta = SYSDATETIME(), allapot = 2
      WHERE allapot IN (0, 1) AND _id IN (${placeholders});
    `;

    await this.safeExecute('updateTaskStatusReceived', sql, taskIds);
  }

  async getTaskItems(feladatId: number): Promise<TaskItem[]> {
    const sql = `
      DECLARE @DB varchar(10)
		DECLARE @feladatId int

		SET @feladatId = @p0
		SET @DB = isnull((SELECT hivatkozas2 from raktaros_feladatok where _id = @feladatId), 'vyw')

		EXEC('
		SELECT t.[_id]
		,t.hivatkozas tetelHiv
		,t.[FeladatId]
		,t.[Etk]
		,cikknev1 Cikknev
		,t.[Mennyiseg]
		,(SELECT RAKTARNEV1 from ' + @DB + '.dbo.Raktar where RAKTARKOD = t.Raktar) Raktar
		,t.[Tarolo]
		,(SELECT [sorrend] from [utvonal_cimek] where id = t.hivatkozas) Raktar1
		,t.[Tarolo1]
		,isnull([Att1], '''') Att1
		,isnull([Att2], '''') Att2
		,isnull([Att3], '''') Att3
		,isnull([Att4], '''') Att4
		,isnull([Att5], '''') Att5
		,(SELECT [nev] from [utvonal_cimek] where id = t.hivatkozas) vevo
		,(SELECT [varos] from [utvonal_cimek] where id = t.hivatkozas) varos
		,MEROV1 as Mero
		,n.Allapot allapot
		,n.Megjegyzes megj
		,n.Mennyiseg tkeszlet
		,convert(varchar(16), n.Ido, 112) Ido
		FROM [raktaros_feladat_tetelek] t
		left join ' + @DB + '.dbo.cikk on cikk.etk = t.etk
		left join (SELECT *, ROW_NUMBER() over (PARTITION BY TetelId ORDER BY ido DESC) rn FROM raktaros_feladat_tetelek_naplo) n
		on n.rn = 1 and n.TetelId = t._id
		where FeladatId = ' + @feladatId)
    `;

    return this.safeQuery<TaskItem>('getTaskItems', sql, [feladatId]);
  }

  async reportTasks(tasks: ReportTask[], phoneTime = ''): Promise<void> {
    let timeOffset = 0;
    if (phoneTime) {
      const phoneTimestamp = Math.floor(new Date(phoneTime).getTime() / 1000);
      if (!Number.isNaN(phoneTimestamp)) {
        const now = Math.floor(Date.now() / 1000);
        timeOffset = now - phoneTimestamp;
      }
    }

    for (const task of tasks) {
      await this.reportTask(task, timeOffset);
    }
  }

  async reportTask(task: ReportTask, timeOffset: number): Promise<void> {
    if (typeof task.allapot !== 'number') {
      return;
    }

    await this.safeExecute(
      'reportTasks.updateStatus',
      `
        UPDATE [Raktaros_feladatok]
        SET allapot = @p1
        WHERE _id = @p0 AND allapot != @p1;
        `,
      [task.id, task.allapot],
    );

    if (task.elkezdte !== undefined) {
      await this.safeExecute(
        'reportTasks.completeTask',
        `
          SET NOCOUNT ON;
          UPDATE [Raktaros_feladatok]
          SET allapot = 5, [befejezte] = @p0, [elkezdte] = @p1, [lejelentette] = GETDATE()
          WHERE _id = @p2;
          `,
        [task.befejezte ?? null, task.elkezdte ?? null, task.id],
      );

      await this.reportItems(task, timeOffset);
    }
  }

  async reportItems(task: ReportTask, timeOffset: number): Promise<void> {
    const items = task.items ?? [];

    for (const item of items) {
      await this.reportItem(item, timeOffset);
    }
  }

  async reportItem(item: ReportItem, timeOffset?: number): Promise<void> {
    let itemId = item.tetel_id;
    timeOffset ??= 0;

    const isValidIntId = (v: unknown): v is number =>
      typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 2147483647;

    if (!isValidIntId(itemId)) {
      return;
    }

    for (const log of item.naplo ?? []) {
      let time = log.naplo_ido;
      if (time && timeOffset) {
        const timestamp = Math.floor(new Date(time).getTime() / 1000);
        if (!Number.isNaN(timestamp)) {
          time = new Date((timestamp + timeOffset) * 1000)
            .toISOString()
            .slice(0, 19)
            .replace('T', ' ');
        }
      }

      const isDuplicate = await this.isDuplicateNaploEntry(
        itemId,
        time,
      );

      if (isDuplicate) {
        continue;
      }

      await this.safeExecute(
        'reportItems.reportItemLog',
        'EXEC raktar_feladat_report_tetel @id = @p0, @allapot = @p1, @menny = @p2, @megjegyzes = @p3, @ido = @p4;',
        [
          itemId ?? null,
          log.naplo_allapot ?? null,
          log.naplo_mennyiseg ?? null,
          log.naplo_megjegyzes ?? null,
          time,
        ],
      );
    }
  }

  // Skips insert when this exact Ido was already logged, or the most recent log already has the same state
  private async isDuplicateNaploEntry(
    tetelId: number,
    ido: string,
  ): Promise<boolean> {
    const rows = await this.safeQuery<{ isDuplicate: number }>(
      'reportItems.checkDuplicateNaplo',
      `
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM raktaros_feladat_tetelek_naplo
        WHERE TetelId = @p0 AND Ido = @p1
      ) THEN 1 ELSE 0 END AS isDuplicate

      `,
      [tetelId, ido],
    );

    return rows[0]?.isDuplicate === 1;
  }

  async getFreeTasks(): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SELECT fel.[_id], [felado], [fel_tipus], ISNULL(comment, '') comment, fel.megnevezes
      FROM [Raktaros_feladatok] fel
      LEFT JOIN Robie.[dbo].[Raktaros_feladatok_megnevezesek] m ON m._id = fel_tipus
      WHERE (ISNULL(fel.raktaros, '') = '')
      AND fel.datum = CONVERT(date, GETDATE())
      AND fel.surgosseg = (
        SELECT TOP 1 MIN(f.surgosseg)
        FROM [Raktaros_feladatok] f
        WHERE (ISNULL(f.raktaros, '') = '') AND f.datum = CONVERT(date, GETDATE())
      );
    `;

    return this.safeQuery('getFreeTasks', sql);
  }

  async requestTasks(userName: string, taskIds: number[]): Promise<boolean> {
    if (taskIds.length === 0) {
      return false;
    }

    const placeholders = taskIds.map((_, index) => `@p${index + 1}`).join(',');
    const sql = `
      UPDATE Raktaros_feladatok
      SET raktaros = @p0
      WHERE (raktaros = '' OR raktaros IS NULL) AND _id IN (${placeholders});
    `;

    await this.safeExecute('requestTasks', sql, [userName, ...taskIds]);
    return true;
  }

  async getRoute(id: number): Promise<string[]> {
    const sql = `
      SELECT nev + ' ' + varos as cim
      FROM utvonal_cimek
      WHERE utvonal_id = (SELECT hivatkozas FROM raktaros_feladatok WHERE _id = @p0)
      ORDER BY sorrend;
    `;

    const rows = await this.safeQuery<{ cim: string }>('getRoute', sql, [id]);
    return rows.map((row) => row.cim);
  }
}

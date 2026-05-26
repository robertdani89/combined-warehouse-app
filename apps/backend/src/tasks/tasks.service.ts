import { Injectable } from '@nestjs/common';
import { MssqlService } from '../database/mssql.service';
import { MessagesService, TaskMessage } from '../messages/messages.service';

export interface TaskItem {
  _id: number;
  [key: string]: unknown;
}

export interface TaskRecord {
  _id: number;
  allapot: number;
  [key: string]: unknown;
  tetelek?: TaskItem[];
  uzenetek?: TaskMessage[];
}

export interface ReportLogEntry {
  naplo_allapot?: number;
  naplo_mennyiseg?: number;
  naplo_megjegyzes?: string;
  naplo_ido?: string;
}

export interface ReportTetel {
  tetel_id?: number;
  _id?: number;
  tetel_etk?: string;
  tetel_tarolohely?: string;
  naplo: ReportLogEntry[];
}

export interface ReportFeladat {
  id: number;
  allapot?: number;
  befejezte?: string;
  elkezdte?: string;
  tetelek?: ReportTetel[];
}

@Injectable()
export class TasksService {
  constructor(
    private readonly mssqlService: MssqlService,
    private readonly messagesService: MessagesService,
  ) {}

  async getFeladatok(userName: string): Promise<TaskRecord[]> {
    const sql = `
      SELECT fel.[_id], allapot, [felado], [fel_tipus], m.megnevezes, surgosseg,
      CONVERT(varchar(5), befejezte, 108) AS befejezte,
      CONVERT(varchar(5), elkezdte, 108) AS elkezdte,
      CONVERT(varchar(19), [datum], 120) AS datum,
      CONVERT(varchar(16), kelt, 120) AS kelt,
      [hivatkozas], ISNULL(comment, '') comment, fel.megnevezes hiv
      FROM [Raktaros_feladatok] fel
      INNER JOIN [Raktaros_feladatok_megnevezesek] m ON m._id = fel_tipus
      WHERE raktaros = @p0 AND datum = CONVERT(date, SYSDATETIME());
    `;

    const tasks = await this.mssqlService.query<TaskRecord>(sql, [userName]);
    const taskIds: number[] = [];

    for (const task of tasks) {
      taskIds.push(task._id);
      if ((task.allapot ?? 0) < 5) {
        task.tetelek = await this.getTetelek(task._id);
      }
      task.uzenetek = await this.messagesService.getUzenetek(task._id, userName);
    }

    if (taskIds.length > 0) {
      await this.updateTaskStatusReceived(taskIds);
    }

    return tasks;
  }

  async vanUresFeladat(): Promise<number> {
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

    const row = await this.mssqlService.query<{ van: number }>(sql);
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

    await this.mssqlService.execute(sql, taskIds);
  }

  async getTetelek(feladatId: number): Promise<TaskItem[]> {
    const sql = `
      DECLARE @DB varchar(10);
      DECLARE @feladatId int;

      SET @feladatId = @p0;
      SET @DB = ISNULL((SELECT hivatkozas2 FROM raktaros_feladatok WHERE _id = @feladatId), 'vyw');

      EXEC('
        SELECT t.[_id],
        t.hivatkozas tetelHiv,
        t.[FeladatId],
        t.[Etk],
        cikknev1 Cikknev,
        t.[Mennyiseg],
        (SELECT RAKTARNEV1 FROM ' + @DB + '.dbo.Raktar WHERE RAKTARKOD = t.Raktar) Raktar,
        t.[Tarolo],
        (SELECT [sorrend] FROM [utvonal_cimek] WHERE id = t.hivatkozas) Raktar1,
        t.[Tarolo1],
        ISNULL([Att1], '''''') Att1,
        ISNULL([Att2], '''''') Att2,
        ISNULL([Att3], '''''') Att3,
        ISNULL([Att4], '''''') Att4,
        ISNULL([Att5], '''''') Att5,
        (SELECT [nev] FROM [utvonal_cimek] WHERE id = t.hivatkozas) vevo,
        (SELECT [varos] FROM [utvonal_cimek] WHERE id = t.hivatkozas) varos,
        MEROV1 as Mero,
        n.Allapot allapot,
        n.Megjegyzes megj,
        n.Mennyiseg tkeszlet,
        CONVERT(varchar(16), n.Ido, 112) Ido
        FROM [raktaros_feladat_tetelek] t
        LEFT JOIN ' + @DB + '.dbo.cikk ON cikk.etk = t.etk
        LEFT JOIN (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY TetelId ORDER BY ido DESC) rn
          FROM raktaros_feladat_tetelek_naplo
        ) n ON n.rn = 1 AND n.TetelId = t._id
        WHERE FeladatId = ' + CONVERT(varchar(20), @feladatId)
      );
    `;

    return this.mssqlService.query<TaskItem>(sql, [feladatId]);
  }

  async reportFeladatok(feladatok: ReportFeladat[], telefonIdo = ''): Promise<void> {
    let idoModosito = 0;
    if (telefonIdo) {
      const phoneTime = Math.floor(new Date(telefonIdo).getTime() / 1000);
      if (!Number.isNaN(phoneTime)) {
        const now = Math.floor(Date.now() / 1000);
        idoModosito = now - phoneTime;
      }
    }

    for (const feladat of feladatok) {
      if (typeof feladat.allapot !== 'number') {
        continue;
      }

      await this.mssqlService.execute(
        `
        UPDATE [Raktaros_feladatok]
        SET allapot = @p1
        WHERE _id = @p0 AND allapot != @p1;
        `,
        [feladat.id, feladat.allapot],
      );

      if (feladat.elkezdte !== undefined) {
        await this.mssqlService.execute(
          `
          SET NOCOUNT ON;
          UPDATE [Raktaros_feladatok]
          SET allapot = 5, [befejezte] = @p0, [elkezdte] = @p1, [lejelentette] = GETDATE()
          WHERE _id = @p2;
          `,
          [feladat.befejezte ?? null, feladat.elkezdte ?? null, feladat.id],
        );

        await this.reportTetelek(feladat, idoModosito);
      }
    }
  }

  async reportTetelek(feladat: ReportFeladat, idoModosito: number): Promise<void> {
    const tetelek = feladat.tetelek ?? [];

    for (const tetel of tetelek) {
      let tetelId = tetel.tetel_id;

      if (!tetelId) {
        const sourceId = tetel._id ?? -1;
        const existing = await this.mssqlService.query<{ tetelsz: number }>(
          `
          SELECT ISNULL((
            SELECT _id
            FROM raktaros_feladat_tetelek
            WHERE FeladatId = @p0 AND Att5 = @p1
          ), -1) tetelsz;
          `,
          [feladat.id, sourceId],
        );

        tetelId = existing[0]?.tetelsz ?? -1;

        if (tetelId === -1) {
          const inserted = await this.mssqlService.query<{ tetelsz: number }>(
            `
            SET NOCOUNT ON;
            INSERT raktaros_feladat_tetelek (FeladatId, Etk, Tarolo, Att5)
            VALUES (@p0, @p1, @p2, @p3);
            SELECT CONVERT(int, SCOPE_IDENTITY()) as tetelsz;
            `,
            [feladat.id, tetel.tetel_etk ?? null, tetel.tetel_tarolohely ?? null, sourceId],
          );
          tetelId = inserted[0]?.tetelsz;
        }
      }

      for (const naplo of tetel.naplo ?? []) {
        let ido = naplo.naplo_ido ?? null;
        if (ido) {
          const timestamp = Math.floor(new Date(ido).getTime() / 1000);
          if (!Number.isNaN(timestamp)) {
            ido = new Date((timestamp + idoModosito) * 1000)
              .toISOString()
              .slice(0, 19)
              .replace('T', ' ');
          }
        }

        await this.mssqlService.execute(
          'EXEC raktar_feladat_report_tetel @id = @p0, @allapot = @p1, @menny = @p2, @megjegyzes = @p3, @ido = @p4;',
          [
            tetelId ?? null,
            naplo.naplo_allapot ?? null,
            naplo.naplo_mennyiseg ?? null,
            naplo.naplo_megjegyzes ?? null,
            ido,
          ],
        );
      }
    }
  }

  async szabadFeladatok(): Promise<Array<Record<string, unknown>>> {
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

    return this.mssqlService.query(sql);
  }

  async kertFeladat(userName: string, kertArray: number[]): Promise<boolean> {
    if (kertArray.length === 0) {
      return false;
    }

    const placeholders = kertArray.map((_, index) => `@p${index + 1}`).join(',');
    const sql = `
      UPDATE Raktaros_feladatok
      SET raktaros = @p0
      WHERE (raktaros = '' OR raktaros IS NULL) AND _id IN (${placeholders});
    `;

    await this.mssqlService.execute(sql, [userName, ...kertArray]);
    return true;
  }

  async utvonal(id: number): Promise<string[]> {
    const sql = `
      SELECT nev + ' ' + varos as cim
      FROM utvonal_cimek
      WHERE utvonal_id = (SELECT hivatkozas FROM raktaros_feladatok WHERE _id = @p0)
      ORDER BY sorrend;
    `;

    const rows = await this.mssqlService.query<{ cim: string }>(sql, [id]);
    return rows.map((row) => row.cim);
  }
}

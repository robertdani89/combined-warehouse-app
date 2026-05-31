import { Injectable } from '@nestjs/common';
import { MssqlService } from '../database/mssql.service';

export interface TaskMessage {
  _id: number;
  felado: string;
  uzenet: string;
  kelt: string;
}

@Injectable()
export class MessagesService {
  constructor(private readonly mssqlService: MssqlService) {}

  async getUzenetek(feladatId: number, userName: string): Promise<TaskMessage[]> {
    const sql = `
      SET NOCOUNT ON;
      DECLARE @feladat_id int = @p0;
      DECLARE @userName varchar(255) = @p1;

      SELECT u.[_id], u.[felado], [uzenet], CONVERT(varchar(5), u.[kelt], 108) kelt
      INTO #temp_uzenetek_table
      FROM [raktaros_feladat_uzenetek] u
      INNER JOIN raktaros_feladatok f ON u.feladatId = f._id
      WHERE feladatId = @feladat_id
      ORDER BY kelt;

      IF 0 < (SELECT COUNT(*) FROM #temp_uzenetek_table)
      BEGIN
        IF EXISTS(SELECT 1 FROM raktaros_uzenet_ki_latta WHERE feladat_id = @feladat_id AND felhasznalo = @userName)
        BEGIN
          UPDATE raktaros_uzenet_ki_latta
          SET latta = 1, mikor = SYSDATETIME()
          WHERE feladat_id = @feladat_id AND felhasznalo = @userName AND latta = 0;
        END
        ELSE
        BEGIN
          INSERT raktaros_uzenet_ki_latta (feladat_id, felhasznalo, latta, mikor)
          VALUES (@feladat_id, @userName, 1, SYSDATETIME());
        END
      END

      SELECT * FROM #temp_uzenetek_table;

      DROP TABLE #temp_uzenetek_table;
    `;

    const result = await this.mssqlService.execute<TaskMessage>(sql, [
      feladatId,
      userName,
    ]);

    return result.recordsets.at(-1) ?? [];
  }

  async uzenet(feladatId: number, userName: string, message: string): Promise<boolean> {
    const sql = `
      INSERT [raktaros_feladat_uzenetek] (feladatId, felado, uzenet) VALUES (@p0, @p1, @p2);

      -- Mark as unread for everyone else
      IF EXISTS(SELECT 1 FROM raktaros_uzenet_ki_latta WHERE feladat_id = @p0 AND felhasznalo <> @p1)
      BEGIN
        UPDATE raktaros_uzenet_ki_latta
        SET latta = 0, mikor = SYSDATETIME()
        WHERE feladat_id = @p0 AND felhasznalo <> @p1;
      END
    `;
    await this.mssqlService.execute(sql, [feladatId, userName, message]);
    return true;
  }

  async getMessages(feladatId: number): Promise<TaskMessage[]> {
    const sql = `
      SELECT _id, felado, uzenet, CONVERT(varchar(5), kelt, 108) kelt
      FROM raktaros_feladat_uzenetek
      WHERE feladatId = @p0;
    `;

    return this.mssqlService.query<TaskMessage>(sql, [feladatId]);
  }

  async hasUnreadMessages(feladatId: number, userName: string): Promise<boolean> {
    const sql = `
      SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM [raktaros_feladat_uzenetek] u
        WHERE u.feladatId = @p0 AND u.felado <> @p1
      ) AND (
        NOT EXISTS (
          SELECT 1
          FROM [raktaros_uzenet_ki_latta] kl
          WHERE kl.feladat_id = @p0 AND kl.felhasznalo = @p1
        ) OR EXISTS (
          SELECT 1
          FROM [raktaros_uzenet_ki_latta] kl
          WHERE kl.feladat_id = @p0 AND kl.felhasznalo = @p1 AND kl.latta = 0
        ) OR EXISTS (
          SELECT 1
          FROM [raktaros_uzenet_ki_latta] kl
          CROSS JOIN (
            SELECT MAX(kelt) as max_kelt
            FROM [raktaros_feladat_uzenetek]
            WHERE feladatId = @p0 AND felado <> @p1
          ) msg
          WHERE kl.feladat_id = @p0 AND kl.felhasznalo = @p1 AND kl.latta = 1 AND kl.mikor < msg.max_kelt
        )
      )
      THEN 1 ELSE 0 END as hasUnread;
    `;
    const result = await this.mssqlService.query<{ hasUnread: number }>(sql, [feladatId, userName]);
    return (result[0]?.hasUnread ?? 0) === 1;
  }
}

import { Injectable } from '@nestjs/common';
import { MssqlService } from '../database/mssql.service';

@Injectable()
export class SearchService {
  constructor(private readonly mssqlService: MssqlService) {}

  async kereses(
    feladatID: number,
    leiras: string,
  ): Promise<Array<Record<string, unknown>>> {
    const sql = `
      SET NOCOUNT ON;
      DECLARE @feladatID int = @p0;
      DECLARE @leiras varchar(2000) = @p1;
      DECLARE @leirasEsc varchar(2000) = REPLACE(@leiras, '''', '''''');

      DECLARE @DB varchar(12);
      IF @feladatID = -1
      BEGIN SET @DB = 'vyw'; END
      ELSE BEGIN SET @DB = (SELECT hivatkozas2 FROM Robie.dbo.Raktaros_feladatok WHERE _id = @feladatID); END;

      EXEC('
      SELECT RAKTARNEV1, CIKK.ETK, tarolohely.TAROL_AZON, CIKK.CIKKNEV1 CIKKLEIRO1, CIKK.MEROV1
      FROM ' + @DB + '.dbo.CIKK WITH (NOLOCK)
      LEFT JOIN ' + @DB + '.dbo.tarolohely ON CIKK.ETK = tarolohely.ETK
      LEFT JOIN ' + @DB + '.dbo.RAKTAR ON RAKTAR.RAKTARKOD = tarolohely.RAKTARKOD
      WHERE
      (CIKK.CIKKNEV1 LIKE ''' + @leirasEsc + '%'' OR CIKKLEIRO1 LIKE ''' + @leirasEsc + '%''
      OR CIKK.ETK LIKE ''' + @leirasEsc + '%''
      OR EXISTS(
        SELECT 1 FROM ' + @DB + '.dbo.jellemzok
        WHERE cikk.etk = jellemzok.etk
        AND jellemzok.jellemzo LIKE ''' + @leirasEsc + '''
        AND EXISTS(
          SELECT 1 FROM ' + @DB + '.dbo.global_new
          WHERE global_new.value = jellemzok.jelmegnev1
          AND global_new.param_name LIKE ''ETK_SEARCH%''
        )
      ))
      AND CIKKKATKOD > 2
      AND ELOCIKK < 2
      ORDER BY CIKKLEIRO1');
    `;

    const result = await this.mssqlService.execute(sql, [feladatID, leiras]);
    return result.recordsets.flat();
  }
}

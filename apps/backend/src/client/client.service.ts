import { Injectable } from '@nestjs/common';
import { MssqlService } from '../database/mssql.service';

@Injectable()
export class ClientService {
  constructor(private readonly mssqlService: MssqlService) { }

  async getLatestVersion(): Promise<number> {
    const sql =
      'SELECT MAX(verziocode) as latest FROM [Android_Raktar_Verzio] WHERE ervenyes <= CONVERT(date, GETDATE());';
    const rows = await this.mssqlService.query<{ latest: number }>(sql);
    return rows[0]?.latest ?? 0;
  }

  async saveGCMId(userName: string, key: string): Promise<void> {
    const sql =
      'UPDATE [Android_felhasznalok] SET gcm_regid = @p0 WHERE felhasznalonev = @p1;';
    await this.mssqlService.execute(sql, [key, userName]);
  }

  async saveFirebaseToken(userName: string, key: string): Promise<void> {
    const sql =
      'UPDATE [Android_felhasznalok] SET firebase_token = @p0 WHERE felhasznalonev = @p1;';
    await this.mssqlService.execute(sql, [key, userName]);
  }

  async getPushTokens(userName: string): Promise<{ firebase_token?: string | null; gcm_regid?: string | null } | null> {
    const sql = 'SELECT firebase_token, gcm_regid FROM [Android_felhasznalok] WHERE felhasznalonev = @p0;';
    const rows = await this.mssqlService.query<{ firebase_token?: string; gcm_regid?: string }>(sql, [userName]);
    if (!rows || rows.length === 0) return null;
    return { firebase_token: rows[0].firebase_token ?? null, gcm_regid: rows[0].gcm_regid ?? null };
  }

  async hasVegezIdo(userName: string): Promise<boolean> {
    const sql = `
      SELECT CASE
      WHEN EXISTS(
        SELECT 1
        FROM AndroidFelhasznalokMunkaIdo
        WHERE and_felhasznalonev = @p0
        AND datum = CONVERT(date, GETDATE())
      )
      THEN 1 ELSE 0 END van;
    `;

    const rows = await this.mssqlService.query<{ van: number }>(sql, [userName]);
    return rows[0]?.van === 1;
  }

  async saveVegzes(uid: string, idoString: string): Promise<boolean> {
    const inputEpoch = Math.floor(new Date(idoString).getTime() / 1000);
    const nowEpoch = Math.floor(Date.now() / 1000);
    if (Number.isNaN(inputEpoch) || nowEpoch > inputEpoch) {
      return false;
    }

    const sql =
      'INSERT AndroidFelhasznalokMunkaIdo (and_felhasznalonev, tavozas) VALUES (@p0, @p1);';
    await this.mssqlService.execute(sql, [uid, idoString]);
    return true;
  }
}

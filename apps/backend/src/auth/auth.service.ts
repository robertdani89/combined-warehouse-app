import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { MssqlService } from '../database/mssql.service';

export interface TokenInfo {
  new_token: string;
  new_key: string;
  expires: number;
}

@Injectable()
export class AuthService {
  constructor(private readonly mssqlService: MssqlService) {}

  async login(user: string, pass: string): Promise<boolean> {
    const sql = `
      SET NOCOUNT ON;
      DECLARE @user varchar(50) = @p0;
      DECLARE @password varchar(50) = @p1;
      DECLARE @responseMessage nvarchar(250);

      EXEC Robie.dbo.uspLogin
      @pLoginName = @user,
      @pPassword = @password,
      @responseMessage = @responseMessage OUTPUT;

      SELECT @responseMessage as responseMessage;
    `;

    const result = await this.mssqlService.execute<{ responseMessage: string }>(sql, [
      user,
      pass,
    ]);

    const response = result.recordset[0]?.responseMessage;
    return !['Invalid login', 'Incorrect password', 'Default password'].includes(
      response,
    );
  }

  async createToken(userName: string): Promise<TokenInfo> {
    const expiresEpoch = this.getTomorrow2AmEpoch();
    const expires = new Date(expiresEpoch * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const insertSql =
      'INSERT INTO [dbo].[tokens]([user],[token],[expires],[key]) VALUES (@p0, @p1, @p2, @p3);';

    for (let tries = 0; tries < 100; tries += 1) {
      const newToken = this.randomHex(16);
      const newKey = this.randomHex(8);

      try {
        await this.mssqlService.execute(insertSql, [userName, newToken, expires, newKey]);
        return { new_token: newToken, new_key: newKey, expires: expiresEpoch };
      } catch {
        // Retry token generation on collision or transient insert failures.
      }
    }

    throw new Error('Unable to create token after 100 tries');
  }

  async getUserInfo(userName: string): Promise<{ BECENEV: string; szemelykod: string }> {
    const sql = `
      SET NOCOUNT ON;
      DECLARE @user varchar(255) = @p0;

      SELECT TOP 1 szemely.BECENEV, szemely.szemelykod
      FROM vyw.dbo.szemely
      WHERE szemelykod =
      ISNULL((SELECT ugyintezo FROM vyw.dbo.station WHERE usernev = @user),
      (SELECT szemelykod FROM Android_felhasznalok WHERE felhasznalonev = @user));
    `;

    const result = await this.mssqlService.query<{ BECENEV: string; szemelykod: string }>(
      sql,
      [userName],
    );

    const row = result[0];
    return { BECENEV: row?.BECENEV ?? '', szemelykod: row?.szemelykod ?? '' };
  }

  async validateToken(token: string): Promise<{ user: string; EXPIRED: number; key: string }> {
    const sql = `
      SET NOCOUNT ON;
      DECLARE @token varchar(32) = @p0;
      SELECT [user],
      CASE WHEN [expires] < SYSDATETIME() THEN 1 ELSE 0 END EXPIRED,
      [key]
      FROM tokens
      WHERE token = @token;
    `;

    const result = await this.mssqlService.query<{ user: string; EXPIRED: number; key: string }>(
      sql,
      [token],
    );

    return result[0] ?? { user: '', EXPIRED: 1, key: '' };
  }

  private randomHex(bytes: number): string {
    return randomBytes(bytes).toString('hex');
  }

  private getTomorrow2AmEpoch(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    return Math.floor(tomorrow.getTime() / 1000);
  }
}

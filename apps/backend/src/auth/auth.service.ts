import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { MssqlService } from '../database/mssql.service';

export interface TokenInfo {
  new_token: string;
  new_key: string;
  expires: number;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(private readonly mssqlService: MssqlService) {
    this.jwtSecret = process.env.JWT_SECRET || 'please_change_this_secret';
  }

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
    const expiresInSeconds = expiresEpoch - Math.floor(Date.now() / 1000);

    const userInfo = await this.getUserInfo(userName);
    if (!userInfo.szemelykod) {
      throw new Error('User not found');
    }

    const token = jwt.sign({ user: userName, szemelykod: userInfo.szemelykod, nickName: userInfo.BECENEV }, this.jwtSecret, {
      expiresIn: expiresInSeconds,
    });
    return { new_token: token, new_key: token, expires: expiresEpoch };
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
    if (!token) return { user: '', EXPIRED: 1, key: '' };

    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { user?: string };
      return { user: decoded?.user ?? '', EXPIRED: 0, key: token };
    } catch (err: any) {
      if (err && err.name === 'TokenExpiredError') {
        const decoded = jwt.decode(token) as { user?: string } | null;
        return { user: decoded?.user ?? '', EXPIRED: 1, key: token };
      }
      return { user: '', EXPIRED: 1, key: '' };
    }
  }

  async validateKey(key: string): Promise<boolean> {
    if (!key) return false;

    try {
      jwt.verify(key, this.jwtSecret);
      return true;
    } catch {
      return false;
    }
  }

  private getTomorrow2AmEpoch(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    return Math.floor(tomorrow.getTime() / 1000);
  }
}

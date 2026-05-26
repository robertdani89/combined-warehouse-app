import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConnectionPool, config as SqlConfig, IRecordSet, QueryResult, Request } from 'mssql';

type SqlParams = Record<string, unknown> | unknown[];

@Injectable()
export class MssqlService implements OnModuleDestroy {
  private readonly logger = new Logger(MssqlService.name);
  private pool: ConnectionPool | null = null;
  private connectingPool: Promise<ConnectionPool> | null = null;

  private createConfig(): SqlConfig {
    const rawServer = process.env.MSSQL_SERVER;

    if (!rawServer) {
      throw new Error('MSSQL_SERVER environment variable is required');
    }

    const [server, instanceName] = rawServer.split('\\');

    const configuredPort = Number(process.env.MSSQL_PORT);
    const hasValidPort = Number.isInteger(configuredPort) && configuredPort > 0;

    const database = process.env.MSSQL_DATABASE;
    const user = process.env.MSSQL_USER;
    const password = process.env.MSSQL_PASSWORD;

    if (!database) {
      throw new Error('MSSQL_DATABASE environment variable is required');
    }

    if (!user) {   
        throw new Error('MSSQL_USER environment variable is required');
    }

    if (!password) {
      throw new Error('MSSQL_PASSWORD environment variable is required');
    }

    return {
      server: server || rawServer,
      database,
      user,
      password,
      port: hasValidPort ? configuredPort : undefined,
      options: {
        instanceName,
        encrypt: (process.env.MSSQL_ENCRYPT ?? 'false') === 'true',
        trustServerCertificate:
          (process.env.MSSQL_TRUST_SERVER_CERT ?? 'true') === 'true',
      },
      pool: {
        max: Number(process.env.MSSQL_POOL_MAX ?? 10),
        min: Number(process.env.MSSQL_POOL_MIN ?? 0),
        idleTimeoutMillis: Number(process.env.MSSQL_POOL_IDLE_MS ?? 30000),
      },
    };
  }

  async getPool(): Promise<ConnectionPool> {
    if (this.pool) {
      return this.pool;
    }

    if (this.connectingPool) {
      return this.connectingPool;
    }

    const pool = new ConnectionPool(this.createConfig());
    this.connectingPool = pool.connect();

    try {
      this.pool = await this.connectingPool;
      this.logger.log('MSSQL connection pool initialized');
      return this.pool;
    } catch (error) {
      this.connectingPool = null;
      throw error;
    }
  }

  private bindParams(request: Request, params?: SqlParams): Request {
    if (!params) {
      return request;
    }

    if (Array.isArray(params)) {
      params.forEach((value, index) => {
        request.input(`p${index}`, value as never);
      });
      return request;
    }

    for (const [key, value] of Object.entries(params)) {
      request.input(key, value as never);
    }

    return request;
  }

  async execute<T = unknown>(
    sql: string,
    params?: SqlParams,
  ): Promise<QueryResult<T>> {
    const pool = await this.getPool();
    const request = this.bindParams(pool.request(), params);
    return request.query<T>(sql);
  }

  async query<T = unknown>(sql: string, params?: SqlParams): Promise<IRecordSet<T>> {
    const result = await this.execute<T>(sql, params);
    return result.recordset;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      this.connectingPool = null;
      this.logger.log('MSSQL connection pool closed');
    }
  }
}
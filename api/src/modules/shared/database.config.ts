import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CreateUserRoleAudits1792108800000 } from '../../migrations/1792108800000-CreateUserRoleAudits';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'msu_pakawit_db',
    autoLoadEntities: true,
    migrations: [CreateUserRoleAudits1792108800000],
    migrationsRun: process.env.NODE_ENV === 'production',
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true' || process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  };
};

import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './modules/shared/database.config';

loadEnv({ path: [join(__dirname, '../../.env.local'), join(__dirname, '../../.env')] });

const { autoLoadEntities: _autoLoadEntities, ...databaseOptions } = getDatabaseConfig();

export const AppDataSource = new DataSource({
  ...databaseOptions,
  synchronize: false,
  entities: [join(__dirname, 'modules/**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
});

export default AppDataSource;

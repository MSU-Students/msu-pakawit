import 'dotenv/config';
import { DataSource } from 'typeorm';
import { PendingRegistration } from './modules/auth/entities/pending-registration.entity';
import { AcademicSchedule } from './modules/guardrails/entities/academic-schedule.entity';
import { User } from './modules/users/entities/user.entity';

const port = Number(process.env.DATABASE_PORT ?? '5432');
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
  throw new Error('DATABASE_PORT must be an integer between 1 and 65535');
}

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port,
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'msu_pakawit_db',
  entities: [User, PendingRegistration, AcademicSchedule],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});

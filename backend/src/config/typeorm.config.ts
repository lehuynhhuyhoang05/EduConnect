import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const typeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'educonnect_user',
  password: process.env.DB_PASSWORD || 'educonnect_password',
  database: process.env.DB_DATABASE || 'educonnect_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false, // Set to false in production
  logging: process.env.NODE_ENV === 'development',
  charset: 'utf8mb4',
  timezone: '+07:00', // Vietnam timezone
});

// For migrations CLI
const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'educonnect_user',
  password: process.env.DB_PASSWORD || 'educonnect_password',
  database: process.env.DB_DATABASE || 'educonnect_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  charset: 'utf8mb4',
  timezone: '+07:00',
};

export const AppDataSource = new DataSource(dataSourceOptions);

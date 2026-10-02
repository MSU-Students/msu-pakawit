import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './modules/shared/database.config';
import { SharedModule } from './modules/shared/shared.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { SyncModule } from './modules/sync/sync.module';
import { GuardrailsModule } from './modules/guardrails/guardrails.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => getDatabaseConfig(),
    }),
    SharedModule,
    StorefrontModule,
    DispatchModule,
    SyncModule,
    GuardrailsModule,
  ],
})
export class AppModule {}

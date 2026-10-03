import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './modules/shared/database.config';
import { SharedModule } from './modules/shared/shared.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { SyncModule } from './modules/sync/sync.module';
import { GuardrailsModule } from './modules/guardrails/guardrails.module';
import { UserModule } from './modules/users/user.module';
import { AuthModule } from './modules/auth/auth.module';

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
    UserModule,
    AuthModule,
  ],
})
export class AppModule {}

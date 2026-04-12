import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';

// Core modules
import { PrismaModule } from './common/prisma/prisma.module';
import { FabricModule } from './common/fabric/fabric.module';
import { EmailModule } from './common/email/email.module';
import { HealthController } from './health.controller';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { StorageModule } from './modules/storage/storage.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AuditModule } from './modules/audit/audit.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { ContactModule } from './modules/contact/contact.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';

// Validation schema for environment variables
const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  FABRIC_CONNECTION_PROFILE_PATH: Joi.string().default('/app/fabric/profiles/connection-org1.json'),
  FABRIC_WALLET_PATH: Joi.string().default('/app/wallets/org1'),
  FABRIC_CHANNEL_NAME: Joi.string().default('certificates'),
  FABRIC_CHAINCODE_NAME: Joi.string().default('certificate_contract'),
  IPFS_HOST: Joi.string().default('localhost'),
  IPFS_PORT: Joi.number().default(5001),
  MASTER_ENCRYPTION_KEY: Joi.string().required(),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  CONTACT_TO_EMAIL: Joi.string().optional(),
  PLATFORM_NAME: Joi.string().default('SME Certificate Trust Platform'),
  APP_URL: Joi.string().default('http://localhost:5173'),
});

@Module({
  imports: [
    // Configuration module with validation
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get('RATE_LIMIT_WINDOW_MS', 60000),
            limit: config.get('RATE_LIMIT_MAX_REQUESTS', 100),
          },
        ],
      }),
    }),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Core infrastructure
    PrismaModule,
    FabricModule,
    EmailModule,

    // Feature modules
    AuthModule,
    UsersModule,
    TemplatesModule,
    CertificatesModule,
    StorageModule,
    WalletModule,
    AuditModule,
    MetricsModule,
    ContactModule,
    OrganizationsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

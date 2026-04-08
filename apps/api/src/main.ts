import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const compression = require('compression');
import helmet from 'helmet';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {
  // Create logger
  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, trace }) => {
            return `${timestamp} [${context}] ${level}: ${message}${trace ? '\n' + trace : ''}`;
          }),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  const corsOrigin = configService.get('CORS_ORIGIN', 'http://localhost:5173');
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API Documentation
  if (configService.get('SWAGGER_ENABLED', 'true') === 'true') {
    const config = new DocumentBuilder()
      .setTitle('SME Certificate Trust Platform API')
      .setDescription(
        'Blockchain-based certificate issuance, verification, and management API for Egyptian SMEs',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Authentication', 'User authentication and session management')
      .addTag('Users', 'User management and profile operations')
      .addTag('Organizations', 'Organization management')
      .addTag('Templates', 'Certificate template management')
      .addTag('Certificates', 'Certificate issuance, verification, and revocation')
      .addTag('Verification', 'Public certificate verification')
      .addTag('Storage', 'Off-chain storage operations')
      .addTag('Wallet', 'User wallet and key management')
      .addTag('Audit', 'Audit log queries')
      .addTag('Metrics', 'Platform metrics and analytics')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'SME Cert Platform API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
    });
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/api`, 'Bootstrap');
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`, 'Bootstrap');
  logger.log(`🔐 Environment: ${configService.get('NODE_ENV', 'development')}`, 'Bootstrap');
}

bootstrap();

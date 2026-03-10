import { NestFactory, Reflector } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import * as cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  })

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", 'https://app.posthog.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedding from frontend
    }),
  )

  // Cookie parser (for refresh token)
  app.use(cookieParser())

  // Global prefix
  app.setGlobalPrefix('api/v1')

  // Health check endpoint (no prefix)
  const expressApp = app.getHttpAdapter().getInstance()
  expressApp.get('/health', (_req: any, res: any) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    })
  })

  // Global exception filter — handles Prisma errors, HTTP exceptions, and unknown errors
  app.useGlobalFilters(new GlobalExceptionFilter())

  // Global response interceptor — wraps responses in { data, meta } format
  const reflector = app.get(Reflector)
  app.useGlobalInterceptors(new ResponseInterceptor(reflector))

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
  )

  // CORS
  const allowedOrigins = (process.env.CORS_ORIGINS || process.env.NEXTAUTH_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  })

  // Swagger (dev only)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SEOPen API')
      .setDescription('AI-Powered SEO Writing Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
  }

  const port = process.env.PORT || 4000
  await app.listen(port)
  console.log(`SEOPen API running on: http://localhost:${port}/api/v1`)
  console.log(`Health check: http://localhost:${port}/health`)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger docs: http://localhost:${port}/api/docs`)
  }
}

bootstrap()

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

interface AuthenticationResponse {
  user: {
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}

interface ProfileResponse {
  email: string;
}

interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
}

describe('KampusHub API', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const email = `e2e-${Date.now()}@kampushub.test`;
  const password = 'Password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);

    app.setGlobalPrefix('api');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  it('menjalankan health check dan siklus autentikasi', async () => {
    const healthResponse = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    const health = healthResponse.body as unknown as HealthResponse;

    expect(health.status).toBe('ok');
    expect(health.service).toBe('kampushub-api');
    expect(Number.isNaN(Date.parse(health.timestamp))).toBe(false);

    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Pengguna E2E',
        email,
        password,
        deviceName: 'Jest E2E',
      })
      .expect(201);

    const registered =
      registerResponse.body as unknown as AuthenticationResponse;

    expect(registered.user.email).toBe(email);
    expect(typeof registered.accessToken).toBe('string');
    expect(typeof registered.refreshToken).toBe('string');

    const profileResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registered.accessToken}`)
      .expect(200);

    const profile = profileResponse.body as unknown as ProfileResponse;

    expect(profile.email).toBe(email);

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
        refreshToken: registered.refreshToken,
      })
      .expect(201);

    const refreshed = refreshResponse.body as unknown as TokenPairResponse;

    expect(typeof refreshed.accessToken).toBe('string');
    expect(typeof refreshed.refreshToken).toBe('string');

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${refreshed.accessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${refreshed.accessToken}`)
      .expect(401);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email,
      },
    });

    await app.close();
  });
});

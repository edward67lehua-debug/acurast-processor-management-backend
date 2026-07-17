import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { createHash } from 'crypto';
import * as blake from 'blakejs';
import bs58 from 'bs58';

import { ProcessorModule } from '../src/processor/processor.module';
import { EC_INSTANCE } from '../src/processor/constants';
import { DeviceStatus } from '../src/processor/entities/device-status.entity';
import { Processor } from '../src/processor/entities/processor.entity';
import { NetworkType } from '../src/processor/entities/network-type.entity';
import { BatteryHealth } from '../src/processor/entities/battery-health.entity';
import { Ssid } from '../src/processor/entities/ssid.entity';
import { TemperatureReading } from '../src/processor/entities/temperature-reading.entity';
import { Manager } from '../src/processor/entities/manager.entity';
import { TelemetryReport } from '../src/processor/entities/telemetry-report.entity';
import { TelemetryProfile } from '../src/processor/entities/telemetry-profile.entity';

function computeSubstrateAddress(compressedKey: Buffer): string {
  const publicKeyHash = blake.blake2b(compressedKey, undefined, 32);
  const substrateId = new Uint8Array([42]);
  const body = new Uint8Array(substrateId.length + publicKeyHash.length);
  body.set(substrateId);
  body.set(publicKeyHash, substrateId.length);

  const prefix = Buffer.from('SS58PRE', 'utf8');
  const context = blake.blake2bInit(64);
  blake.blake2bUpdate(context, prefix);
  blake.blake2bUpdate(context, body);
  const checksum = blake.blake2bFinal(context);

  const address = new Uint8Array(body.length + 2);
  address.set(body);
  address.set(checksum.slice(0, 2), body.length);

  return bs58.encode(address);
}

function buildReport(processorAddress: string, reportedAt: number) {
  return {
    processorAddress,
    processorType: 'core',
    appVersion: '1000',
    platform: 'android',
    ipAddress: '203.0.113.7',
    environment: {
      manufacturer: 'Google',
      model: 'Pixel 8',
      cpu: 'Google Tensor G3',
      arch: 'arm64-v8a,armeabi-v7a',
      cores: 9,
      availableCores: 9,
      osVersion: 34,
      totalMemory: 8000000000,
      availableMemory: 4000000000,
      lowRamDevice: false,
      networkType: 'wifi',
      uptime: 123456,
      network: 'canary',
    },
    period: {
      start: reportedAt - 3600000,
      end: reportedAt - 1,
      reportedAt,
    },
    status: {
      type: 'ok',
      metrics: {
        totalSuccesses: 100,
        totalFailures: 2,
        avgTime: 250,
        minTime: 100,
        maxTime: 900,
        failures: { notReady: 1, timeouts: 1, fatal: 0, other: 0 },
        failureMessages: { 'connection reset': 2 },
        consecutiveFailures: 0,
        restarts: 1,
        timeToFirstSuccess: 1500,
        longestNotReady: 3000,
      },
    },
  };
}

function signReport(
  report: object,
  key: ReturnType<typeof EC_INSTANCE.genKeyPair>,
): string {
  const message = new TextEncoder().encode(JSON.stringify(report));
  // Mirrors the processor's Substrate.sign for P256: payloads larger than
  // 256 bytes are hashed with blake2b-256 before the sha256 digest.
  const payload =
    message.length > 256 ? blake.blake2b(message, undefined, 32) : message;
  const hash = createHash('sha256').update(payload).digest();
  const sig = key.sign(hash, { canonical: true });

  return Buffer.concat([
    sig.r.toArrayLike(Buffer, 'be', 32),
    sig.s.toArrayLike(Buffer, 'be', 32),
    Buffer.from([sig.recoveryParam ?? 0]),
  ]).toString('hex');
}

const API_KEY = 'test-telemetry-api-key';

describe('Telemetry (e2e)', () => {
  let app: INestApplication<App>;
  const key = EC_INSTANCE.genKeyPair();
  const address = computeSubstrateAddress(
    Buffer.from(key.getPublic().encodeCompressed('hex'), 'hex'),
  );

  jest.setTimeout(30000);

  beforeAll(async () => {
    process.env.TELEMETRY_API_KEY = API_KEY;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          synchronize: true,
          entities: [
            DeviceStatus,
            Processor,
            NetworkType,
            BatteryHealth,
            Ssid,
            TemperatureReading,
            Manager,
            TelemetryReport,
            TelemetryProfile,
          ],
        }),
        ProcessorModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a report without a valid signature', async () => {
    const report = buildReport(address, 1783553600001);

    await request(app.getHttpServer())
      .post('/processor/telemetry')
      .set('x-device-signature', '00'.repeat(65))
      .send(report)
      .expect(401);
  });

  it('accepts a signed report and serves it back', async () => {
    const report = buildReport(address, 1783553600001);
    const signature = signReport(report, key);

    await request(app.getHttpServer())
      .post('/processor/telemetry')
      .set('x-device-signature', signature)
      .send(report)
      .expect(201)
      .expect({ success: true });

    const latest = await request(app.getHttpServer())
      .get(`/processor/api/${address}/telemetry`)
      .set('x-api-key', API_KEY)
      .expect(200);

    expect(latest.body.report.processorAddress).toEqual(address);
    expect(latest.body.report.status.metrics.totalSuccesses).toEqual(100);
    expect(latest.body.report.period.reportedAt).toEqual(1783553600001);

    const history = await request(app.getHttpServer())
      .get(`/processor/api/${address}/telemetry/history`)
      .set('x-api-key', API_KEY)
      .expect(200);

    expect(history.body.reports).toHaveLength(1);

    const all = await request(app.getHttpServer())
      .get('/processor/api/telemetry')
      .set('x-api-key', API_KEY)
      .expect(200);

    expect(all.body.reports).toHaveLength(1);
  });

  it('rejects telemetry reads without or with a wrong API key', async () => {
    await request(app.getHttpServer())
      .get('/processor/api/telemetry')
      .expect(401);

    await request(app.getHttpServer())
      .get(`/processor/api/${address}/telemetry`)
      .set('x-api-key', 'wrong-key')
      .expect(401);

    await request(app.getHttpServer())
      .get(`/processor/api/${address}/telemetry/history`)
      .expect(401);
  });

  it('serves only the latest report per processor in the overview', async () => {
    const report = buildReport(address, 1783557200001);
    const signature = signReport(report, key);

    await request(app.getHttpServer())
      .post('/processor/telemetry')
      .set('x-device-signature', signature)
      .send(report)
      .expect(201);

    const all = await request(app.getHttpServer())
      .get('/processor/api/telemetry')
      .set('x-api-key', API_KEY)
      .expect(200);

    expect(all.body.reports).toHaveLength(1);
    expect(all.body.reports[0].period.reportedAt).toEqual(1783557200001);

    const history = await request(app.getHttpServer())
      .get(`/processor/api/${address}/telemetry/history`)
      .set('x-api-key', API_KEY)
      .expect(200);

    expect(history.body.reports).toHaveLength(2);
  });

  it('deduplicates the static profile across reports', async () => {
    const profiles = await app
      .get(DataSource)
      .getRepository(TelemetryProfile)
      .find();

    // Two stored reports share the same static environment
    expect(profiles).toHaveLength(1);
    expect(profiles[0].model).toEqual('Pixel 8');
  });

  it('accepts a report from an older app version without arch and cores', async () => {
    const oldKey = EC_INSTANCE.genKeyPair();
    const oldAddress = computeSubstrateAddress(
      Buffer.from(oldKey.getPublic().encodeCompressed('hex'), 'hex'),
    );
    const report = buildReport(oldAddress, 1783557300001) as {
      environment: Record<string, unknown>;
    };
    delete report.environment.arch;
    delete report.environment.cores;
    delete report.environment.availableCores;
    const signature = signReport(report, oldKey);

    await request(app.getHttpServer())
      .post('/processor/telemetry')
      .set('x-device-signature', signature)
      .send(report)
      .expect(201);

    const latest = await request(app.getHttpServer())
      .get(`/processor/api/${oldAddress}/telemetry`)
      .set('x-api-key', API_KEY)
      .expect(200);

    expect(latest.body.report.environment.arch).toBeUndefined();
    expect(latest.body.report.environment.cores).toBeUndefined();
    expect(latest.body.report.environment.availableCores).toBeUndefined();
    expect(latest.body.report.environment.cpu).toEqual('Google Tensor G3');
  });

  it('returns 404 for a processor without reports', async () => {
    await request(app.getHttpServer())
      .get('/processor/api/unknown-address/telemetry')
      .set('x-api-key', API_KEY)
      .expect(404);
  });
});

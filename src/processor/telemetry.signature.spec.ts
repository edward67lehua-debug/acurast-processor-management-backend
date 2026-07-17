import { SignatureService } from './signature.service';
import { EC_INSTANCE } from './constants';
import { TelemetryReportRequest } from './types';
import { createHash } from 'crypto';
import * as blake from 'blakejs';
import bs58 from 'bs58';

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

function buildReport(processorAddress: string): TelemetryReportRequest {
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
      start: 1783550000000,
      end: 1783553600000,
      reportedAt: 1783553600001,
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

/**
 * Mirrors the processor's Substrate.sign for P256: payloads larger than
 * 256 bytes are hashed with blake2b-256 before the sha256 digest.
 */
function signDigest(message: Uint8Array): Buffer {
  const payload =
    message.length > 256 ? blake.blake2b(message, undefined, 32) : message;
  return createHash('sha256').update(payload).digest();
}

describe('SignatureService telemetry report verification', () => {
  let service: SignatureService;

  beforeEach(() => {
    service = new SignatureService();
  });

  it('accepts a valid android signature', async () => {
    const key = EC_INSTANCE.genKeyPair();
    const compressedKey = Buffer.from(
      key.getPublic().encodeCompressed('hex'),
      'hex',
    );
    const address = computeSubstrateAddress(compressedKey);
    const report = buildReport(address);

    const message = new TextEncoder().encode(JSON.stringify(report));
    const hash = signDigest(message);
    const sig = key.sign(hash, { canonical: true });

    const signature = Buffer.concat([
      sig.r.toArrayLike(Buffer, 'be', 32),
      sig.s.toArrayLike(Buffer, 'be', 32),
      Buffer.from([sig.recoveryParam ?? 0]),
    ]).toString('hex');

    await expect(
      service.verifyTelemetryReportSignature(report, signature),
    ).resolves.toBe(true);
  });

  it('accepts a real report captured from a device', async () => {
    // Captured from a Pixel 8a running the canary processor build. The body
    // exceeds 256 bytes, so the device signed sha256(blake2b-256(body)).
    const body =
      '{"processorAddress":"5CLpuKpNJPgMD8HP8e7n8AjmAUPncELfUTVURFvbRJBVH5Ud","processorType":"core","appVersion":"128","platform":"android","ipAddress":"162.120.215.240","environment":{"manufacturer":"Google","model":"Pixel 8a","cpu":"arm64-v8a","osVersion":36,"totalMemory":7940808704,"availableMemory":3110973440,"lowRamDevice":false,"networkType":"vpn","uptime":4506,"network":"canary"},"period":{"start":1783589507824,"end":1783589507824,"reportedAt":1783589508047},"status":{"type":"ok","metrics":{"totalSuccesses":1,"totalFailures":0,"avgTime":3808,"minTime":3808,"maxTime":3808,"failures":{"notReady":0,"timeouts":0,"fatal":0,"other":0},"failureMessages":{},"consecutiveFailures":0,"restarts":0,"timeToFirstSuccess":0,"longestNotReady":0}}}';
    const signature =
      '4e8d5733a7457e6a00fb789e55ece81c1e178a69aa6f2883de410b8a6a3f7046274b48c2b190bc73d0d3ff8481290ad1aed0cbdf8cf8d2f236684361f6fc9f8201';

    const report = JSON.parse(body) as TelemetryReportRequest;
    expect(JSON.stringify(report)).toEqual(body);

    await expect(
      service.verifyTelemetryReportSignature(report, signature),
    ).resolves.toBe(true);
  });

  it('rejects a signature from a different key', async () => {
    const key = EC_INSTANCE.genKeyPair();
    const otherKey = EC_INSTANCE.genKeyPair();
    const compressedKey = Buffer.from(
      key.getPublic().encodeCompressed('hex'),
      'hex',
    );
    const address = computeSubstrateAddress(compressedKey);
    const report = buildReport(address);

    const message = new TextEncoder().encode(JSON.stringify(report));
    const hash = signDigest(message);
    const sig = otherKey.sign(hash, { canonical: true });

    const signature = Buffer.concat([
      sig.r.toArrayLike(Buffer, 'be', 32),
      sig.s.toArrayLike(Buffer, 'be', 32),
      Buffer.from([sig.recoveryParam ?? 0]),
    ]).toString('hex');

    await expect(
      service.verifyTelemetryReportSignature(report, signature),
    ).resolves.toBe(false);
  });

  it('rejects a tampered report', async () => {
    const key = EC_INSTANCE.genKeyPair();
    const compressedKey = Buffer.from(
      key.getPublic().encodeCompressed('hex'),
      'hex',
    );
    const address = computeSubstrateAddress(compressedKey);
    const report = buildReport(address);

    const message = new TextEncoder().encode(JSON.stringify(report));
    const hash = signDigest(message);
    const sig = key.sign(hash, { canonical: true });

    const signature = Buffer.concat([
      sig.r.toArrayLike(Buffer, 'be', 32),
      sig.s.toArrayLike(Buffer, 'be', 32),
      Buffer.from([sig.recoveryParam ?? 0]),
    ]).toString('hex');

    const tampered = { ...report, status: { ...report.status } };
    tampered.status.metrics = {
      ...tampered.status.metrics,
      totalFailures: 999,
    };

    await expect(
      service.verifyTelemetryReportSignature(tampered, signature),
    ).resolves.toBe(false);
  });
});

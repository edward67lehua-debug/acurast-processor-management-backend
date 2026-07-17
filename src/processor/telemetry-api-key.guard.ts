import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * Protects telemetry read endpoints: requires the `X-Api-Key` header to match
 * the `TELEMETRY_API_KEY` environment variable.
 *
 * Fails closed: if `TELEMETRY_API_KEY` is not configured, all requests are
 * rejected. Telemetry reports contain personal data (IP addresses), so the
 * endpoints must never be open by accident.
 */
@Injectable()
export class TelemetryApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(TelemetryApiKeyGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const configuredKey = this.configService.get<string>('TELEMETRY_API_KEY');
    if (!configuredKey) {
      this.logger.warn(
        'TELEMETRY_API_KEY is not configured; rejecting telemetry read request',
      );
      throw new UnauthorizedException('Telemetry API key is not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-api-key'];

    if (typeof providedKey !== 'string' || providedKey.length === 0) {
      throw new UnauthorizedException('Missing API key');
    }

    const configured = Buffer.from(configuredKey);
    const provided = Buffer.from(providedKey);
    if (
      configured.length !== provided.length ||
      !timingSafeEqual(configured, provided)
    ) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}

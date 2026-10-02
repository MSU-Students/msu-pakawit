import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Shared Platform & Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'System health check and Sprint 0 status' })
  check() {
    return {
      status: 'ok',
      service: 'MSU Pakawit API Gateway',
      timestamp: new Date().toISOString(),
      version: '0.1.0-sprint0',
      modules: [
        'Storefront & Catalog (Team 1)',
        'Dispatch & Logistics (Team 2)',
        'Offline Sync Engine (Team 3)',
        'Identity & Guardrails (Team 4)',
        'Shared Platform (Team 5)',
      ],
    };
  }
}

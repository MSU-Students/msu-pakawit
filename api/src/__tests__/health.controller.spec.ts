import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../modules/shared/health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return system health status and registered sprint 0 modules', () => {
    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(result.modules).toHaveLength(5);
    expect(result.service).toContain('MSU Pakawit');
  });
});

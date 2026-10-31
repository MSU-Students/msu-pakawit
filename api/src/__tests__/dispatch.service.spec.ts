import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { validate } from 'class-validator';
import { ClaimErrandDto } from '../modules/dispatch/dto/claim-errand.dto';
import { DispatchService } from '../modules/dispatch/dispatch.service';
import {
  ErrandOrder,
  ErrandOrderStatus,
} from '../modules/dispatch/entities/errand-order.entity';

describe('DispatchService', () => {
  let service: DispatchService;
  let orderRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    orderRepo = {
      findOne: jest.fn(),
      save: jest.fn((order: ErrandOrder) => Promise.resolve(order)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchService,
        {
          provide: getRepositoryToken(ErrandOrder),
          useValue: orderRepo,
        },
      ],
    }).compile();

    service = module.get<DispatchService>(DispatchService);
  });

  describe('claimErrand', () => {
    const pendingErrand = (): ErrandOrder =>
      ({
        id: 'errand-1',
        status: ErrandOrderStatus.PENDING,
        runnerStudentId: null,
        collectedCodAmount: null,
      }) as ErrandOrder;

    it('records the collected COD amount when claiming a pending errand', async () => {
      const errand = pendingErrand();
      orderRepo.findOne.mockResolvedValue(errand);
      const dto: ClaimErrandDto = {
        runnerStudentId: '2023-08888',
        collectedCodAmount: 134,
      };

      const result = await service.claimErrand('errand-1', dto);

      expect(result.runnerStudentId).toBe(dto.runnerStudentId);
      expect(result.collectedCodAmount).toBe(dto.collectedCodAmount);
      expect(result.status).toBe(ErrandOrderStatus.ACCEPTED);
      expect(orderRepo.save).toHaveBeenCalledWith(errand);
    });

    it('throws NotFoundException when the errand does not exist', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.claimErrand('missing', {
          runnerStudentId: '2023-08888',
          collectedCodAmount: 134,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(orderRepo.save).not.toHaveBeenCalled();
    });

    it('rejects claims for errands that are no longer pending', async () => {
      orderRepo.findOne.mockResolvedValue({
        ...pendingErrand(),
        status: ErrandOrderStatus.ACCEPTED,
      });

      await expect(
        service.claimErrand('errand-1', {
          runnerStudentId: '2023-08888',
          collectedCodAmount: 134,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(orderRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('ClaimErrandDto validation', () => {
    const validateDto = (values: Partial<ClaimErrandDto>) =>
      validate(Object.assign(new ClaimErrandDto(), values));

    it('accepts a zero COD amount', async () => {
      const errors = await validateDto({
        runnerStudentId: '2023-08888',
        collectedCodAmount: 0,
      });

      expect(errors).toHaveLength(0);
    });

    it.each([
      ['missing amount', undefined],
      ['negative amount', -0.01],
      ['more than two decimal places', 12.345],
      ['non-numeric amount', '12.00' as unknown as number],
    ])('rejects %s', async (_description, collectedCodAmount) => {
      const errors = await validateDto({
        runnerStudentId: '2023-08888',
        collectedCodAmount,
      });

      expect(errors.some((error) => error.property === 'collectedCodAmount')).toBe(
        true,
      );
    });
  });
});

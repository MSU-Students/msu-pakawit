import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateErrandDto } from './dto/create-errand.dto';
import { DispatchService } from './dispatch.service';
import { ErrandOrder, ErrandOrderStatus } from './entities/errand-order.entity';

describe('DispatchService', () => {
  let service: DispatchService;
  let mockOrderRepo: any;

  beforeEach(async () => {
    mockOrderRepo = {
      create: jest.fn().mockImplementation((order) => order),
      save: jest.fn().mockImplementation((order) => Promise.resolve(order)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchService,
        {
          provide: getRepositoryToken(ErrandOrder),
          useValue: mockOrderRepo,
        },
      ],
    }).compile();

    service = module.get<DispatchService>(DispatchService);
  });

  it('creates orders as pending even when another status is provided', async () => {
    const dto = Object.assign(new CreateErrandDto(), {
      buyerStudentId: '2023-01429',
      storeId: 'store-uuid',
      items: [],
      totalProductCost: 0,
      convenienceFee: 0,
      totalAmount: 0,
      dropZone: 'Science Complex Drop Hub',
      status: ErrandOrderStatus.ACCEPTED,
    });

    const order = await service.createErrandOrder(dto);

    expect(mockOrderRepo.create).toHaveBeenCalledWith({
      ...dto,
      status: ErrandOrderStatus.PENDING,
    });
    expect(order.status).toBe(ErrandOrderStatus.PENDING);
    expect(mockOrderRepo.save).toHaveBeenCalledWith(order);
  });
});

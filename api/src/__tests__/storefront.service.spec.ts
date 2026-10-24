import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StorefrontService } from '../modules/storefront/storefront.service';
import { Store } from '../modules/storefront/entities/store.entity';
import { Product } from '../modules/storefront/entities/product.entity';
import { Order, OrderStatus } from '../modules/storefront/entities/order.entity';

describe('StorefrontService (Zero-Capital Cataloging & Markup)', () => {
  let service: StorefrontService;
  let mockStoreRepo: any;
  let mockProductRepo: any;
  let mockOrderRepo: any;

  beforeEach(async () => {
    mockStoreRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'store-1' })),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockProductRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'prod-1' })),
    };

    mockOrderRepo = {
      create: jest.fn().mockImplementation((dto) => ({
        ...dto,
        id: 'ord-uuid-101',
        createdAt: new Date('2026-10-18T10:00:00Z'),
        updatedAt: new Date('2026-10-18T10:00:00Z'),
      })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorefrontService,
        {
          provide: getRepositoryToken(Store),
          useValue: mockStoreRepo,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepo,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepo,
        },
      ],
    }).compile();

    service = module.get<StorefrontService>(StorefrontService);
  });

  it('should automatically compute marked-up product price based on store commission rate', async () => {
    const mockStore: Partial<Store> = {
      id: 'store-1',
      name: 'Amina Supplies',
      markupPercentage: 10,
      isActive: true,
      products: [],
    };

    mockStoreRepo.findOne.mockResolvedValue(mockStore);

    const product = await service.addProductToStore('store-1', {
      name: 'Yellow Pad Paper',
      category: 'Stationery',
      basePrice: 50.0,
    });

    // 50 + (10% of 50) = 55.0
    expect(product.markupPrice).toBe(55.0);
    expect(product.basePrice).toBe(50.0);
  });

  describe('Order Placement & Storage (Customer purchase request to store owner)', () => {
    const mockStore: Partial<Store> = {
      id: 'store-1',
      name: "Amina's Campus Supplies & Snacks",
      markupPercentage: 10,
      isActive: true,
      products: [],
    };

    const orderDto = {
      customerName: 'Sittie Norhaima',
      customerPhone: '09171234567',
      buyerStudentId: '2023-01429',
      deliveryAddress: 'Dormitory 2, Room 304, MSU Marawi Campus',
      dropZone: 'Science Complex Drop Hub',
      deliveryNotes: 'Call upon arrival at the lobby',
      items: [
        {
          productId: 'prod-1',
          name: 'Yellow Pad Paper (80 leaves)',
          quantity: 2,
          unitPrice: 49.5,
        },
        {
          productId: 'prod-2',
          name: 'Pilot G2 Gel Pen 0.5 Black',
          quantity: 1,
          unitPrice: 71.5,
        },
      ],
      totalProductCost: 170.5,
      convenienceFee: 35.0,
      totalAmount: 205.5,
    };

    it('collects customer details, product selections, and delivery address to store in database', async () => {
      mockStoreRepo.findOne.mockResolvedValue(mockStore);

      const order = await service.createOrder('store-1', orderDto);

      // Acceptance Criteria:
      // 1. Order form collects customer details, product selections, and delivery address
      expect(order.customerName).toBe('Sittie Norhaima');
      expect(order.customerPhone).toBe('09171234567');
      expect(order.deliveryAddress).toBe('Dormitory 2, Room 304, MSU Marawi Campus');
      expect(order.dropZone).toBe('Science Complex Drop Hub');
      expect(order.items).toHaveLength(2);
      expect(order.items[0].name).toBe('Yellow Pad Paper (80 leaves)');

      // 2. Order receipt is generated with order ID and timestamp
      expect(order.id).toBe('ord-uuid-101');
      expect(order.createdAt).toBeInstanceOf(Date);

      // 3. Order status is set to "Pending" upon creation
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.status).toBe('Pending');

      // 4. Order details are stored in the database
      expect(mockOrderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: 'store-1',
          customerName: 'Sittie Norhaima',
          customerPhone: '09171234567',
          deliveryAddress: 'Dormitory 2, Room 304, MSU Marawi Campus',
          status: 'Pending',
        }),
      );
      expect(mockOrderRepo.save).toHaveBeenCalled();
    });

    it('allows store owners to receive purchase requests for their store', async () => {
      mockStoreRepo.findOne.mockResolvedValue(mockStore);
      const ordersList = [
        {
          id: 'ord-1',
          storeId: 'store-1',
          customerName: 'Sittie Norhaima',
          status: 'Pending',
          totalAmount: 205.5,
        },
      ];
      mockOrderRepo.find.mockResolvedValue(ordersList);

      const storeOrders = await service.findOrdersByStore('store-1');
      expect(storeOrders).toHaveLength(1);
      expect(storeOrders[0].customerName).toBe('Sittie Norhaima');
      expect(mockOrderRepo.find).toHaveBeenCalledWith({
        where: { storeId: 'store-1' },
        order: { createdAt: 'DESC' },
      });
    });

    it('retrieves order receipt details by ID', async () => {
      const mockOrder = {
        id: 'ord-uuid-101',
        storeId: 'store-1',
        customerName: 'Sittie Norhaima',
        status: 'Pending',
        store: mockStore,
      };
      mockOrderRepo.findOne.mockResolvedValue(mockOrder);

      const result = await service.findOrderById('ord-uuid-101');
      expect(result.id).toBe('ord-uuid-101');
      expect(result.customerName).toBe('Sittie Norhaima');
    });

    it('throws NotFoundException if store does not exist when placing an order', async () => {
      mockStoreRepo.findOne.mockResolvedValue(null);

      await expect(service.createOrder('non-existent-store', orderDto)).rejects.toThrow();
    });
  });
});

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrandOrder, ErrandOrderStatus } from './entities/errand-order.entity';
import { CreateErrandDto } from './dto/create-errand.dto';
import { ClaimErrandDto } from './dto/claim-errand.dto';
import { buildReceipt, OrderReceipt } from './receipt/order-receipt';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const sameAmount = (a: number, b: number): boolean => Math.abs(a - b) < 0.005;

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(ErrandOrder)
    private readonly orderRepo: Repository<ErrandOrder>,
  ) {}

  async createErrandOrder(dto: CreateErrandDto): Promise<OrderReceipt> {
    // Never trust client-side totals: recompute them from the selected items.
    const totalProductCost = round2(
      dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    );
    const totalAmount = round2(totalProductCost + dto.convenienceFee);

    if (
      !sameAmount(dto.totalProductCost, totalProductCost) ||
      !sameAmount(dto.totalAmount, totalAmount)
    ) {
      throw new BadRequestException('Order totals do not match the selected items');
    }

    const order = this.orderRepo.create({
      ...dto,
      totalProductCost,
      totalAmount,
      status: ErrandOrderStatus.PENDING,
    });
    const saved = await this.orderRepo.save(order);
    return buildReceipt(saved);
  }

  async getReceipt(errandId: string): Promise<OrderReceipt> {
    const order = await this.orderRepo.findOne({ where: { id: errandId } });
    if (!order) {
      throw new NotFoundException(`Errand order ${errandId} not found`);
    }
    return buildReceipt(order);
  }

  async findPendingErrands(): Promise<ErrandOrder[]> {
    return this.orderRepo.find({
      where: { status: ErrandOrderStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  async claimErrand(errandId: string, dto: ClaimErrandDto): Promise<ErrandOrder> {
    const errand = await this.orderRepo.findOne({ where: { id: errandId } });
    if (!errand) {
      throw new NotFoundException(`Errand order ${errandId} not found`);
    }
    if (errand.status !== ErrandOrderStatus.PENDING) {
      throw new BadRequestException(`Errand order is no longer pending (current status: ${errand.status})`);
    }

    errand.runnerStudentId = dto.runnerStudentId;
    errand.status = ErrandOrderStatus.ACCEPTED;
    return this.orderRepo.save(errand);
  }

  async updateErrandStatus(errandId: string, status: ErrandOrderStatus): Promise<ErrandOrder> {
    const errand = await this.orderRepo.findOne({ where: { id: errandId } });
    if (!errand) {
      throw new NotFoundException(`Errand order ${errandId} not found`);
    }
    errand.status = status;
    return this.orderRepo.save(errand);
  }
}
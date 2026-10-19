import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrandOrder, ErrandOrderStatus } from './entities/errand-order.entity';
import { CreateErrandDto } from './dto/create-errand.dto';
import { ClaimErrandDto } from './dto/claim-errand.dto';
import { NotificationService } from './notifications/notification.service';

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(ErrandOrder)
    private readonly orderRepo: Repository<ErrandOrder>,
    private readonly notifications: NotificationService,
  ) {}

  async createErrandOrder(dto: CreateErrandDto): Promise<ErrandOrder> {
    const order = this.orderRepo.create({
      ...dto,
      status: ErrandOrderStatus.PENDING,
    });
    return this.orderRepo.save(order);
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
    const saved = await this.orderRepo.save(errand);

    // Runner gets an assignment alert; the buyer gets a status update.
    // Not awaited: NotificationService.send never throws and should not slow the response.
    void this.notifications.notifyAssignment(saved.runnerStudentId, saved.id, saved.status);
    void this.notifications.notifyStatusChange(saved.buyerStudentId, saved.id, saved.status);

    return saved;
  }

  async updateErrandStatus(errandId: string, status: ErrandOrderStatus): Promise<ErrandOrder> {
    const errand = await this.orderRepo.findOne({ where: { id: errandId } });
    if (!errand) {
      throw new NotFoundException(`Errand order ${errandId} not found`);
    }
    errand.status = status;
    const saved = await this.orderRepo.save(errand);

    // Tell everyone involved (buyer, and runner once one is assigned).
    const recipients = new Set<string>([saved.buyerStudentId]);
    if (saved.runnerStudentId) recipients.add(saved.runnerStudentId);
    for (const studentId of recipients) {
      void this.notifications.notifyStatusChange(studentId, saved.id, saved.status);
    }

    return saved;
  }
}
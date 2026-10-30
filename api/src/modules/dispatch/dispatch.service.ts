import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrandOrder, ErrandOrderStatus } from './entities/errand-order.entity';
import { CreateErrandDto } from './dto/create-errand.dto';
import { ClaimErrandDto } from './dto/claim-errand.dto';
import { User } from '../users/entities/user.entity';
import { PushNotificationsService } from '../notifications/push-notifications.service';

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(ErrandOrder)
    private readonly orderRepo: Repository<ErrandOrder>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notifications: PushNotificationsService,
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
    await Promise.all([
      this.notifications.notifyErrandStatusChanged(saved),
      this.notifications.notifyErrandAssigned(saved),
    ]);
    return saved;
  }

  async updateErrandStatus(errandId: string, status: ErrandOrderStatus): Promise<ErrandOrder> {
    const errand = await this.orderRepo.findOne({ where: { id: errandId } });
    if (!errand) {
      throw new NotFoundException(`Errand order ${errandId} not found`);
    }
    const previousStatus = errand.status;
    errand.status = status;
    const saved = await this.orderRepo.save(errand);
    if (previousStatus !== status) {
      await this.notifications.notifyErrandStatusChanged(saved);
    }
    return saved;
  }

  async findErrandForUser(errandId: string, userId: string): Promise<ErrandOrder> {
    const [errand, user] = await Promise.all([
      this.orderRepo.findOne({ where: { id: errandId } }),
      this.userRepo.findOne({ where: { id: userId } }),
    ]);
    if (!errand) throw new NotFoundException(`Errand order ${errandId} not found`);
    if (!user || (errand.buyerStudentId !== user.msuIdNumber && errand.runnerStudentId !== user.msuIdNumber)) {
      throw new ForbiddenException('You are not assigned to this errand');
    }
    return errand;
  }
}

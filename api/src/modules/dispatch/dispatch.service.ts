import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OtpService } from '../guardrails/otp.service';
import { CreateErrandDto } from './dto/create-errand.dto';
import { ErrandOrder, ErrandOrderStatus } from './entities/errand-order.entity';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(ErrandOrder)
    private readonly orderRepo: Repository<ErrandOrder>,
    private readonly dataSource: DataSource,
    private readonly otpService: OtpService,
  ) {}

  async createErrandOrder(dto: CreateErrandDto, buyer: User): Promise<ErrandOrder> {
    const order = this.orderRepo.create({
      ...dto,
      buyerStudentId: buyer.msuIdNumber,
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

  async claimErrand(errandId: string, courier: User): Promise<ErrandOrder> {
    this.assertVerifiedCourier(courier);
    return this.dataSource.transaction(async (manager) => {
      const errand = await manager.findOne(ErrandOrder, {
        where: { id: errandId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!errand) throw new NotFoundException(`Errand order ${errandId} not found`);
      if (errand.status !== ErrandOrderStatus.PENDING) {
        throw new BadRequestException(`Errand order is no longer pending (current status: ${errand.status})`);
      }

      errand.runnerStudentId = courier.msuIdNumber;
      errand.status = ErrandOrderStatus.ACCEPTED;
      return manager.save(errand);
    });
  }

  async updateErrandStatus(
    errandId: string,
    status: ErrandOrderStatus,
    courier: User,
  ): Promise<ErrandOrder> {
    this.assertVerifiedCourier(courier);
    if (![ErrandOrderStatus.PURCHASED, ErrandOrderStatus.DELIVERING].includes(status)) {
      throw new BadRequestException('Use the handoff endpoint to complete a delivery.');
    }

    return this.dataSource.transaction(async (manager) => {
      const errand = await manager.findOne(ErrandOrder, {
        where: { id: errandId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!errand) throw new NotFoundException(`Errand order ${errandId} not found`);
      this.assertAssignedCourier(errand, courier);

      const expectedStatus = status === ErrandOrderStatus.PURCHASED
        ? ErrandOrderStatus.ACCEPTED
        : ErrandOrderStatus.PURCHASED;
      if (errand.status !== expectedStatus) {
        throw new BadRequestException(
          `Cannot change errand status from ${errand.status} to ${status}.`,
        );
      }

      if (status === ErrandOrderStatus.DELIVERING) {
        await this.otpService.generateOtp(errand.id, manager);
      }
      errand.status = status;
      return manager.save(errand);
    });
  }

  async getRecipientOtp(errandId: string, buyer: User) {
    return this.otpService.getRecipientOtp(errandId, buyer.msuIdNumber);
  }

  async reissueHandoffOtp(errandId: string, admin: User) {
    if (admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('An administrator must authorize OTP re-verification.');
    }
    return this.otpService.reissueOtp(errandId, admin.msuIdNumber);
  }

  async completeHandoff(errandId: string, otpCode: string, courier: User): Promise<ErrandOrder> {
    this.assertVerifiedCourier(courier);
    const result = await this.otpService.verifyOtp(errandId, courier.msuIdNumber, otpCode);
    return result.order;
  }

  private assertVerifiedCourier(user: User): void {
    if (user.role !== UserRole.COURIER || !user.isCourierVerified) {
      throw new ForbiddenException('A verified courier account is required.');
    }
  }

  private assertAssignedCourier(errand: ErrandOrder, courier: User): void {
    if (errand.runnerStudentId !== courier.msuIdNumber) {
      throw new ForbiddenException('Only the courier assigned to this errand may update it.');
    }
  }
}

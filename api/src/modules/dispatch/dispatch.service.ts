import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ErrandOrder, ErrandOrderStatus } from './entities/errand-order.entity';
import { CreateErrandDto } from './dto/create-errand.dto';
import { OtpService } from '../guardrails/otp.service';

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(ErrandOrder)
    private readonly orderRepo: Repository<ErrandOrder>,
    private readonly dataSource: DataSource,
    private readonly otpService: OtpService,
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

  async claimErrand(errandId: string, runnerStudentId: string): Promise<ErrandOrder> {
    const errand = await this.orderRepo.findOne({ where: { id: errandId } });
    if (!errand) {
      throw new NotFoundException(`Errand order ${errandId} not found`);
    }
    if (errand.status !== ErrandOrderStatus.PENDING) {
      throw new BadRequestException(`Errand order is no longer pending (current status: ${errand.status})`);
    }

    errand.runnerStudentId = runnerStudentId;
    errand.status = ErrandOrderStatus.ACCEPTED;
    return this.orderRepo.save(errand);
  }

  async updateErrandStatus(errandId: string, status: ErrandOrderStatus): Promise<ErrandOrder> {
    const errand = await this.orderRepo.findOne({ where: { id: errandId } });
    if (!errand) {
      throw new NotFoundException(`Errand order ${errandId} not found`);
    }
    if (status === ErrandOrderStatus.COMPLETED) {
      throw new BadRequestException('Errands can only be completed after successful handoff OTP verification.');
    }
    if (errand.status === ErrandOrderStatus.COMPLETED) {
      throw new BadRequestException('A completed errand cannot be changed.');
    }
    errand.status = status;
    return this.orderRepo.save(errand);
  }

  async generateHandoffOtp(errandId: string, buyerStudentId: string) {
    return this.dataSource.transaction(async (manager) => {
      const errand = await this.findErrandForUpdate(manager, errandId);
      if (errand.buyerStudentId !== buyerStudentId) {
        throw new BadRequestException('Only the errand recipient can request its handoff OTP.');
      }
      if ([ErrandOrderStatus.COMPLETED, ErrandOrderStatus.CANCELLED].includes(errand.status)) {
        throw new BadRequestException('A handoff code cannot be issued for a completed or cancelled errand.');
      }

      const generated = await this.otpService.generateOtp(errand.id, manager);
      return {
        errandId: errand.id,
        ...generated,
        deliveryMethod: 'recipient-screen',
        message: 'Show this one-time code to the recipient. It will not be shown again.',
      };
    });
  }

  async verifyHandoff(errandId: string, otpCode: string, runnerStudentId: string) {
    return this.dataSource.transaction(async (manager) => {
      const errand = await this.findErrandForUpdate(manager, errandId);
      if (!errand.runnerStudentId || errand.runnerStudentId !== runnerStudentId) {
        throw new BadRequestException('Only the assigned courier can verify this handoff.');
      }
      if (errand.status !== ErrandOrderStatus.DELIVERING) {
        throw new BadRequestException('Handoff OTP can only be verified while the errand is delivering.');
      }

      const verification = await this.otpService.verifyOtp(errand.id, otpCode, manager);
      if (!verification.success) return verification;

      errand.status = ErrandOrderStatus.COMPLETED;
      await manager.getRepository(ErrandOrder).save(errand);
      return { ...verification, status: errand.status };
    });
  }

  private async findErrandForUpdate(manager: EntityManager, errandId: string): Promise<ErrandOrder> {
    const errand = await manager.getRepository(ErrandOrder).findOne({
      where: { id: errandId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!errand) {
      throw new NotFoundException(`Errand order ${errandId} not found`);
    }
    return errand;
  }
}

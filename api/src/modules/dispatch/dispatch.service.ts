import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrandOrder, ErrandOrderStatus } from './entities/errand-order.entity';
import { CreateErrandDto } from './dto/create-errand.dto';
import { ClaimErrandDto } from './dto/claim-errand.dto';
import { ScheduleGuardService } from '../guardrails/schedule-guard.service';
import { OtpService } from '../guardrails/otp.service';
import { UserService } from '../users/user.service';

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(ErrandOrder)
    private readonly orderRepo: Repository<ErrandOrder>,
    private readonly scheduleGuard: ScheduleGuardService,
    private readonly otpService: OtpService,
    private readonly userService: UserService,
  ) {}

  async createErrandOrder(dto: CreateErrandDto, buyerStudentId: string, userId: string): Promise<ErrandOrder> {
    await this.scheduleGuard.authorizeRestrictedActivity(userId, buyerStudentId, 'PLACE_ERRAND');
    const order = this.orderRepo.create({
      ...dto,
      buyerStudentId,
      status: ErrandOrderStatus.PENDING,
    });
    return this.orderRepo.save(order);
  }

  async findPendingErrands(userId: string, runnerStudentId: string): Promise<ErrandOrder[]> {
    await this.scheduleGuard.authorizeRestrictedActivity(userId, runnerStudentId, 'VIEW_ERRAND_FEED');
    return this.orderRepo.find({
      where: { status: ErrandOrderStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  async claimErrand(errandId: string, dto: ClaimErrandDto, userId: string): Promise<ErrandOrder> {
    await this.scheduleGuard.authorizeRestrictedActivity(userId, dto.runnerStudentId, 'CLAIM_ERRAND');
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

  async updateErrandStatus(
    errandId: string,
    status: ErrandOrderStatus,
    runnerStudentId: string,
    userId: string,
  ): Promise<ErrandOrder> {
    await this.scheduleGuard.authorizeRestrictedActivity(userId, runnerStudentId, `UPDATE_ERRAND_${status}`);
    const errand = await this.orderRepo.findOne({ where: { id: errandId } });
    if (!errand) {
      throw new NotFoundException(`Errand order ${errandId} not found`);
    }
    if (errand.runnerStudentId !== runnerStudentId) {
      throw new ForbiddenException('Only the assigned courier can update this errand');
    }
    if (status === ErrandOrderStatus.COMPLETED) {
      throw new BadRequestException('Delivery completion requires a verified handoff code');
    }

    if (status === ErrandOrderStatus.DELIVERING && errand.status !== ErrandOrderStatus.DELIVERING) {
      const buyer = await this.userService.findByMsuIdWithSchedules(errand.buyerStudentId);
      if (!buyer) throw new NotFoundException('The buyer account for this errand was not found');
      await this.otpService.createAndDeliverOtp(errand.id, {
        email: buyer.email,
        fullName: buyer.fullName,
      });
    }

    errand.status = status;
    return this.orderRepo.save(errand);
  }

  async resendHandoffOtp(
    errandId: string,
    runnerStudentId: string,
    userId: string,
  ): Promise<{ errandId: string; expiresAt: Date }> {
    await this.scheduleGuard.authorizeRestrictedActivity(userId, runnerStudentId, 'RESEND_HANDOFF_OTP');
    const errand = await this.orderRepo.findOne({ where: { id: errandId } });
    if (!errand) throw new NotFoundException(`Errand order ${errandId} not found`);
    if (errand.runnerStudentId !== runnerStudentId) {
      throw new ForbiddenException('Only the assigned courier can request a handoff code');
    }
    if (errand.status !== ErrandOrderStatus.DELIVERING) {
      throw new BadRequestException('A handoff code can only be sent while the errand is being delivered');
    }

    const buyer = await this.userService.findByMsuIdWithSchedules(errand.buyerStudentId);
    if (!buyer) throw new NotFoundException('The buyer account for this errand was not found');
    const { expiresAt } = await this.otpService.createAndDeliverOtp(errand.id, {
      email: buyer.email,
      fullName: buyer.fullName,
    });
    return { errandId, expiresAt };
  }

  async completeErrandWithOtp(
    errandId: string,
    otpCode: string,
    runnerStudentId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string; errand?: ErrandOrder }> {
    await this.scheduleGuard.authorizeRestrictedActivity(userId, runnerStudentId, 'COMPLETE_ERRAND_HANDOFF');
    return this.orderRepo.manager.transaction(async (manager) => {
      const errandRepository = manager.getRepository(ErrandOrder);
      const errand = await errandRepository.findOne({
        where: { id: errandId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!errand) throw new NotFoundException(`Errand order ${errandId} not found`);
      if (errand.runnerStudentId !== runnerStudentId) {
        throw new ForbiddenException('Only the assigned courier can confirm this handoff');
      }
      if (errand.status !== ErrandOrderStatus.DELIVERING) {
        throw new BadRequestException('Only an in-transit errand can be completed');
      }

      const verification = await this.otpService.verifyOtp(errand.id, otpCode, userId, manager);
      if (!verification.success || !verification.otpLogId) {
        return { success: false, message: verification.message };
      }

      errand.status = ErrandOrderStatus.COMPLETED;
      errand.deliveryOtpLogId = verification.otpLogId;
      errand.deliveryCompletedAt = new Date();
      const savedErrand = await errandRepository.save(errand);
      return {
        success: true,
        message: verification.message,
        errand: savedErrand,
      };
    });
  }
}

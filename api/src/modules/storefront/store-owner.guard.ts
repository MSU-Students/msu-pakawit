import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class StoreOwnerGuard implements CanActivate {
  constructor(@InjectRepository(Store) private readonly storeRepo: Repository<Store>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.currentUser as User | undefined;
    const storeId = request.params?.id;

    if (!user || !storeId) throw new ForbiddenException();
    if (user.role === UserRole.ADMIN) return true;

    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    if (!store || (store.ownerId !== user.id && store.hostStudentId !== user.msuIdNumber)) {
      throw new ForbiddenException('Only the store owner can manage its products');
    }
    return true;
  }
}
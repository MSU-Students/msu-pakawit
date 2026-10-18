import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from './entities/store.entity';
import { Product } from './entities/product.entity';
import { StoreCategory } from './entities/store-category.entity';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { UserModule } from '../users/user.module';
import { SecurityModule } from '../shared/security.module';
import { StoreOwnerGuard } from './store-owner.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Store, Product, StoreCategory]), UserModule, SecurityModule],
  controllers: [StorefrontController],
  providers: [StorefrontService, StoreOwnerGuard],
  exports: [StorefrontService],
})
export class StorefrontModule {}

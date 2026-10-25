import { Controller, Get, Post, Body, Param, Req, UseGuards, Patch, Delete, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { StorefrontService } from './storefront.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { ActiveUserGuard } from '../users/active-user.guard';
import { StoreOwnerGuard } from './store-owner.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { UpdateProductDto } from './dto/update-product.dto';
import { SetProductAvailabilityDto } from './dto/set-product-availability.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

type AuthenticatedRequest = Request & { currentUser: User };

@ApiTags('Virtual Storefront & Catalog (Team 1)')
@Controller('stores')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Post()
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new zero-inventory virtual campus storefront' })
  createStore(@Body() dto: CreateStoreDto, @Req() request: AuthenticatedRequest) {
    return this.storefrontService.createStore(dto, request.currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'List all active virtual storefronts' })
  findAllStores() {
    return this.storefrontService.findAllStores();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List stores owned by the authenticated user' })
  findMyStores(@Req() request: AuthenticatedRequest) {
    return this.storefrontService.findStoresForOwner(
      request.currentUser.id,
      request.currentUser.msuIdNumber,
      request.currentUser.role === UserRole.ADMIN,
    );
  }

  @Get(':id/categories')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, StoreOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List categories for a store owned by the authenticated user' })
  findCategories(@Param('id', ParseUUIDPipe) storeId: string) {
    return this.storefrontService.findCategories(storeId);
  }

  @Post(':id/categories')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, StoreOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product category' })
  createCategory(@Param('id', ParseUUIDPipe) storeId: string, @Body() dto: CreateCategoryDto) {
    return this.storefrontService.createCategory(storeId, dto);
  }

  @Patch(':id/categories/:categoryId')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, StoreOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rename a product category and update its products' })
  renameCategory(
    @Param('id', ParseUUIDPipe) storeId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.storefrontService.renameCategory(storeId, categoryId, dto);
  }

  @Delete(':id/categories/:categoryId')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, StoreOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an unused product category' })
  deleteCategory(
    @Param('id', ParseUUIDPipe) storeId: string,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ) {
    return this.storefrontService.deleteCategory(storeId, categoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get virtual store details and product catalog' })
  findStoreById(@Param('id', ParseUUIDPipe) id: string) {
    return this.storefrontService.findStoreById(id);
  }

  @Post(':id/products')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, StoreOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add product with automatic zero-inventory markup calculation' })
  addProduct(@Param('id', ParseUUIDPipe) storeId: string, @Body() dto: CreateProductDto) {
    return this.storefrontService.addProductToStore(storeId, dto);
  }

  @Patch(':id/products/:productId')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, StoreOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product details and category' })
  updateProduct(
    @Param('id', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.storefrontService.updateProduct(storeId, productId, dto);
  }

  @Patch(':id/products/:productId/availability')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, StoreOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product stock availability' })
  setProductAvailability(
    @Param('id', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: SetProductAvailabilityDto,
  ) {
    return this.storefrontService.setProductAvailability(storeId, productId, dto.isAvailable);
  }

  @Patch(':id/products/:productId/archive')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, StoreOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive a discontinued product' })
  archiveProduct(
    @Param('id', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.storefrontService.archiveProduct(storeId, productId);
  }

  @Patch(':id/products/:productId/restore')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, StoreOwnerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore an archived product' })
  restoreProduct(
    @Param('id', ParseUUIDPipe) storeId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.storefrontService.restoreProduct(storeId, productId);
  }
}

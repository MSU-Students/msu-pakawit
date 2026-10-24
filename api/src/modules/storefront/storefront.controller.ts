import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Virtual Storefront & Catalog (Team 1)')
@Controller('stores')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new zero-inventory virtual campus storefront' })
  createStore(@Body() dto: CreateStoreDto) {
    return this.storefrontService.createStore(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all active virtual storefronts' })
  findAllStores() {
    return this.storefrontService.findAllStores();
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Get order details and receipt by order ID' })
  findOrderById(@Param('orderId') orderId: string) {
    return this.storefrontService.findOrderById(orderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get virtual store details and product catalog' })
  findStoreById(@Param('id') id: string) {
    return this.storefrontService.findStoreById(id);
  }

  @Post(':id/products')
  @ApiOperation({ summary: 'Add product with automatic zero-inventory markup calculation' })
  addProduct(@Param('id') storeId: string, @Body() dto: CreateProductDto) {
    return this.storefrontService.addProductToStore(storeId, dto);
  }

  @Post(':id/orders')
  @ApiOperation({ summary: 'Customer places an order for a virtual storefront' })
  createOrder(@Param('id') storeId: string, @Body() dto: CreateOrderDto) {
    return this.storefrontService.createOrder(storeId, dto);
  }

  @Get(':id/orders')
  @ApiOperation({ summary: 'Store owner receives purchase requests for their storefront' })
  findOrdersByStore(@Param('id') storeId: string) {
    return this.storefrontService.findOrdersByStore(storeId);
  }
}

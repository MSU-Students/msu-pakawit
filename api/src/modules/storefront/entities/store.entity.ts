import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  hostStudentId: string; // MSU Student ID of the virtual store host

  @Column()
  hostName: string;

  @Column()
  name: string; // e.g. 'Amina Campus Essentials'

  @Column({ nullable: true })
  description: string;

  @Column()
  vendorOrigin: string; // e.g. 'Commercial Center', 'MSU Main Gate', 'Cafeteria'

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 35.0 })
  defaultConvenienceFee: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.0 })
  markupPercentage: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Product, (product) => product.store)
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

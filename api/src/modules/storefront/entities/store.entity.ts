import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { User } from '../../users/entities/user.entity';
import { StoreCategory } from './store-category.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  hostStudentId: string; // MSU Student ID of the virtual store host

  @Column()
  hostName: string;

  @Column({ type: 'uuid', nullable: true })
  ownerId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerId' })
  owner: User | null;

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

  @OneToMany(() => StoreCategory, (category) => category.store)
  categories: StoreCategory[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

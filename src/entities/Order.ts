import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { EnergyOffer } from './EnergyOffer';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, user => user.orders)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => EnergyOffer)
  @JoinColumn({ name: 'offer_id' })
  offer!: EnergyOffer;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity_kwh!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_price!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at!: Date;
}

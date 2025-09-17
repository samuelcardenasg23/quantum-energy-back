import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('energy_offers')
export class EnergyOffer {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, user => user.offers)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount_kwh!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  current_amount_kwh!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_kwh!: number;

  @Column({ type: 'enum', enum: ['available', 'unavailable'], default: 'available' })
  offer_status!: 'available' | 'unavailable';

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at!: Date;
}

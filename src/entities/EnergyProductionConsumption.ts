import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('energy_production_consumption')
export class EnergyProductionConsumption {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, user => user.productions)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  energy_produced_kwh!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  energy_consumed_kwh!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  used_kwh!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  consumed_kwh!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at!: Date;
}

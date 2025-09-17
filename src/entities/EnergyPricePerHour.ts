import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('energy_price_per_hour')
export class EnergyPricePerHour {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  provider_name!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_kwh!: number;

  @Column({ type: 'timestamp' })
  price_time!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at!: Date;
}

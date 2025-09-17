import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { EnergyOffer } from './EnergyOffer';
import { Order } from './Order';
import { EnergyProductionConsumption } from './EnergyProductionConsumption';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({ type: 'varchar', length: 255 })
  location!: string;

  @Column({ type: 'enum', enum: ['prosumidor', 'consumidor', 'generador'] })
  user_role!: 'prosumidor' | 'consumidor' | 'generador';

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at!: Date;

  @OneToMany(() => EnergyOffer, (offer: EnergyOffer) => offer.user)
  offers!: EnergyOffer[];

  @OneToMany(() => Order, (order: Order) => order.user)
  orders!: Order[];

  @OneToMany(() => EnergyProductionConsumption, (epc: EnergyProductionConsumption) => epc.user)
  productions!: EnergyProductionConsumption[];
}

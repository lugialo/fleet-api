import { BaseEntity } from 'src/common/entities/base.entity';
import { Model } from 'src/models/entities/model.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('vehicles')
export class Vehicle extends BaseEntity {
  @Column({ unique: true })
  plate!: string;

  @Column()
  color!: string;

  @Column()
  year!: number;

  // muitos veículos podem ter um modelo, mas um modelo pode ter muitos veículos
  @ManyToOne(() => Model, { nullable: false, eager: true })
  @JoinColumn({ name: 'model_id' })
  model!: Model;
}

import { BaseEntity } from '../../common/entities/base.entity';
import { Column, Entity } from 'typeorm';

@Entity('brands')
export class Brand extends BaseEntity {
  @Column({ unique: true })
  name!: string;
}

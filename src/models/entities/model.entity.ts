import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Brand } from '../../brands/entities/brand.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('models')
export class Model extends BaseEntity {
  @Column()
  name!: string;

  @Column()
  fipe_code!: string;

  // um modelo pertence a uma marca, mas uma marca pode ter vários modelos
  @ManyToOne(() => Brand, { nullable: false, eager: true })
  @JoinColumn({ name: 'brand_id' })
  brand!: Brand;
}

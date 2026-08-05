import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type MessageType = 'error' | 'response' | 'user';
export type MessageDeliveryType = 'delivered' | 'rejected' | 'sent' | 'undelivered';
export type MessageDisplayType = 'displayed' | 'unread';

@Entity('messages')
@Index(['chatId', 'position'], { unique: true })
@Index(['chatId', 'position', 'correlationId'])
export class MessageModel {
  @PrimaryColumn('uuid')
  id: string;

  @Column('varchar', { name: 'correlation_id', length: 128, unique: true })
  correlationId: string;

  @Column('uuid', { name: 'chat_id' })
  chatId: string;

  @Column('varchar', { name: 'prev_id', length: 128, nullable: true })
  prevId: string | null;

  @Column('varchar', { length: 16 })
  type: MessageType;

  @Column('text')
  text: string;

  @Column('integer')
  position: number;

  @Column('varchar', { name: 'delivery_type', length: 16, nullable: true })
  deliveryType: MessageDeliveryType | null;

  @Column('varchar', { name: 'delivery_reason', length: 128, nullable: true })
  deliveryReason: string | null;

  @Column('varchar', { name: 'display_type', length: 16, nullable: true })
  displayType: MessageDisplayType | null;

  @Column('varchar', { name: 'display_reason', length: 128, nullable: true })
  displayReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

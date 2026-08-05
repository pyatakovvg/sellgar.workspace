import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ChatMode = 'parallel' | 'sequential';
export type ChatProcessingType = 'idle' | 'processing';

@Entity('chats')
@Index(['createdAt', 'id'])
export class ChatModel {
  @PrimaryGeneratedColumn('increment')
  number: number;

  @Column('uuid', { unique: true })
  id: string;

  @Column('varchar', { name: 'correlation_id', length: 128, unique: true })
  correlationId: string;

  @Column('varchar', { name: 'prev_id', length: 128, nullable: true })
  prevId: string | null;

  @Column('varchar', { length: 256 })
  title: string;

  @Column('varchar', { length: 16 })
  mode: ChatMode;

  @Column('varchar', { name: 'processing_type', length: 16 })
  processingType: ChatProcessingType;

  @Column('varchar', { name: 'processing_reason', length: 128 })
  processingReason: string;

  @Column('integer', { name: 'unread_count', default: 0 })
  unreadCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

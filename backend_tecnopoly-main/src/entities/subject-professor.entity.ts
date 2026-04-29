import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subject } from './subject.entity';
import { User } from './user.entity';

@Entity('subject_professors')
export class SubjectProfessor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  subject_id: string;

  @ManyToOne(() => Subject, (subject) => subject.subject_professors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column()
  professor_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'professor_id' })
  professor: User;

  @CreateDateColumn()
  assigned_at: Date;
}

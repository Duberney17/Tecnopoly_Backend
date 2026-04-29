import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Grade } from './grade.entity';
import { SubjectProfessor } from './subject-professor.entity';
import { Question } from './question.entity';

@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ nullable: true })
  created_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ nullable: true })
  grade_id: string | null;

  @ManyToOne(() => Grade, (grade) => grade.subjects, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'grade_id' })
  grade: Grade;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => SubjectProfessor, (sp) => sp.subject, { cascade: true })
  subject_professors: SubjectProfessor[];

  @OneToMany(() => Question, (q) => q.subject, { cascade: true })
  questions: Question[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Subject } from './subject.entity';
import { User } from './user.entity';
import { AnswerOption } from './answer-option.entity';
import { QuestionLevel } from '../common/enums/question-level.enum';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  subject_id: string;

  @ManyToOne(() => Subject, (subject) => subject.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ type: 'text' })
  question_text: string;

  @Column()
  correct_answer_index: number;

  @Column({ default: 0 })
  reward_credits: number;

  @Column({ default: 0 })
  penalty_credits: number;

  @Column({ type: 'text', nullable: true })
  correct_explanation: string | null;

  @Column({ type: 'text', nullable: true })
  incorrect_explanation: string | null;

  @Column({ type: 'enum', enum: QuestionLevel })
  level: QuestionLevel;

  @Column({ type: 'text', nullable: true })
  image_url: string | null;

  @Column({ nullable: true })
  created_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => AnswerOption, (ao) => ao.question, { cascade: true })
  answer_options: AnswerOption[];
}

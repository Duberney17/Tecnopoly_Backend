import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { SubjectsModule } from '../subjects/subjects.module';
import { AssignedProfessorGuard } from '../common/guards/assigned-professor.guard';
import { Question } from '../entities/question.entity';
import { AnswerOption } from '../entities/answer-option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question, AnswerOption]), SubjectsModule],
  controllers: [QuestionsController],
  providers: [QuestionsService, AssignedProfessorGuard],
  exports: [QuestionsService],
})
export class QuestionsModule {}

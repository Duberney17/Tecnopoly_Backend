import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';
import { GradeQuestionsController } from './grade-questions.controller';
import { QuestionsModule } from '../questions/questions.module';
import { Grade } from '../entities/grade.entity';
import { Subject } from '../entities/subject.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Grade, Subject]), QuestionsModule],
  controllers: [GradesController, GradeQuestionsController],
  providers: [GradesService],
  exports: [GradesService],
})
export class GradesModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule }       from './auth/auth.module';
import { UsersModule }      from './users/users.module';
import { SubjectsModule }   from './subjects/subjects.module';
import { QuestionsModule }  from './questions/questions.module';
import { GradesModule }     from './grades/grades.module';

// Entities
import { User }              from './entities/user.entity';
import { Grade }             from './entities/grade.entity';
import { Subject }           from './entities/subject.entity';
import { SubjectProfessor }  from './entities/subject-professor.entity';
import { Question }          from './entities/question.entity';
import { AnswerOption }      from './entities/answer-option.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('DATABASE_URL'),
        ssl: { rejectUnauthorized: false }, // Requerido para Neon
        entities: [User, Grade, Subject, SubjectProfessor, Question, AnswerOption],
        synchronize: true, // Crea las tablas automáticamente (ideal para desarrollo)
        logging: false,
      }),
    }),

    AuthModule,
    UsersModule,
    GradesModule,
    SubjectsModule,
    QuestionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

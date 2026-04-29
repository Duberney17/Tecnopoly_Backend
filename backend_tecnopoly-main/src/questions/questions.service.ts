import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../entities/question.entity';
import { AnswerOption } from '../entities/answer-option.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionLevel } from '../common/enums/question-level.enum';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private questionsRepo: Repository<Question>,
    @InjectRepository(AnswerOption)
    private answerOptionsRepo: Repository<AnswerOption>,
  ) {}

  // ─── Helper: verificar que la pregunta existe ────────────────────────────
  private async verifyQuestionExists(questionId: string) {
    const question = await this.questionsRepo.findOne({
      where: { id: questionId },
      select: ['id', 'subject_id', 'created_by'],
    });

    if (!question) {
      throw new NotFoundException(
        `Pregunta con id ${questionId} no encontrada`,
      );
    }

    return question;
  }

  // ─── Crear pregunta con sus opciones de respuesta ────────────────────────
  async create(
    subjectId: string,
    createQuestionDto: CreateQuestionDto,
    professorId: string,
  ) {
    const { answer_options, ...questionData } = createQuestionDto;

    if (createQuestionDto.correct_answer_index >= answer_options.length) {
      throw new BadRequestException(
        `correct_answer_index (${createQuestionDto.correct_answer_index}) excede el número de opciones disponibles (${answer_options.length})`,
      );
    }

    const question = this.questionsRepo.create({
      subject_id: subjectId,
      created_by: professorId,
      question_text: questionData.question_text,
      correct_answer_index: questionData.correct_answer_index,
      reward_credits: questionData.reward_credits,
      penalty_credits: questionData.penalty_credits,
      correct_explanation: questionData.correct_explanation ?? null,
      incorrect_explanation: questionData.incorrect_explanation ?? null,
      level: questionData.level,
      image_url: questionData.image_url ?? null,
    });

    const savedQuestion = await this.questionsRepo.save(question);

    const optionsToInsert = answer_options.map((opt) =>
      this.answerOptionsRepo.create({
        question_id: savedQuestion.id,
        option_text: opt.option_text,
        order_index: opt.order_index,
      }),
    );

    await this.answerOptionsRepo.save(optionsToInsert);

    return this.findOne(savedQuestion.id);
  }

  // ─── Obtener todas las preguntas de una asignatura ────────────────────────
  async findAllBySubject(subjectId: string, level?: QuestionLevel) {
    const where: any = { subject_id: subjectId };
    if (level) where.level = level;

    const questions = await this.questionsRepo.find({
      where,
      relations: ['answer_options'],
      order: { created_at: 'DESC' },
    });

    return questions.map((q) => ({
      ...q,
      answer_options: q.answer_options?.sort(
        (a, b) => a.order_index - b.order_index,
      ),
    }));
  }

  // ─── Obtener una pregunta por ID ─────────────────────────────────────────
  async findOne(questionId: string) {
    const question = await this.questionsRepo.findOne({
      where: { id: questionId },
      relations: ['answer_options'],
    });

    if (!question) {
      throw new NotFoundException(
        `Pregunta con id ${questionId} no encontrada`,
      );
    }

    return {
      ...question,
      answer_options: question.answer_options?.sort(
        (a, b) => a.order_index - b.order_index,
      ),
    };
  }

  // ─── Actualizar pregunta ─────────────────────────────────────────────────
  async update(
    questionId: string,
    updateQuestionDto: UpdateQuestionDto,
    requestUser: { id: string; role: string },
  ) {
    const question = await this.verifyQuestionExists(questionId);

    if (
      requestUser.role !== Role.ADMIN &&
      question.created_by !== requestUser.id
    ) {
      throw new ForbiddenException(
        'Solo puedes editar las preguntas que tú creaste',
      );
    }

    const { answer_options, ...questionData } = updateQuestionDto;

    if (
      answer_options &&
      updateQuestionDto.correct_answer_index !== undefined &&
      updateQuestionDto.correct_answer_index >= answer_options.length
    ) {
      throw new BadRequestException(
        `correct_answer_index (${updateQuestionDto.correct_answer_index}) excede el número de opciones disponibles (${answer_options.length})`,
      );
    }

    if (Object.keys(questionData).length > 0) {
      await this.questionsRepo.update(questionId, questionData);
    }

    if (answer_options && answer_options.length > 0) {
      await this.answerOptionsRepo.delete({ question_id: questionId });

      const optionsToInsert = answer_options.map((opt) =>
        this.answerOptionsRepo.create({
          question_id: questionId,
          option_text: opt.option_text,
          order_index: opt.order_index,
        }),
      );

      await this.answerOptionsRepo.save(optionsToInsert);
    }

    return this.findOne(questionId);
  }

  // ─── Eliminar pregunta ────────────────────────────────────────────────────
  async remove(
    questionId: string,
    requestUser: { id: string; role: string },
  ) {
    const question = await this.verifyQuestionExists(questionId);

    if (
      requestUser.role !== Role.ADMIN &&
      question.created_by !== requestUser.id
    ) {
      throw new ForbiddenException(
        'Solo puedes eliminar las preguntas que tú creaste',
      );
    }

    await this.questionsRepo.delete(questionId);
    return { message: `Pregunta con id ${questionId} eliminada correctamente` };
  }
}

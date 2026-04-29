import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Grade } from '../entities/grade.entity';
import { Subject } from '../entities/subject.entity';
import { SubjectProfessor } from '../entities/subject-professor.entity';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(Grade)
    private gradesRepo: Repository<Grade>,
    @InjectRepository(Subject)
    private subjectsRepo: Repository<Subject>,
  ) {}

  // ── Crear grado ────────────────────────────────────────────────────────
  async create(createGradeDto: CreateGradeDto, adminId: string) {
    const existing = await this.gradesRepo.findOne({
      where: { name: createGradeDto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un grado con el nombre "${createGradeDto.name}"`,
      );
    }

    const grade = this.gradesRepo.create({
      name: createGradeDto.name,
      description: createGradeDto.description ?? null,
      created_by: adminId,
    });

    return this.gradesRepo.save(grade);
  }

  // ── Listar todos los grados (con sus asignaturas) ──────────────────────
  async findAll() {
    const grades = await this.gradesRepo.find({
      relations: ['subjects'],
      order: { name: 'ASC' },
    });

    return grades.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      created_at: g.created_at,
      subjects: g.subjects?.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
      })),
    }));
  }

  // ── Obtener grado por ID (con asignaturas y profesores) ─────────────────
  async findOne(id: string) {
    const grade = await this.gradesRepo.findOne({
      where: { id },
      relations: [
        'subjects',
        'subjects.subject_professors',
        'subjects.subject_professors.professor',
      ],
    });

    if (!grade) {
      throw new NotFoundException(`Grado con id "${id}" no encontrado`);
    }

    return {
      id: grade.id,
      name: grade.name,
      description: grade.description,
      created_at: grade.created_at,
      subjects: grade.subjects?.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        subject_professors: s.subject_professors?.map((sp) => ({
          professor_id: sp.professor_id,
          assigned_at: sp.assigned_at,
          professor: sp.professor
            ? { id: sp.professor.id, name: sp.professor.name, email: sp.professor.email }
            : null,
        })),
      })),
    };
  }

  // ── Listar asignaturas de un grado ─────────────────────────────────────
  async findSubjectsByGrade(gradeId: string) {
    await this.findOne(gradeId);

    const subjects = await this.subjectsRepo.find({
      where: { grade_id: gradeId },
      relations: ['subject_professors', 'subject_professors.professor'],
      order: { name: 'ASC' },
    });

    return subjects.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      created_at: s.created_at,
      subject_professors: s.subject_professors?.map((sp) => ({
        professor_id: sp.professor_id,
        assigned_at: sp.assigned_at,
        professor: sp.professor
          ? { id: sp.professor.id, name: sp.professor.name, email: sp.professor.email }
          : null,
      })),
    }));
  }

  // ── Actualizar grado ───────────────────────────────────────────────────
  async update(id: string, updateGradeDto: UpdateGradeDto) {
    await this.findOne(id);

    if (updateGradeDto.name) {
      const existing = await this.gradesRepo.findOne({
        where: { name: updateGradeDto.name, id: Not(id) },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe un grado con el nombre "${updateGradeDto.name}"`,
        );
      }
    }

    await this.gradesRepo.update(id, updateGradeDto);
    return this.gradesRepo.findOne({
      where: { id },
      select: ['id', 'name', 'description', 'created_at'],
    });
  }

  // ── Eliminar grado ─────────────────────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id);
    await this.gradesRepo.delete(id);
    return { message: `Grado eliminado correctamente` };
  }
}

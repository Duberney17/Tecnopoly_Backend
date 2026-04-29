import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Not } from 'typeorm';
import { Subject } from '../entities/subject.entity';
import { SubjectProfessor } from '../entities/subject-professor.entity';
import { User } from '../entities/user.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { AssignProfessorDto } from './dto/assign-professor.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private subjectsRepo: Repository<Subject>,
    @InjectRepository(SubjectProfessor)
    private subjectProfessorsRepo: Repository<SubjectProfessor>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  // ─── Helpers privados ─────────────────────────────────────────────────────

  private async verifySubjectExists(id: string) {
    const subject = await this.subjectsRepo.findOne({ where: { id } });
    if (!subject) {
      throw new NotFoundException(`Asignatura con id ${id} no encontrada`);
    }
    return subject;
  }

  private async verifyProfessorExists(professorId: string) {
    const professor = await this.usersRepo.findOne({
      where: { id: professorId },
      select: ['id', 'name', 'email', 'role'],
    });

    if (!professor) {
      throw new NotFoundException(
        `Profesor con id ${professorId} no encontrado`,
      );
    }

    if (professor.role !== Role.PROFESOR) {
      throw new ForbiddenException(
        `El usuario con id ${professorId} no tiene el rol de profesor`,
      );
    }

    return professor;
  }

  // ─── Serializar subject con relaciones ────────────────────────────────────
  private serializeSubject(s: Subject) {
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      created_at: s.created_at,
      created_by: s.created_by,
      grade_id: s.grade_id,
      grade: s.grade
        ? { id: s.grade.id, name: s.grade.name, description: s.grade.description }
        : null,
      subject_professors: s.subject_professors?.map((sp) => ({
        id: sp.id,
        professor_id: sp.professor_id,
        assigned_at: sp.assigned_at,
        professor: sp.professor
          ? { id: sp.professor.id, name: sp.professor.name, email: sp.professor.email }
          : null,
      })),
    };
  }

  // ─── CRUD de asignaturas ──────────────────────────────────────────────────

  async create(createSubjectDto: CreateSubjectDto, adminId: string) {
    const { name, description, grade_id } = createSubjectDto;

    const existing = await this.subjectsRepo.findOne({
      where: { name: ILike(name) },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe una asignatura con el nombre "${name}"`,
      );
    }

    const subject = this.subjectsRepo.create({
      name,
      description: description ?? null,
      created_by: adminId,
      grade_id: grade_id ?? null,
    });

    const saved = await this.subjectsRepo.save(subject);
    return this.findOne(saved.id);
  }

  async findAll() {
    const subjects = await this.subjectsRepo.find({
      relations: ['grade', 'subject_professors', 'subject_professors.professor'],
      order: { created_at: 'DESC' },
    });
    return subjects.map((s) => this.serializeSubject(s));
  }

  async findOne(id: string) {
    const subject = await this.subjectsRepo.findOne({
      where: { id },
      relations: ['grade', 'subject_professors', 'subject_professors.professor'],
    });

    if (!subject) {
      throw new NotFoundException(`Asignatura con id ${id} no encontrada`);
    }

    return this.serializeSubject(subject);
  }

  async update(id: string, updateSubjectDto: UpdateSubjectDto) {
    await this.verifySubjectExists(id);

    if (updateSubjectDto.name) {
      const existing = await this.subjectsRepo.findOne({
        where: { name: ILike(updateSubjectDto.name), id: Not(id) },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe una asignatura con el nombre "${updateSubjectDto.name}"`,
        );
      }
    }

    await this.subjectsRepo.update(id, updateSubjectDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.verifySubjectExists(id);
    await this.subjectsRepo.delete(id);
    return { message: `Asignatura con id ${id} eliminada correctamente` };
  }

  // ─── Gestión de asignaciones de profesores ────────────────────────────────

  async assignProfessor(subjectId: string, dto: AssignProfessorDto) {
    await this.verifySubjectExists(subjectId);
    const professor = await this.verifyProfessorExists(dto.professor_id);

    const alreadyAssigned = await this.subjectProfessorsRepo.findOne({
      where: { subject_id: subjectId, professor_id: dto.professor_id },
    });

    if (alreadyAssigned) {
      throw new ConflictException(
        `El profesor ya está asignado a esta asignatura`,
      );
    }

    const assignment = this.subjectProfessorsRepo.create({
      subject_id: subjectId,
      professor_id: dto.professor_id,
    });

    const saved = await this.subjectProfessorsRepo.save(assignment);

    return {
      id: saved.id,
      assigned_at: saved.assigned_at,
      professor: {
        id: professor.id,
        name: professor.name,
        email: professor.email,
      },
    };
  }

  async removeProfessor(subjectId: string, professorId: string) {
    const assignment = await this.subjectProfessorsRepo.findOne({
      where: { subject_id: subjectId, professor_id: professorId },
    });

    if (!assignment) {
      throw new NotFoundException(
        `El profesor no está asignado a esta asignatura`,
      );
    }

    await this.subjectProfessorsRepo.delete(assignment.id);
    return { message: `Profesor desasignado de la asignatura correctamente` };
  }

  async getProfessors(subjectId: string) {
    await this.verifySubjectExists(subjectId);

    const assignments = await this.subjectProfessorsRepo.find({
      where: { subject_id: subjectId },
      relations: ['professor'],
    });

    return assignments.map((sp) => ({
      id: sp.id,
      assigned_at: sp.assigned_at,
      professor: sp.professor
        ? { id: sp.professor.id, name: sp.professor.name, email: sp.professor.email }
        : null,
    }));
  }

  async isProfessorAssigned(
    subjectId: string,
    professorId: string,
  ): Promise<boolean> {
    const assignment = await this.subjectProfessorsRepo.findOne({
      where: { subject_id: subjectId, professor_id: professorId },
    });
    return !!assignment;
  }
}

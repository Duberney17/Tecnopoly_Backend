import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/enums/role.enum';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  // ─── Crear usuario (solo admin) ───────────────────────────────────────────
  async create(createUserDto: CreateUserDto) {
    const { name, email, password, role } = createUserDto;

    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException(`El email ${email} ya está registrado`);
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = this.usersRepo.create({ name, email, password_hash, role });
    const saved = await this.usersRepo.save(user);

    const { password_hash: _, ...result } = saved;
    return result;
  }

  // ─── Listar todos los usuarios ────────────────────────────────────────────
  async findAll(role?: Role) {
    const where = role ? { role } : {};
    const users = await this.usersRepo.find({
      where,
      select: ['id', 'name', 'email', 'role', 'created_at'],
      order: { created_at: 'DESC' },
    });
    return users;
  }

  // ─── Buscar usuario por ID ────────────────────────────────────────────────
  async findOne(id: string) {
    const user = await this.usersRepo.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'role', 'created_at'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    return user;
  }

  // ─── Buscar usuario por email (para auth) ─────────────────────────────────
  async findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  // ─── Actualizar usuario ────────────────────────────────────────────────────
  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const updateData: Partial<User> = {};

    if (updateUserDto.name) updateData.name = updateUserDto.name;
    if (updateUserDto.role) updateData.role = updateUserDto.role;

    if (updateUserDto.email) {
      const existing = await this.usersRepo.findOne({
        where: { email: updateUserDto.email, id: Not(id) },
      });
      if (existing) {
        throw new ConflictException(
          `El email ${updateUserDto.email} ya está en uso`,
        );
      }
      updateData.email = updateUserDto.email;
    }

    if (updateUserDto.password) {
      updateData.password_hash = await bcrypt.hash(
        updateUserDto.password,
        SALT_ROUNDS,
      );
    }

    await this.usersRepo.update(id, updateData);
    return this.findOne(id);
  }

  // ─── Eliminar usuario ──────────────────────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id);
    await this.usersRepo.delete(id);
    return { message: `Usuario con id ${id} eliminado correctamente` };
  }
}

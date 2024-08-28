import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { User } from '@app/database'
import { CreateUserDto, GetUsersDto } from './dto/user.dto'

import { UsersRepository } from './users.repository'

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    @InjectRepository(User)
    private readonly repo: Repository<User> // Can be used to create queryBuilder
  ) {}

  async create(createUserInput: CreateUserDto): Promise<User> {
    return await this.usersRepository.create(createUserInput)
  }

  async getAndCount(getUsersInput: GetUsersDto) {
    const {
      page,
      perPage,
      order,
      searchText,
      birthDateGte,
      birthDateLte,
      ageGte,
      ageLte,
      userIdsToExclude,
      userIdsToInclude
    } = getUsersInput

    const queryBuilder = this.repo.createQueryBuilder('user')

    if (searchText?.trim()) {
      const formattedSearchText = `%${searchText.trim()}%`
      queryBuilder.andWhere("CONCAT(user.firstName, ' ', user.lastName) ILIKE :searchText", {
        searchText: formattedSearchText
      })
    }

    if (userIdsToExclude?.length) {
      queryBuilder.andWhere('user.id NOT IN (:...userIdsToExclude)', { userIdsToExclude })
    }

    if (userIdsToInclude?.length) {
      queryBuilder.andWhere('user.id IN (:...userIdsToInclude)', { userIdsToInclude })
    }

    if (birthDateGte) {
      queryBuilder.andWhere('user.birthDate >= :birthDateGte', { birthDateGte: new Date(birthDateGte) })
    }

    if (birthDateLte) {
      queryBuilder.andWhere('user.birthDate <= :birthDateLte', { birthDateLte: new Date(birthDateLte) })
    }

    const currentDate = new Date()

    if (ageGte !== undefined) {
      const birthDateLteForAgeGte = new Date(currentDate.setFullYear(currentDate.getFullYear() - ageGte))
      queryBuilder.andWhere('user.birthDate <= :birthDateLteForAgeGte', { birthDateLteForAgeGte })
    }

    if (ageLte !== undefined) {
      const birthDateGteForAgeLte = new Date(currentDate.setFullYear(currentDate.getFullYear() - ageLte - 1))
      queryBuilder.andWhere('user.birthDate >= :birthDateGteForAgeLte', { birthDateGteForAgeLte })
    }

    queryBuilder.take(perPage).skip((page - 1) * perPage)

    if (order) {
      Object.entries(order).forEach(([key, value]) => {
        queryBuilder.addOrderBy(`user.${key}`, value as 'ASC' | 'DESC')
      })
    }

    const [items, totalCount] = await queryBuilder.getManyAndCount()

    return { items, totalCount }
  }

  async getById(userId: number): Promise<User | null> {
    return await this.usersRepository.findOne({ id: userId })
  }

  async getByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ email })
  }
}

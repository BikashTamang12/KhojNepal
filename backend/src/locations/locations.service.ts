import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';
import { QueryLocationDto } from './dto/query-location.dto.js';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  findAll(query?: QueryLocationDto): Promise<Location[]> {
    const qb = this.locationRepository
      .createQueryBuilder('location')
      .orderBy('location.province', 'ASC')
      .addOrderBy('location.district', 'ASC')
      .addOrderBy('location.municipality', 'ASC')
      .addOrderBy('location.area', 'ASC');

    if (query?.province?.trim()) {
      qb.andWhere('LOWER(location.province) = LOWER(:province)', {
        province: query.province.trim(),
      });
    }

    if (query?.district?.trim()) {
      qb.andWhere('LOWER(location.district) = LOWER(:district)', {
        district: query.district.trim(),
      });
    }

    if (query?.municipality?.trim()) {
      qb.andWhere('LOWER(location.municipality) = LOWER(:municipality)', {
        municipality: query.municipality.trim(),
      });
    }

    if (query?.q?.trim()) {
      const pattern = `%${query.q.trim()}%`;
      qb.andWhere(
        '(location.province ILIKE :pattern OR location.district ILIKE :pattern OR location.municipality ILIKE :pattern OR COALESCE(location.area, \'\') ILIKE :pattern)',
        { pattern },
      );
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Location> {
    const location = await this.locationRepository.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    return location;
  }

  create(dto: CreateLocationDto): Promise<Location> {
    const location = this.locationRepository.create({
      province: dto.province.trim(),
      district: dto.district.trim(),
      municipality: dto.municipality.trim(),
      area: dto.area?.trim() || undefined,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
    return this.locationRepository.save(location);
  }

  async update(id: string, dto: UpdateLocationDto): Promise<Location> {
    const location = await this.findOne(id);

    if (dto.province !== undefined) location.province = dto.province.trim();
    if (dto.district !== undefined) location.district = dto.district.trim();
    if (dto.municipality !== undefined) location.municipality = dto.municipality.trim();
    if (dto.area !== undefined) location.area = dto.area.trim() || undefined;
    if (dto.latitude !== undefined) location.latitude = dto.latitude;
    if (dto.longitude !== undefined) location.longitude = dto.longitude;

    return this.locationRepository.save(location);
  }
}

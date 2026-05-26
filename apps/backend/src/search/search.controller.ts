import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async kereses(
    @Query('feladatId') feladatIdRaw: string,
    @Query('leiras') leiras: string,
  ): Promise<Array<Record<string, unknown>>> {
    const feladatId = Number(feladatIdRaw);
    return this.searchService.kereses(Number.isNaN(feladatId) ? -1 : feladatId, leiras);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(AuthGuard('jwt'))
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get('candidates')
  async searchCandidates(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    const query = (q || '').trim();
    if (!query) return [];
    return this.searchService.searchCandidates(query, limit ? parseInt(limit, 10) : 20);
  }
}

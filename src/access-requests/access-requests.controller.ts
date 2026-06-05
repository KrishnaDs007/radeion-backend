import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { AccessRequestsService } from './access-requests.service';
import { CreateOrganizationAccessRequestDto } from './dto/create-organization-access-request.dto';
import { CreateUserAccessRequestDto } from './dto/create-user-access-request.dto';

@Controller('access-requests')
export class AccessRequestsController {
  constructor(private readonly accessRequestsService: AccessRequestsService) {}

  @Public()
  @Post('users')
  async createUserRequest(@Body() body: CreateUserAccessRequestDto) {
    return {
      data: await this.accessRequestsService.createUserRequest(body),
    };
  }

  @Public()
  @Post('organizations')
  async createOrganizationRequest(
    @Body() body: CreateOrganizationAccessRequestDto,
  ) {
    return {
      data: await this.accessRequestsService.createOrganizationRequest(body),
    };
  }
}

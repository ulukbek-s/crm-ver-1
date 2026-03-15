import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { getScopeForUser } from '../scope';

@Injectable()
export class FounderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const scope = getScopeForUser(user);
    if (!scope.isFounder) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}

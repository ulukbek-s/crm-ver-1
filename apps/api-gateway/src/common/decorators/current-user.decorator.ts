import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  branchId: string | null;
  userRoles?: { role: { name: string } }[];
  branch?: { countryId: string } | null;
  managedBranchIds?: string[];
  managedCountryIds?: string[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext): JwtUser | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtUser;
    return data ? user?.[data] : user;
  },
);

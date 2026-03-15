import { JwtUser } from './decorators/current-user.decorator';

type UserWithScope = JwtUser & { managedCountryIds?: string[]; managedBranchIds?: string[] };

export interface UserScope {
  branchIds: string[] | null;
  countryIds: string[] | null;
  onlyAssignedToMe: boolean;
  isFounder: boolean;
}

export function getScopeForUser(user: UserWithScope | undefined): UserScope {
  if (!user) {
    return { branchIds: [], countryIds: [], onlyAssignedToMe: false, isFounder: false };
  }
  const roleNames = (user.userRoles ?? []).map((ur: { role: { name: string } }) => ur.role.name);

  if (roleNames.includes('Founder')) {
    return { branchIds: null, countryIds: null, onlyAssignedToMe: false, isFounder: true };
  }
  if (roleNames.includes('CountryDirector') && user.managedCountryIds?.length) {
    return {
      branchIds: null,
      countryIds: user.managedCountryIds,
      onlyAssignedToMe: false,
      isFounder: false,
    };
  }
  if (roleNames.includes('BranchManager') && user.branchId) {
    return {
      branchIds: [user.branchId],
      countryIds: null,
      onlyAssignedToMe: false,
      isFounder: false,
    };
  }
  if (roleNames.includes('Recruiter')) {
    return {
      branchIds: user.branchId ? [user.branchId] : [],
      countryIds: null,
      onlyAssignedToMe: true,
      isFounder: false,
    };
  }
  return {
    branchIds: user.branchId ? [user.branchId] : [],
    countryIds: null,
    onlyAssignedToMe: false,
    isFounder: false,
  };
}

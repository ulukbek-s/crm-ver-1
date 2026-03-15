import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '../../.env') });

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);

  const org = await prisma.organization.upsert({
    where: { id: 'seed-org-1' },
    update: {},
    create: {
      id: 'seed-org-1',
      name: 'Platform Holding',
      type: 'holding',
    },
  });

  const country1 = await prisma.country.upsert({
    where: { code: 'DE' },
    update: {},
    create: {
      name: 'Germany',
      code: 'DE',
      organizationId: org.id,
    },
  });

  const country2 = await prisma.country.upsert({
    where: { code: 'PL' },
    update: {},
    create: {
      name: 'Poland',
      code: 'PL',
      organizationId: org.id,
    },
  });

  const branch1 = await prisma.branch.upsert({
    where: { id: 'seed-branch-1' },
    update: {},
    create: {
      id: 'seed-branch-1',
      name: 'Berlin Branch',
      countryId: country1.id,
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { id: 'seed-branch-2' },
    update: {},
    create: {
      id: 'seed-branch-2',
      name: 'Warsaw Branch',
      countryId: country2.id,
    },
  });

  const roleNames = [
    'Founder',
    'Manager',
    'Recruiter',
    'BranchManager',
    'VisaOfficer',
    'Accountant',
    'Partner',
    'Customer',
  ];

  const roles = await Promise.all(
    roleNames.map((name, i) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { id: `seed-role-${i + 1}`, name, description: name },
      }),
    ),
  );

  const getRoleByName = (name: string) => {
    const r = roles.find((x) => x.name === name);
    if (!r) throw new Error(`Seed role not found: ${name}`);
    return r;
  };

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      passwordHash: hash,
      firstName: 'Admin',
      lastName: 'User',
      status: 'active',
      branchId: branch1.id,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: getRoleByName('Founder').id } },
    update: {},
    create: { userId: admin.id, roleId: getRoleByName('Founder').id },
  });

  const recruiter = await prisma.user.upsert({
    where: { email: 'recruiter@test.com' },
    update: {},
    create: {
      email: 'recruiter@test.com',
      passwordHash: hash,
      firstName: 'Anna',
      lastName: 'Recruiter',
      status: 'active',
      branchId: branch1.id,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: recruiter.id, roleId: getRoleByName('Manager').id } },
    update: {},
    create: { userId: recruiter.id, roleId: getRoleByName('Manager').id },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@test.com' },
    update: {},
    create: {
      email: 'accountant@test.com',
      passwordHash: hash,
      firstName: 'Alex',
      lastName: 'Accountant',
      status: 'active',
      branchId: branch1.id,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: accountant.id, roleId: getRoleByName('Accountant').id } },
    update: {},
    create: { userId: accountant.id, roleId: getRoleByName('Accountant').id },
  });

  const partner = await prisma.user.upsert({
    where: { email: 'partner@test.com' },
    update: {},
    create: {
      email: 'partner@test.com',
      passwordHash: hash,
      firstName: 'Olga',
      lastName: 'Partner',
      status: 'active',
      branchId: branch1.id,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: partner.id, roleId: getRoleByName('Partner').id } },
    update: {},
    create: { userId: partner.id, roleId: getRoleByName('Partner').id },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      passwordHash: hash,
      firstName: 'Customer',
      lastName: 'User',
      status: 'active',
      branchId: branch2.id,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: customer.id, roleId: getRoleByName('Customer').id } },
    update: {},
    create: { userId: customer.id, roleId: getRoleByName('Customer').id },
  });

  const sources = await Promise.all(
    [
      { name: 'Website', code: 'website' },
      { name: 'Telegram', code: 'telegram' },
      { name: 'Instagram', code: 'instagram' },
      { name: 'Phone', code: 'phone' },
      { name: 'From friends', code: 'friends' },
      { name: 'TikTok', code: 'tiktok' },
    ].map((s) =>
      prisma.leadSource.upsert({
        where: { code: s.code },
        update: {},
        create: s,
      }),
    ),
  );

  await Promise.all(
    [
      { name: 'Nursing', code: 'nursing', order: 1 },
      { name: 'Care', code: 'care', order: 2 },
      { name: 'IT', code: 'it', order: 3 },
    ].map((p) =>
      prisma.program.upsert({
        where: { code: p.code },
        update: {},
        create: p,
      }),
    ),
  );

  const docTypes = [
    { code: 'passport', name: 'Паспорт', order: 1 },
    { code: 'contract', name: 'Договор', order: 2 },
    { code: 'cv', name: 'Резюме', order: 3 },
    { code: 'profile', name: 'Профиль', order: 4 },
    { code: 'visa', name: 'Визовые', order: 5 },
    { code: 'employer_contract', name: 'Договор с работодателем', order: 6 },
  ];
  for (const row of docTypes) {
    await prisma.countryDocumentType.upsert({
      where: { countryId_code: { countryId: country1.id, code: row.code } },
      update: {},
      create: { countryId: country1.id, ...row },
    });
    await prisma.countryDocumentType.upsert({
      where: { countryId_code: { countryId: country2.id, code: row.code } },
      update: {},
      create: { countryId: country2.id, ...row },
    });
  }

  const statusIds: string[] = [];
  for (const [i, s] of [
    { name: 'New lead', code: 'new', order: 1 },
    { name: 'Contacted', code: 'contacted', order: 2 },
    { name: 'Consultation scheduled', code: 'consultation', order: 3 },
    { name: 'Passed filter', code: 'passed_filter', order: 4 },
    { name: 'Rejected', code: 'rejected', order: 5 },
    { name: 'Converted to candidate', code: 'converted', order: 6 },
  ].entries()) {
    const st = await prisma.leadStatus.upsert({
      where: { id: `seed-status-${i + 1}` },
      update: {},
      create: { id: `seed-status-${i + 1}`, ...s },
    });
    statusIds.push(st.id);
  }
  const statuses = await prisma.leadStatus.findMany({ where: { id: { in: statusIds } }, orderBy: { order: 'asc' } });

  if ((await prisma.lead.count()) > 0) {
    console.log('Leads/candidates already exist, skipping creation.');
  } else {
  const lead1 = await prisma.lead.create({
    data: {
      firstName: 'Maria',
      lastName: 'Kowalski',
      phone: '+48123456789',
      email: 'maria@example.com',
      sourceId: sources[0].id,
      statusId: statuses[0].id,
      branchId: branch1.id,
      assignedManagerId: recruiter.id,
      notes: 'From website form',
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      firstName: 'Hans',
      lastName: 'Mueller',
      phone: '+49123456789',
      email: 'hans@example.com',
      sourceId: sources[1].id,
      statusId: statuses[1].id,
      branchId: branch1.id,
      assignedManagerId: recruiter.id,
    },
  });

  const candidate1 = await prisma.candidate.create({
    data: {
      candidateCode: 'CAND-001',
      firstName: 'Maria',
      lastName: 'Kowalski',
      phone: '+48123456789',
      email: 'maria@example.com',
      countryId: country1.id,
      languageLevel: 'B1',
      programType: 'Nursing',
      managerId: recruiter.id,
      branchId: branch1.id,
      leadId: lead1.id,
      leadSourceId: sources[0].id,
      paymentStatus: 'partial',
      pipelineStage: 'candidates',
    },
  });

  await prisma.candidate.create({
    data: {
      candidateCode: 'CAND-002',
      firstName: 'Jan',
      lastName: 'Nowak',
      phone: '+48987654321',
      email: 'jan@example.com',
      countryId: country2.id,
      languageLevel: 'A2',
      programType: 'Care',
      managerId: recruiter.id,
      branchId: branch2.id,
      paymentStatus: 'none',
      pipelineStage: 'leads',
    },
  });

  await prisma.candidate.create({
    data: {
      candidateCode: 'CAND-003',
      firstName: 'Elena',
      lastName: 'Petrova',
      phone: '+79991234567',
      email: 'elena@example.com',
      countryId: country1.id,
      languageLevel: 'B2',
      programType: 'Nursing',
      managerId: recruiter.id,
      branchId: branch1.id,
      paymentStatus: 'paid',
      pipelineStage: 'visa_prep',
    },
  });

  const employer = await prisma.employer.create({
    data: {
      name: 'Care Plus GmbH',
      countryId: country1.id,
      email: 'hr@careplus.de',
      contact: 'HR Department',
    },
  });

  await prisma.vacancy.create({
    data: {
      title: 'Senior Care Worker',
      employerId: employer.id,
      countryId: country1.id,
      salary: '2500-3000 EUR',
      openPositions: 5,
      status: 'open',
      requirements: 'B1 German, 1+ year experience',
    },
  });

  await prisma.vacancy.create({
    data: {
      title: 'Nurse Assistant',
      employerId: employer.id,
      countryId: country1.id,
      salary: '2800 EUR',
      openPositions: 3,
      status: 'open',
    },
  });

  const embassyCount = await prisma.embassy.count();
  if (embassyCount === 0) {
    await prisma.embassy.createMany({
      data: [
        { name: 'German Embassy', country: 'Kyrgyzstan', city: 'Bishkek', address: '' },
        { name: 'German Embassy', country: 'Kazakhstan', city: 'Almaty', address: '' },
        { name: 'German Embassy', country: 'Uzbekistan', city: 'Tashkent', address: '' },
      ],
    });
  }
  }

  console.log('Seed done: org, countries, branches, roles, users, leads, candidates, employer, vacancies, embassies.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

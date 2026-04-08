import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // --------------------------------------------------------------------------
  // 1. Create Organizations (4-org consortium)
  // --------------------------------------------------------------------------
  const govOrg = await prisma.organization.upsert({
    where: { orgId: 'org-gov-001' },
    update: {},
    create: {
      orgId: 'org-gov-001',
      name: 'Ministry of Trade & Industry',
      nameAr: 'وزارة التجارة والصناعة',
      type: 'GOVERNMENT',
      mspId: 'Org1MSP',
      contactEmail: 'admin@mti.gov.eg',
      contactPerson: 'Platform Administrator',
      address: 'Cairo, Egypt',
      city: 'Cairo',
      country: 'Egypt',
      active: true,
    },
  });

  const trainingOrg = await prisma.organization.upsert({
    where: { orgId: 'org-issuer-001' },
    update: {},
    create: {
      orgId: 'org-issuer-001',
      name: 'MSMEDA Training Center',
      nameAr: 'مركز تدريب جهاز تنمية المشروعات',
      type: 'TRAINING_PROVIDER',
      mspId: 'Org2MSP',
      contactEmail: 'issuer@msmeda.gov.eg',
      contactPerson: 'Training Director',
      address: 'Alexandria, Egypt',
      city: 'Alexandria',
      country: 'Egypt',
      active: true,
    },
  });

  const auditOrg = await prisma.organization.upsert({
    where: { orgId: 'org-auditor-001' },
    update: {},
    create: {
      orgId: 'org-auditor-001',
      name: 'National Quality Assurance',
      nameAr: 'الهيئة الوطنية لضمان الجودة',
      type: 'AUDITOR',
      mspId: 'Org3MSP',
      contactEmail: 'verifier@auditor.com',
      contactPerson: 'Lead Auditor',
      address: 'Cairo, Egypt',
      city: 'Cairo',
      country: 'Egypt',
      active: true,
    },
  });

  const smeOrg = await prisma.organization.upsert({
    where: { orgId: 'org-sme-001' },
    update: {},
    create: {
      orgId: 'org-sme-001',
      name: 'Al-Nour Manufacturing Co.',
      nameAr: 'شركة النور للصناعة',
      type: 'SME',
      mspId: 'Org4MSP',
      contactEmail: 'sme@example.com',
      contactPerson: 'Mohamed Ali',
      address: 'Alexandria, Egypt',
      city: 'Alexandria',
      country: 'Egypt',
      active: true,
    },
  });

  console.log('✅ Organizations created');

  // --------------------------------------------------------------------------
  // 2. Create Demo Users
  // --------------------------------------------------------------------------
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const demoHash = await bcrypt.hash('Demo123!', 12);

  // Platform Admin
  await prisma.user.upsert({
    where: { email: 'admin@platform.local' },
    update: {},
    create: {
      email: 'admin@platform.local',
      passwordHash: adminHash,
      firstName: 'Platform',
      lastName: 'Administrator',
      role: 'PLATFORM_ADMIN',
      status: 'ACTIVE',
      organizationId: govOrg.id,
      locale: 'en',
    },
  });

  // Issuer Admin
  await prisma.user.upsert({
    where: { email: 'issuer@msmeda.gov.eg' },
    update: {},
    create: {
      email: 'issuer@msmeda.gov.eg',
      passwordHash: demoHash,
      firstName: 'Issuer',
      lastName: 'Admin',
      role: 'ISSUER_ADMIN',
      status: 'ACTIVE',
      organizationId: trainingOrg.id,
      locale: 'en',
    },
  });

  // SME Holder
  await prisma.user.upsert({
    where: { email: 'sme@example.com' },
    update: {},
    create: {
      email: 'sme@example.com',
      passwordHash: demoHash,
      firstName: 'Mohamed',
      lastName: 'Ali',
      role: 'SME_USER',
      status: 'ACTIVE',
      organizationId: smeOrg.id,
      locale: 'en',
    },
  });

  // Verifier
  await prisma.user.upsert({
    where: { email: 'verifier@auditor.com' },
    update: {},
    create: {
      email: 'verifier@auditor.com',
      passwordHash: demoHash,
      firstName: 'Audit',
      lastName: 'Verifier',
      role: 'VERIFIER_USER',
      status: 'ACTIVE',
      organizationId: auditOrg.id,
      locale: 'en',
    },
  });

  console.log('✅ Demo users created');
  console.log('');
  console.log('📋 Demo Credentials:');
  console.log('  ┌─────────────────────────┬─────────────┬────────────────┐');
  console.log('  │ Email                   │ Password    │ Role           │');
  console.log('  ├─────────────────────────┼─────────────┼────────────────┤');
  console.log('  │ admin@platform.local    │ Admin123!   │ PLATFORM_ADMIN │');
  console.log('  │ issuer@msmeda.gov.eg    │ Demo123!    │ ISSUER_ADMIN   │');
  console.log('  │ sme@example.com         │ Demo123!    │ SME_USER       │');
  console.log('  │ verifier@auditor.com    │ Demo123!    │ VERIFIER_USER  │');
  console.log('  └─────────────────────────┴─────────────┴────────────────┘');
  console.log('');
  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

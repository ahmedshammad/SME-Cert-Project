import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const [totalCertificates, activeCertificates, totalVerifications, totalUsers] = await Promise.all([
      this.prisma.certificate.count(),
      this.prisma.certificate.count({ where: { status: 'ISSUED' } }),
      this.prisma.verification.count(),
      this.prisma.user.count(),
    ]);

    return { totalCertificates, activeCertificates, totalVerifications, totalUsers };
  }

  async getIssuanceMetrics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const dailyMetrics = await this.prisma.dailyMetrics.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'asc' },
    });

    return {
      issuanceTrend: dailyMetrics.map((m) => ({
        date: m.date.toISOString().split('T')[0],
        count: m.certificatesIssued,
      })),
      verificationTrend: dailyMetrics.map((m) => ({
        date: m.date.toISOString().split('T')[0],
        count: m.verificationsPerformed,
      })),
    };
  }

  async getVerificationMetrics() {
    const recentVerifications = await this.prisma.verification.findMany({
      include: { certificate: { select: { id: true, holderName: true } } },
      orderBy: { verifiedAt: 'desc' },
      take: 50,
    });

    return {
      recentVerifications: recentVerifications.map((v) => ({
        id: v.id,
        certificateId: v.certificateId,
        status: v.status,
        verifiedAt: v.verifiedAt,
        holderName: v.certificate?.holderName,
      })),
    };
  }
}

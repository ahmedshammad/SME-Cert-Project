import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  FileText, CheckCircle2, XCircle, Clock, TrendingUp, Activity,
  Plus, Layers, ShieldOff, FileUp, ArrowUpRight, ArrowDownRight, Minus,
  CreditCard, Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { certificateApi } from '@/services/api/certificates';
import { metricsApi } from '@/services/api/metrics';
import { LineChart } from '@/components/charts/LineChart';
import { RecentActivity } from '@/components/issuer/RecentActivity';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// ── Plan config (would come from billing API in production) ──────────────────
const PLAN = { name: 'Business', limit: 500 };

function getTrendIcon(change: string) {
  if (change.startsWith('+')) return <ArrowUpRight className="h-3 w-3 text-green-500" />;
  if (change.startsWith('-')) return <ArrowDownRight className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function getTrendColor(change: string) {
  if (change.startsWith('+')) return 'text-green-600';
  if (change.startsWith('-')) return 'text-red-600';
  return 'text-muted-foreground';
}

export function IssuerDashboard() {
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['issuer-stats'],
    queryFn: () => certificateApi.getIssuerStats(),
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['issuer-metrics'],
    queryFn: () => metricsApi.getIssuanceMetrics(),
  });

  const { data: recentCerts, isLoading: certsLoading } = useQuery({
    queryKey: ['recent-certificates'],
    queryFn: () => certificateApi.getRecentCertificates({ limit: 10 }),
  });

  const statCards = [
    {
      title: t('dashboard.total_issued'),
      value: stats?.totalIssued || 0,
      change: '+12%',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: t('dashboard.active_certs'),
      value: stats?.activeCertificates || 0,
      change: '+5%',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: t('dashboard.revoked'),
      value: stats?.revokedCertificates || 0,
      change: '-2%',
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: t('dashboard.expiring_soon'),
      value: stats?.expiringSoon || 0,
      change: '',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  // Derive audit log from recent certificates
  type AuditEntry = { action: string; subject: string; time: string; type: 'issue' | 'revoke' | 'verify' };
  const auditLog: AuditEntry[] = ((recentCerts || []) as Array<{
    holderName?: string;
    status?: string;
    issuedAt?: string;
    revokedAt?: string;
  }>)
    .slice(0, 5)
    .map((c) => ({
      action: c.status === 'REVOKED' ? 'Certificate revoked' : 'Certificate issued',
      subject: c.holderName || 'Unknown Holder',
      time: (c.revokedAt || c.issuedAt)
        ? new Date((c.revokedAt || c.issuedAt) as string).toLocaleString()
        : '—',
      type: (c.status === 'REVOKED' ? 'revoke' : 'issue') as AuditEntry['type'],
    }));

  // Monthly usage
  const monthlyIssued = stats?.totalIssued || 0;
  const usagePct = Math.min(100, Math.round((monthlyIssued / PLAN.limit) * 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('issuer.dashboard.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('issuer.dashboard.subtitle')}</p>
        </div>
        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/issuer/templates">
            <Button variant="outline" size="sm">
              <Layers className="mr-1.5 h-4 w-4" />
              Templates
            </Button>
          </Link>
          <Link to="/issuer/bulk-issue">
            <Button variant="outline" size="sm">
              <FileUp className="mr-1.5 h-4 w-4" />
              Bulk Issue
            </Button>
          </Link>
          <Link to="/issuer/revoke">
            <Button variant="outline" size="sm">
              <ShieldOff className="mr-1.5 h-4 w-4" />
              Revoke
            </Button>
          </Link>
          <Link to="/issuer/issue">
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              {t('issuer.issue_certificate')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading
                  ? <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  : stat.value.toLocaleString()}
              </div>
              {stat.change && (
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(stat.change)}
                  <p className={cn('text-xs font-medium', getTrendColor(stat.change))}>
                    {stat.change}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.from_last_month')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Billing & Usage + Audit Log */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Plan & Usage */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-egypt-gold" />
                Plan &amp; Usage
              </CardTitle>
              <Badge variant="gold" className="text-xs">
                {PLAN.name} Plan
              </Badge>
            </div>
            <CardDescription>Monthly certificate issuance against your plan limit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium">
                  {statsLoading ? '—' : monthlyIssued.toLocaleString()} issued
                </span>
                <span className="text-muted-foreground">
                  {PLAN.limit.toLocaleString()} limit
                </span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${usagePct}%`,
                    background:
                      usagePct >= 90
                        ? 'linear-gradient(90deg,#EF4444,#B91C1C)'
                        : usagePct >= 70
                        ? 'linear-gradient(90deg,#F59E0B,#D97706)'
                        : 'linear-gradient(90deg,#C5A23D,#009B4D)',
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {statsLoading ? '—' : `${usagePct}% used · ${Math.max(0, PLAN.limit - monthlyIssued).toLocaleString()} remaining`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'User Accounts', value: '10' },
                { label: 'Storage',       value: '25 GB' },
                { label: 'Support',       value: 'Priority' },
                { label: 'API Access',    value: 'Enabled' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col p-2.5 bg-muted/40 rounded-lg">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="font-medium mt-0.5">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Link to="/pricing" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">View Plans</Button>
              </Link>
              <Link to="/contact" className="flex-1">
                <Button size="sm" className="w-full bg-egypt-navy hover:bg-egypt-navy/90">Upgrade</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-egypt-navy" />
                Recent Audit Events
              </CardTitle>
              <Badge variant="navy" className="text-xs">Live</Badge>
            </div>
            <CardDescription>Last 5 certificate actions in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            {certsLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading audit log…</div>
            ) : auditLog.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No recent activity</div>
            ) : (
              <div className="space-y-2">
                {auditLog.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                        entry.type === 'revoke' ? 'bg-red-50' : 'bg-green-50'
                      )}
                    >
                      {entry.type === 'revoke'
                        ? <XCircle className="h-3.5 w-3.5 text-red-500" />
                        : <FileText className="h-3.5 w-3.5 text-green-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.action}</p>
                      <p className="text-xs text-muted-foreground truncate">{entry.subject}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                      {entry.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('issuer.dashboard.issuance_trend')}
            </CardTitle>
            <CardDescription>{t('issuer.dashboard.last_30_days')}</CardDescription>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                {t('common.loading')}
              </div>
            ) : (
              <LineChart data={metrics?.issuanceTrend || []} xKey="date" yKey="count" height={300} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('issuer.dashboard.verification_activity')}
            </CardTitle>
            <CardDescription>{t('issuer.dashboard.verification_requests')}</CardDescription>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                {t('common.loading')}
              </div>
            ) : (
              <LineChart data={metrics?.verificationTrend || []} xKey="date" yKey="count" height={300} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t('issuer.dashboard.recent_activity')}</CardTitle>
          <CardDescription>{t('issuer.dashboard.recent_certificates')}</CardDescription>
        </CardHeader>
        <CardContent>
          {certsLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              {t('common.loading')}
            </div>
          ) : (
            <RecentActivity certificates={recentCerts || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, UserCheck, FileText, Shield, CheckCircle,
  ArrowRight, ArrowLeft, Users, Eye, Lock, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProgressSteps } from '@/components/ui/progress';
import { SectionHeading } from '@/components/shared/SectionHeading';

const steps = ['Eligibility', 'Organization', 'Admin Setup', 'Documents', 'Review'];

const roles = [
  { icon: Shield, name: 'Super Admin', desc: 'Full platform access, organization management, user administration.' },
  { icon: Settings, name: 'Issuer Admin', desc: 'Manage templates, issue and revoke certificates, view analytics.' },
  { icon: UserCheck, name: 'Issuer Operator', desc: 'Issue certificates using approved templates, view holder data.' },
  { icon: Eye, name: 'Verifier', desc: 'Access verification tools, view verification history and reports.' },
  { icon: Lock, name: 'Auditor', desc: 'Read-only access to audit logs, compliance reports, and analytics.' },
];

export function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [orgForm, setOrgForm] = useState({ name: '', nameAr: '', regNumber: '', sector: '', email: '', contactPerson: '', city: '', country: 'Egypt' });
  const [adminForm, setAdminForm] = useState({ firstName: '', lastName: '', email: '', password: '' });

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 0));

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero-subtle py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="gold" className="mb-4">Join the Network</Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Organization Onboarding</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Register your organization to start issuing blockchain-verified certificates.
          </p>
        </div>
      </section>

      {/* Progress */}
      <div className="border-b py-6 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          <ProgressSteps steps={steps} currentStep={currentStep} />
        </div>
      </div>

      {/* Step Content */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-2xl">

          {/* Step 0: Eligibility */}
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-egypt-green" />
                  Eligibility Check
                </CardTitle>
                <CardDescription>Confirm your organization meets the requirements to join the network.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    'Your organization is a registered legal entity in Egypt',
                    'You have a valid commercial registration or trade license',
                    'You have authority to register on behalf of the organization',
                    'You agree to the platform terms of service and data policy',
                  ].map((req, i) => (
                    <label key={i} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors">
                      <input type="checkbox" className="mt-0.5 accent-egypt-green" onChange={() => setEligible(true)} />
                      <span className="text-sm">{req}</span>
                    </label>
                  ))}
                </div>
                <Button onClick={nextStep} className="w-full" disabled={!eligible}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Organization Info */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-egypt-navy" />
                  Organization Information
                </CardTitle>
                <CardDescription>Provide details about your organization.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Organization Name (English)" placeholder="ABC Corp" value={orgForm.name} onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))} required />
                  <Input label="Organization Name (Arabic)" placeholder="Optional" value={orgForm.nameAr} onChange={e => setOrgForm(f => ({ ...f, nameAr: e.target.value }))} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Registration Number" placeholder="CR-XXXXX" value={orgForm.regNumber} onChange={e => setOrgForm(f => ({ ...f, regNumber: e.target.value }))} required />
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Sector</label>
                    <select value={orgForm.sector} onChange={e => setOrgForm(f => ({ ...f, sector: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Select sector</option>
                      <option value="education">Education & Training</option>
                      <option value="government">Government</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="finance">Finance & Banking</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="technology">Technology</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Contact Email" type="email" placeholder="admin@org.com" value={orgForm.email} onChange={e => setOrgForm(f => ({ ...f, email: e.target.value }))} required />
                  <Input label="Contact Person" placeholder="Full name" value={orgForm.contactPerson} onChange={e => setOrgForm(f => ({ ...f, contactPerson: e.target.value }))} required />
                </div>
                <Input label="City" placeholder="e.g. Alexandria" value={orgForm.city} onChange={e => setOrgForm(f => ({ ...f, city: e.target.value }))} />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  <Button onClick={nextStep} className="flex-1">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Admin Setup */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-egypt-navy" />
                  Administrator Account
                </CardTitle>
                <CardDescription>Create the initial admin user for your organization.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="First Name" placeholder="First name" value={adminForm.firstName} onChange={e => setAdminForm(f => ({ ...f, firstName: e.target.value }))} required />
                  <Input label="Last Name" placeholder="Last name" value={adminForm.lastName} onChange={e => setAdminForm(f => ({ ...f, lastName: e.target.value }))} required />
                </div>
                <Input label="Admin Email" type="email" placeholder="admin@yourorg.com" value={adminForm.email} onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))} required />
                <Input label="Password" type="password" placeholder="Minimum 8 characters" value={adminForm.password} onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))} required />
                {adminForm.password && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${adminForm.password.length >= i * 3 ? (i <= 2 ? 'bg-warning' : 'bg-egypt-green') : 'bg-muted'}`} />
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  <Button onClick={nextStep} className="flex-1">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Documents */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-egypt-navy" />
                  Verification Documents
                </CardTitle>
                <CardDescription>Upload required documents for organization verification.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {['Commercial Registration / Trade License', 'Tax Card (optional)', 'Authorization Letter'].map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc}</p>
                        <p className="text-xs text-muted-foreground">PDF, JPG, or PNG (max 5MB)</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Upload</Button>
                  </div>
                ))}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  <Button onClick={nextStep} className="flex-1">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-egypt-green" />
                  Review & Submit
                </CardTitle>
                <CardDescription>Review your information before submitting.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="text-sm font-semibold mb-2">Organization</h4>
                    <p className="text-sm text-muted-foreground">{orgForm.name || 'Not provided'}</p>
                    <p className="text-sm text-muted-foreground">{orgForm.email} | {orgForm.city}, {orgForm.country}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="text-sm font-semibold mb-2">Administrator</h4>
                    <p className="text-sm text-muted-foreground">{adminForm.firstName} {adminForm.lastName}</p>
                    <p className="text-sm text-muted-foreground">{adminForm.email}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                  <Link to="/register" className="flex-1">
                    <Button className="w-full bg-egypt-green hover:bg-egypt-green/90">
                      Submit Application <CheckCircle className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <SectionHeading
            title="Platform Roles"
            subtitle="Each role has specific permissions and responsibilities within the platform."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl border bg-white">
                <div className="w-9 h-9 bg-egypt-navy/10 rounded-lg flex items-center justify-center shrink-0">
                  <role.icon className="h-4 w-4 text-egypt-navy" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{role.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{role.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

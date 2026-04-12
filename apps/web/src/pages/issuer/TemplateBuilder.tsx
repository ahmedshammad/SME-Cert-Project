import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Plus, FileText, Eye, GraduationCap, Scroll, Briefcase,
  ShieldCheck, Building2, Copy, CheckCircle2, X, Loader2,
  AlertCircle, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { certificateApi } from '@/services/api/certificates';
import { cn } from '@/lib/utils';

type PrebuiltTemplate = {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  icon: typeof GraduationCap;
  color: string;
  bg: string;
  fields: string[];
  category: string;
};

const prebuiltTemplates: PrebuiltTemplate[] = [
  {
    id: 'prebuilt-academic',
    name: 'Academic Completion Certificate',
    nameAr: 'شهادة إتمام أكاديمي',
    description: 'For universities, training centers, and educational institutions certifying course or program completion.',
    icon: GraduationCap,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    category: 'Education',
    fields: ['studentName', 'courseName', 'courseNameAr', 'institution', 'completionDate', 'grade', 'creditHours', 'instructorName', 'programType'],
  },
  {
    id: 'prebuilt-transcript',
    name: 'Academic Transcript',
    nameAr: 'كشف درجات أكاديمي',
    description: 'Official academic record showing courses, grades, and cumulative GPA for a student.',
    icon: Scroll,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    category: 'Education',
    fields: ['studentName', 'studentId', 'department', 'faculty', 'semester', 'academicYear', 'gpa', 'totalCredits', 'degreeType', 'enrollmentDate'],
  },
  {
    id: 'prebuilt-corporate',
    name: 'Corporate Training Certificate',
    nameAr: 'شهادة تدريب مؤسسي',
    description: 'For companies and organizations certifying employee completion of training programs or workshops.',
    icon: Briefcase,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    category: 'Corporate',
    fields: ['employeeName', 'employeeId', 'trainingProgram', 'department', 'completionDate', 'duration', 'trainer', 'competencyLevel', 'validUntil'],
  },
  {
    id: 'prebuilt-compliance',
    name: 'Professional Compliance Certificate',
    nameAr: 'شهادة امتثال مهني',
    description: 'For regulatory bodies and professional associations certifying compliance with industry standards.',
    icon: ShieldCheck,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    category: 'Compliance',
    fields: ['holderName', 'licenseNumber', 'complianceStandard', 'issuingAuthority', 'issueDate', 'expiryDate', 'scope', 'auditResult', 'certificationLevel'],
  },
  {
    id: 'prebuilt-membership',
    name: 'Business Membership Certificate',
    nameAr: 'شهادة عضوية تجارية',
    description: 'For chambers of commerce, trade associations, and business networks certifying active membership.',
    icon: Building2,
    color: 'text-egypt-navy',
    bg: 'bg-slate-50 border-slate-200',
    category: 'Business',
    fields: ['organizationName', 'registrationNumber', 'membershipType', 'chamberName', 'joinDate', 'expiryDate', 'sector', 'membershipTier', 'representativeName'],
  },
];

export function TemplateBuilder() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', nameAr: '', description: '', fields: '' });
  const [previewTemplate, setPreviewTemplate] = useState<PrebuiltTemplate | null>(null);
  const [clonedNotice, setClonedNotice] = useState('');
  const [createError, setCreateError] = useState('');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => certificateApi.getTemplates(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => certificateApi.createTemplate(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setShowForm(false);
      setForm({ name: '', nameAr: '', description: '', fields: '' });
      setCreateError('');
      // Show notice with the template name from the submitted payload
      const name = String(variables.name || 'Template');
      setClonedNotice(name);
      setTimeout(() => setClonedNotice(''), 3000);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create template';
      setCreateError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => certificateApi.publishTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    createMutation.mutate({
      name: form.name,
      nameAr: form.nameAr,
      description: form.description,
      schema: { fields: form.fields.split(',').map((f) => f.trim()).filter(Boolean) },
    });
  };

  const usePrebuiltTemplate = (template: PrebuiltTemplate) => {
    setCreateError('');
    createMutation.mutate({
      name: template.name,
      nameAr: template.nameAr,
      description: template.description,
      schema: { fields: template.fields },
    });
  };

  const cloneToForm = (template: PrebuiltTemplate) => {
    setForm({
      name: template.name,
      nameAr: template.nameAr,
      description: template.description,
      fields: template.fields.join(', '),
    });
    setShowForm(true);
    setPreviewTemplate(null);
    setCreateError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('issuer.templates')}</h1>
          <p className="text-muted-foreground mt-1">Create and manage certificate templates</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Custom Template
        </Button>
      </div>

      {/* Success notice */}
      {clonedNotice && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-800">
              Template "{clonedNotice}" created successfully! You can now publish it to the blockchain below.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error notice */}
      {createError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{createError}</p>
          </CardContent>
        </Card>
      )}

      {/* Custom Template Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Custom Template</CardTitle>
            <CardDescription>Define a new certificate template from scratch</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Template Name (English)</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Template Name (Arabic)</label>
                  <input
                    value={form.nameAr}
                    onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fields (comma-separated)</label>
                <input
                  value={form.fields}
                  onChange={(e) => setForm({ ...form, fields: e.target.value })}
                  placeholder="e.g. courseName, completionDate, grade, instructor"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : 'Create Template'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Prebuilt Templates Section */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Prebuilt Templates</h2>
        <p className="text-sm text-muted-foreground mb-4">Professional templates ready to use. Click "Use Template" to add it to your collection, or "Customize" to edit before creating.</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {prebuiltTemplates.map((pt) => (
            <Card key={pt.id} className={cn('hover:shadow-md transition-shadow', previewTemplate?.id === pt.id && 'ring-2 ring-primary')}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', pt.bg)}>
                    <pt.icon className={cn('h-5 w-5', pt.color)} />
                  </div>
                  <Badge variant="outline" className="text-xs">{pt.category}</Badge>
                </div>
                <CardTitle className="text-base mt-2">{pt.name}</CardTitle>
                <CardDescription className="text-xs">{pt.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{pt.fields.length} fields:</p>
                  <div className="flex flex-wrap gap-1">
                    {pt.fields.slice(0, 5).map((field) => (
                      <span key={field} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {field}
                      </span>
                    ))}
                    {pt.fields.length > 5 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        +{pt.fields.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => usePrebuiltTemplate(pt)}
                    disabled={createMutation.isPending}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Use Template
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => cloneToForm(pt)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Customize
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs px-2"
                    onClick={() => setPreviewTemplate(previewTemplate?.id === pt.id ? null : pt)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Preview Panel */}
      {previewTemplate && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Template Preview: {previewTemplate.name}
              </CardTitle>
              <button onClick={() => setPreviewTemplate(null)} className="p-1 hover:bg-muted rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
            <CardDescription>{previewTemplate.nameAr}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{previewTemplate.description}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Certificate Fields</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {previewTemplate.fields.map((field, i) => (
                    <div key={field} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <span className="text-sm font-mono">{field}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">Sample Certificate Preview</p>
                <div className="p-4 border-2 border-dashed rounded-lg bg-white">
                  <div className="text-center space-y-2">
                    <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mx-auto', previewTemplate.bg)}>
                      <previewTemplate.icon className={cn('h-6 w-6', previewTemplate.color)} />
                    </div>
                    <h3 className="font-bold text-lg">{previewTemplate.name}</h3>
                    <p className="text-sm text-muted-foreground" dir="rtl">{previewTemplate.nameAr}</p>
                    <div className="border-t pt-3 mt-3">
                      <p className="text-xs text-muted-foreground">This certifies that</p>
                      <p className="text-base font-semibold text-primary">[Holder Name]</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-left mt-4 max-w-sm mx-auto">
                      {previewTemplate.fields.slice(0, 4).map((field) => (
                        <div key={field} className="text-xs">
                          <span className="text-muted-foreground">{field}:</span>
                          <span className="ml-1 text-foreground/50">[value]</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Templates */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Your Templates</h2>
        <p className="text-sm text-muted-foreground mb-4">Templates you've created or added from prebuilt options</p>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            {t('common.loading')}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(templates || []).map((template: { id: string; name: string; nameAr?: string; description?: string; status?: string; jsonSchema?: any; _count?: { certificates: number } }) => (
              <Card key={template.id} className={cn(expandedTemplateId === template.id && 'ring-2 ring-primary/40')}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <FileText className="h-8 w-8 text-primary" />
                    <Badge
                      className={cn(
                        'text-xs',
                        template.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' :
                        'bg-muted text-muted-foreground'
                      )}
                    >
                      {template.status || 'DRAFT'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{template.name}</CardTitle>
                  {template.nameAr && <p className="text-xs text-muted-foreground" dir="rtl">{template.nameAr}</p>}
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{template._count?.certificates || 0} certificates issued</span>
                  </div>

                  {/* Expanded field view */}
                  {expandedTemplateId === template.id && template.jsonSchema?.fields && (
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <p className="text-xs font-medium mb-2">Fields ({template.jsonSchema.fields.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {template.jsonSchema.fields.map((f: string) => (
                          <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-background border text-muted-foreground">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-1.5 pt-1">
                    {/* Eye toggle */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setExpandedTemplateId(expandedTemplateId === template.id ? null : template.id)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {expandedTemplateId === template.id ? 'Hide' : 'Fields'}
                    </Button>

                    {/* Publish button — only shown when not yet ACTIVE */}
                    {template.status !== 'ACTIVE' && (
                      <Button
                        size="sm"
                        className="text-xs flex-1"
                        disabled={publishMutation.isPending}
                        onClick={() => publishMutation.mutate(template.id)}
                      >
                        {publishMutation.isPending ? (
                          <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Publishing...</>
                        ) : (
                          <><Send className="h-3 w-3 mr-1" />Publish</>
                        )}
                      </Button>
                    )}
                    {template.status === 'ACTIVE' && (
                      <span className="flex-1 flex items-center justify-center gap-1 text-xs text-green-700 font-medium">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!templates || templates.length === 0) && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No templates yet. Use a prebuilt template above or create a custom one.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

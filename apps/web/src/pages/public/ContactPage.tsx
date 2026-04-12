import { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Building2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const interestTypes = [
  'General Inquiry',
  'Request Demo',
  'Pricing Information',
  'Technical Support',
  'Partnership',
] as const;

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', organization: '', interest: 'General Inquiry', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          organization: form.organization || undefined,
          interest: form.interest,
          message: form.message,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Server error (${res.status})`);
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero-subtle py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="navy" className="mb-4">Get in Touch</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Contact Us</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions about the platform? Want to see a demo? We're here to help.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Get in Touch</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-egypt-navy/10 rounded-lg flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-egypt-navy" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Email</p>
                    <a href="mailto:ahmeds_hammad@hotmail.com" className="text-sm text-muted-foreground hover:text-primary transition-colors">ahmeds_hammad@hotmail.com</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-egypt-navy/10 rounded-lg flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-egypt-navy" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Phone</p>
                    <a href="tel:+2001273715537" className="text-sm text-muted-foreground hover:text-primary transition-colors">+20 127 371 5537</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-egypt-navy/10 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-egypt-navy" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Address</p>
                    <p className="text-sm text-muted-foreground">
                      Faculty of Business<br />
                      Alexandria University<br />
                      Alexandria, Egypt
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <a href="/pricing" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Building2 className="h-4 w-4" /> View Pricing Plans
                  </a>
                  <a href="/docs" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <MessageSquare className="h-4 w-4" /> Read Documentation
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Send Us a Message</CardTitle>
                  <CardDescription>Fill out the form and we'll get back to you within 24 hours.</CardDescription>
                </CardHeader>
                <CardContent>
                  {submitted ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-egypt-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="h-8 w-8 text-egypt-green" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Message Sent!</h3>
                      <p className="text-muted-foreground">
                        Thank you for reaching out. We'll get back to you within 24 hours.
                      </p>
                      <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setForm({ name: '', email: '', organization: '', interest: 'General Inquiry', message: '' }); }}>
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {error && (
                        <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Input
                          label="Full Name"
                          placeholder="Your name"
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          required
                        />
                        <Input
                          label="Email"
                          type="email"
                          placeholder="your@email.com"
                          value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          required
                        />
                      </div>
                      <Input
                        label="Organization (optional)"
                        placeholder="Your organization name"
                        value={form.organization}
                        onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
                      />
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Interest</label>
                        <select
                          value={form.interest}
                          onChange={e => setForm(f => ({ ...f, interest: e.target.value }))}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {interestTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Message</label>
                        <textarea
                          value={form.message}
                          onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                          placeholder="How can we help you?"
                          rows={4}
                          required
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        />
                      </div>
                      <Button type="submit" size="lg" className="w-full" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Message'}
                        <Send className="ml-2 h-4 w-4" />
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

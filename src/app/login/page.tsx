'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { PracticeNotice } from '@/components/practice-notice';
import { Wordmark, BrandLine } from '@/components/brand';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClientBrowser();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        toast.error(authError.message || 'Login failed');
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error('Login failed');
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*, role:roles(*)')
        .eq('id', authData.user.id)
        .single();

      toast.success('Login successful');

      const roleName = userData?.role?.name;
      switch (roleName) {
        case 'assessor':
          router.push('/assessor');
          break;
        case 'candidate':
          router.push('/candidate');
          break;
        default:
          router.push('/admin');
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'Super Admin', email: 'admin@ai-sams.in', password: 'Admin@123' },
    { role: 'TC Admin', email: 'tcadmin@aiskills-blr.in', password: 'TcAdmin@123' },
    { role: 'Assessor', email: 'assessor@ai-sams.in', password: 'Assessor@123' },
  ];

  const fillDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      {/* Editorial panel */}
      <section className="hidden flex-col justify-between border-r border-border bg-[#f7f6f1] px-14 py-12 lg:flex">
        <Wordmark href="/login" size="lg" />

        <div className="max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Practice and readiness
          </p>
          <h1 className="mt-5 text-5xl leading-[1.08]">
            Rehearse the assessment before it counts.
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">
            Mock papers, scenario questions and rubric-scored practical work, modelled on publicly
            available qualification frameworks. You get a practice report showing the competency
            areas that need work — not a certificate.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              'MCQ, scenario and practical sections in one sitting',
              'Rubric-based scoring, reviewed by an assessor',
              'A practice report you can act on before the real thing',
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="mt-[7px] block h-[2px] w-5 shrink-0 bg-[#c5a059]" />
                <span className="text-foreground/80">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <BrandLine className="max-w-sm" />
      </section>

      {/* Sign-in panel */}
      <section className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden">
            <Wordmark href="/login" size="md" />
          </div>

          <div>
            <h2 className="text-2xl">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Training centre, assessor or candidate account
            </p>
          </div>

        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-dashed bg-transparent">
          <CardHeader className="pb-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Demo accounts · click to auto-fill
            </p>
            <CardDescription className="text-xs">
              Demonstration dataset only — remove before use with real candidates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {demoAccounts.map((demo) => (
                <button key={demo.email} onClick={() => fillDemo(demo.email, demo.password)} className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors text-left">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{demo.role}</Badge>
                    <span className="text-sm text-muted-foreground">{demo.email}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{demo.password}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

          <PracticeNotice />
          <BrandLine className="text-center lg:hidden" />
        </div>
      </section>
    </div>
  );
}

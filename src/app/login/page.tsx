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
import { Brain, Eye, EyeOff } from 'lucide-react';

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
    } catch {
      toast.error('Login failed');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Brain className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">AI-SAMS</h1>
          </div>
          <p className="text-muted-foreground">AI Skill Assessment Management System</p>
          <Badge variant="secondary">Pilot MVP</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
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

        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Demo Accounts (Click to auto-fill)</CardTitle>
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

        <p className="text-center text-xs text-muted-foreground">Pilot Assessment Tool — Not for Official Certification</p>
      </div>
    </div>
  );
}

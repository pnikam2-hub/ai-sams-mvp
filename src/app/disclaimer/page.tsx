import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Disclaimer — AI-SAMS Practice Assessment',
  description:
    'AI-SAMS is an independent practice and readiness assessment tool. It is not affiliated with, endorsed by, or recognised by any government body or Sector Skill Council.',
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>

        <div>
          <Badge variant="outline" className="mb-3">
            Independent practice tool
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Disclaimer and scope of use
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Please read this before using AI-SAMS or relying on any score it produces.
          </p>
        </div>

        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-amber-900">
              <AlertTriangle className="h-5 w-5" />
              Not an official assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-900">
            <p>
              AI-SAMS is an independent practice and readiness tool. It is{' '}
              <strong>
                not affiliated with, endorsed by, sponsored by, or recognised by
              </strong>{' '}
              the National Council for Vocational Education and Training (NCVET), the Ministry of
              Skill Development and Entrepreneurship (MSDE), the National Skill Development
              Corporation (NSDC), any Sector Skill Council, or any other government body.
            </p>
            <p>
              No qualification, certification, accreditation or credit is issued, implied or
              conferred by using this tool. Scores produced here have no standing in any official
              assessment, recruitment or licensing process.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What this tool actually is</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>
              A practice environment for mock examinations and self-assessment. Practice papers and
              competency structures here are modelled on publicly available qualification
              frameworks, so that learners can rehearse the format, difficulty and competency areas
              that a real assessment typically covers.
            </p>
            <p>
              A practice report is generated for your own feedback. It is not a certificate, not a
              statement of competency, and not evidence of any qualification. Treat it as a
              diagnostic, in the same way you would treat a mock test score.
            </p>
            <p>
              Question banks, rubrics and sample content included with this tool are original
              practice material prepared for this tool. They are not copies of any Sector Skill
              Council item bank or assessment guide.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demo data and accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>
              The publicly reachable instance runs on a demonstration dataset: sample training
              centre, sample course, sample batch and sample candidates. The demo accounts listed on
              the sign-in page are for evaluation only, and should be removed or rotated before the
              tool is used by any real training centre or candidate.
            </p>
            <p>
              Do not enter personal, commercial or confidential information into the public demo
              instance.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">For training centres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>
              If you use this tool with learners, you are responsible for describing it accurately:
              practice and readiness support, not official assessment. Do not present practice
              reports to learners or employers as qualifications, and do not use government,
              NCVET or Sector Skill Council names, logos or emblems in connection with it.
            </p>
          </CardContent>
        </Card>

        <p className="pb-4 text-center text-xs text-muted-foreground">
          AI-SAMS — practice and readiness assessment. No qualification or certificate is issued.
        </p>
      </div>
    </div>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, CheckCircle, XCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMsg("No verification token provided.");
      return;
    }
    api
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setErrorMsg(
          err instanceof ApiError ? err.detail : "Verification failed"
        );
      });
  }, [token]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResending(true);
    try {
      await api.resendVerification(resendEmail);
      toast.success("Verification email sent!");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Failed to resend"
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/40">
      <CardHeader className="text-center">
        <Link
          href="/"
          className="mb-4 inline-flex items-center justify-center gap-2.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Terminal className="h-4 w-4" />
          </div>
          <span className="font-mono text-2xl font-bold">Codence</span>
        </Link>
        <CardTitle className="font-mono text-lg">Email Verification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {status === "loading" && (
          <div className="flex items-center justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {status === "success" && (
          <div className="space-y-4 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
            <p className="font-mono text-sm font-medium">
              Your email has been verified!
            </p>
            <Link href="/login">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono">
                Go to Login
              </Button>
            </Link>
          </div>
        )}
        {status === "error" && (
          <div className="space-y-4 text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <p className="font-mono text-sm font-medium text-destructive">
              {errorMsg}
            </p>
          </div>
        )}
        <div className="border-t border-border/40 pt-4">
          <p className="mb-3 text-center font-mono text-xs text-muted-foreground">
            Didn&apos;t receive an email? Resend verification:
          </p>
          <form onSubmit={handleResend} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="resend-email" className="font-mono text-xs">
                Email
              </Label>
              <Input
                id="resend-email"
                type="email"
                placeholder="you@company.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="font-mono text-sm"
                required
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="w-full font-mono"
              disabled={resending}
            >
              {resending ? "Sending..." : "Resend Verification"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense
        fallback={
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, getAccessToken, setUser, clearAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { toast } from "sonner";

function VerificationGate({ onVerified }: { onVerified: () => void }) {
  const router = useRouter();
  const user = getUser();
  const email = (user?.email as string) || "";
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  async function handleResend() {
    setResending(true);
    try {
      await api.resendVerification(email);
      toast.success("Verification email sent!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to resend");
    } finally {
      setResending(false);
    }
  }

  async function handleRefresh() {
    const token = getAccessToken();
    if (!token) return;
    setChecking(true);
    try {
      const updated: any = await api.getMe(token);
      setUser(updated);
      if (updated.email_verified) {
        onVerified();
      } else {
        toast.error("Email not yet verified");
      }
    } catch {
      toast.error("Failed to check verification status");
    } finally {
      setChecking(false);
    }
  }

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Verify Your Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>We sent a verification link to <strong>{email}</strong></p>
          <p className="text-sm text-muted-foreground">Check your inbox and click the link to continue.</p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleResend}
              disabled={resending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {resending ? "Sending..." : "Resend Verification Email"}
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={checking}
              variant="outline"
              className="w-full"
            >
              {checking ? "Checking..." : "I've Verified"}
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full"
            >
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      const user = getUser();
      if (user && !user.email_verified) {
        setNeedsVerification(true);
      } else {
        setReady(true);
      }
    }
  }, [router]);

  if (needsVerification) {
    return (
      <VerificationGate
        onVerified={() => {
          setNeedsVerification(false);
          setReady(true);
        }}
      />
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-7xl p-6">{children}</div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAccessToken, getUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { statusColor, formatDate } from "@/lib/utils";
import {
  FileCode2,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  Terminal,
} from "lucide-react";

export default function DashboardPage() {
  const user = getUser();
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = getAccessToken();
      const orgId = user?.personal_org_id as string;
      if (!token || !orgId) return;
      try {
        const [reviewData, statsData] = await Promise.all([
          api.listReviews(orgId, 1, token) as Promise<any>,
          api.getReviewStats(orgId, token),
        ]);
        setReviews(reviewData.reviews || []);
        setStats(statsData);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.personal_org_id]);

  const statCards = [
    {
      label: "TOTAL_REVIEWS",
      value: stats.total,
      icon: FileCode2,
      accent: "text-primary",
    },
    {
      label: "IN_PROGRESS",
      value: stats.in_progress,
      icon: Cpu,
      accent: "text-blue-600",
    },
    {
      label: "COMPLETED",
      value: stats.completed,
      icon: CheckCircle2,
      accent: "text-green-600",
    },
    {
      label: "FAILED",
      value: stats.failed,
      icon: AlertTriangle,
      accent: "text-red-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold">Dashboard</h1>
          <p className="font-mono text-sm text-muted-foreground">
            <span className="text-primary">$</span> welcome{" "}
            {(user?.display_name as string) || "User"}
          </p>
        </div>
        <Link href="/dashboard/reviews">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-sm">
            <Plus className="mr-2 h-4 w-4" />
            New Review
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border/40 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </span>
                <s.icon className={`h-4 w-4 ${s.accent}`} />
              </div>
              <div className={`mt-2 font-mono text-3xl font-bold ${s.accent}`}>
                {s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-mono text-base">
            <Terminal className="h-4 w-4 text-primary" />
            Recent Reviews
          </CardTitle>
          {reviews.length > 0 && (
            <Link href="/dashboard/reviews">
              <Button
                variant="ghost"
                size="sm"
                className="font-mono text-xs text-primary"
              >
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-border bg-muted/50">
                <FileCode2 className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="mt-4 font-mono text-sm text-muted-foreground">
                No reviews yet. Submit your first code review.
              </p>
              <Link href="/dashboard/reviews">
                <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Review
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {reviews.slice(0, 5).map((review: any) => (
                <Link
                  key={review.id}
                  href={`/dashboard/reviews/${review.id}`}
                  className="flex items-center justify-between rounded-lg border border-border/40 p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-medium">
                      {review.title}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {review.source}
                      {review.language && <> &middot; {review.language}</>}{" "}
                      &middot; {formatDate(review.created_at)}
                    </p>
                  </div>
                  <Badge
                    className={statusColor(review.status)}
                    variant="outline"
                  >
                    {review.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

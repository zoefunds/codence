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
  FileSearch,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Plus,
} from "lucide-react";

export default function DashboardPage() {
  const user = getUser();
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, in_progress: 0, completed: 0, failed: 0 });
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
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.personal_org_id]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {(user?.display_name as string) || "User"}
          </p>
        </div>
        <Link href="/dashboard/reviews">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            New Review
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reviews
            </CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.in_progress}</div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : reviews.length === 0 ? (
            <div className="py-12 text-center">
              <FileSearch className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-muted-foreground">
                No reviews yet. Create your first review to get started.
              </p>
              <Link href="/dashboard/reviews">
                <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" />
                  New Review
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 5).map((review: any) => (
                <Link
                  key={review.id}
                  href={`/dashboard/reviews/${review.id}`}
                  className="flex items-center justify-between rounded-lg border border-border/40 p-4 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{review.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {review.source} &middot; {formatDate(review.created_at)}
                    </p>
                  </div>
                  <Badge className={statusColor(review.status)} variant="outline">
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

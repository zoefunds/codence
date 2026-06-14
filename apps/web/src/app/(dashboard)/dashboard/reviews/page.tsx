"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getAccessToken, getUser } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { statusColor, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, FileSearch } from "lucide-react";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "done", label: "Completed" },
  { value: "analyzing", label: "Analyzing" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

export default function ReviewsPage() {
  const router = useRouter();
  const user = getUser();
  const [reviews, setReviews] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("");

  async function loadReviews() {
    const token = getAccessToken();
    const orgId = user?.personal_org_id as string;
    if (!token || !orgId) return;
    setListLoading(true);
    try {
      const data: any = await api.listReviews(orgId, page, token, statusFilter || undefined);
      setReviews(data.reviews || []);
      setTotal(data.total || 0);
    } catch {
      // silent
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, [user?.personal_org_id, page, statusFilter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    const orgId = user?.personal_org_id as string;
    if (!token || !orgId) return;

    setSubmitting(true);
    try {
      const review: any = await api.createReview(
        { title, code, language: language || undefined, org_id: orgId },
        token
      );
      toast.success("Review created! Validators will begin analysis.");
      setDialogOpen(false);
      setTitle("");
      setCode("");
      setLanguage("");
      router.push(`/dashboard/reviews/${review.id}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Failed to create review"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-muted-foreground">
            Submit and track consensus-driven AI code reviews.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" />
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            New Review
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit Code for Review</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Review Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Auth middleware review"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language (optional)</Label>
                <Input
                  id="language"
                  placeholder="e.g. python, javascript, solidity"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Source Code</Label>
                <textarea
                  id="code"
                  className="min-h-[200px] w-full rounded-md border border-border/40 bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Paste your code here..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit for Review"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={statusFilter === f.value ? "bg-primary text-primary-foreground" : ""}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Reviews</span>
            <span className="text-sm font-normal text-muted-foreground">{total} total</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-12 text-center">
              <FileSearch className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-muted-foreground">
                {statusFilter ? "No reviews match this filter." : "No reviews yet. Submit your first code review to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review: any) => (
                <Link
                  key={review.id}
                  href={`/dashboard/reviews/${review.id}`}
                  className="flex items-center justify-between rounded-lg border border-border/40 p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{review.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {review.source}
                      {review.language && <> &middot; {review.language}</>}
                      {" "}&middot; {formatDate(review.created_at)}
                    </p>
                  </div>
                  <Badge className={statusColor(review.status)} variant="outline">
                    {review.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

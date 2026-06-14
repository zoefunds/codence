"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getAccessToken } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { statusColor, severityColor, formatDate } from "@/lib/utils";
import { Shield, FileSearch, AlertTriangle, Flag, Scale } from "lucide-react";
import { toast } from "sonner";

const TERMINAL_STATUSES = new Set(["done", "failed"]);

export default function ReviewDetailPage() {
  const params = useParams();
  const reviewId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [selectedFindings, setSelectedFindings] = useState<string[]>([]);
  const [appealing, setAppealing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadReview() {
    const token = getAccessToken();
    if (!token) return;
    try {
      const result = await api.getReview(reviewId, token);
      setData(result);
      if (result && TERMINAL_STATUSES.has((result as any).review?.status)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReview();
    intervalRef.current = setInterval(loadReview, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [reviewId]);

  async function handleFlag(findingId: string) {
    const token = getAccessToken();
    if (!token) return;
    const reason = prompt("Reason for flagging as false positive:");
    if (!reason) return;
    setFlaggingId(findingId);
    try {
      await api.flagFinding(reviewId, findingId, reason, token);
      toast.success("Finding flagged as false positive");
      loadReview();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to flag");
    } finally {
      setFlaggingId(null);
    }
  }

  async function handleUnflag(findingId: string) {
    const token = getAccessToken();
    if (!token) return;
    setFlaggingId(findingId);
    try {
      await api.unflagFinding(reviewId, findingId, token);
      toast.success("False positive flag removed");
      loadReview();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to unflag");
    } finally {
      setFlaggingId(null);
    }
  }

  async function handleAppeal(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;
    setAppealing(true);
    try {
      await api.appealReview(reviewId, appealReason, selectedFindings, token);
      toast.success("Appeal submitted for on-chain re-evaluation");
      setAppealOpen(false);
      setAppealReason("");
      setSelectedFindings([]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Failed to appeal");
    } finally {
      setAppealing(false);
    }
  }

  function toggleFindingSelection(id: string) {
    setSelectedFindings((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-muted-foreground">Review not found.</p>;
  }

  const { review, findings, consensus } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{review.title}</h1>
          <p className="text-muted-foreground">
            {review.source} &middot; {formatDate(review.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {review.status === "done" && findings.length > 0 && (
            <Dialog open={appealOpen} onOpenChange={setAppealOpen}>
              <DialogTrigger
                render={<Button variant="outline" size="sm" />}
              >
                <Scale className="mr-2 h-4 w-4" />
                Appeal
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Appeal Review</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAppeal} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Reason for appeal</Label>
                    <textarea
                      className="min-h-[100px] w-full rounded-md border border-border/40 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      placeholder="Explain why you believe findings are incorrect..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Select disputed findings</Label>
                    <div className="max-h-[200px] space-y-2 overflow-y-auto">
                      {findings.map((f: any) => (
                        <label key={f.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedFindings.includes(f.id)}
                            onChange={() => toggleFindingSelection(f.id)}
                            className="rounded"
                          />
                          <span className="truncate">{f.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={appealing || selectedFindings.length === 0}
                  >
                    {appealing ? "Submitting..." : "Submit Appeal"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
          <Badge className={statusColor(review.status)} variant="outline">
            {review.status}
          </Badge>
        </div>
      </div>

      {consensus && (
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Consensus Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <p className="text-sm text-muted-foreground">Risk Level</p>
                <Badge
                  className={severityColor(consensus.overall_risk)}
                  variant="outline"
                >
                  {consensus.overall_risk}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-lg font-semibold">
                  {(consensus.avg_confidence * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-lg font-semibold text-red-600">
                  {consensus.confirmed_count}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disputed</p>
                <p className="text-lg font-semibold text-yellow-600">
                  {consensus.disputed_count}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dismissed</p>
                <p className="text-lg font-semibold text-green-600">
                  {consensus.dismissed_count}
                </p>
              </div>
            </div>
            {consensus.chain_tx_hash && (
              <p className="mt-4 text-xs text-muted-foreground">
                On-chain TX: {consensus.chain_tx_hash}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Findings ({findings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {review.status === "done"
                ? "No findings — your code looks clean!"
                : "Findings will appear once analysis completes."}
            </p>
          ) : (
            <div className="space-y-4">
              {findings.map((finding: any) => (
                <div
                  key={finding.id}
                  className={`rounded-lg border p-4 ${finding.false_positive_flag ? "border-yellow-300 bg-yellow-50/50" : "border-border/40"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <h3 className="font-medium">{finding.title}</h3>
                      {finding.false_positive_flag && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                          False Positive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {finding.consensus_severity && (
                        <Badge
                          className={severityColor(finding.consensus_severity)}
                          variant="outline"
                        >
                          {finding.consensus_severity}
                        </Badge>
                      )}
                      {finding.consensus_verdict && (
                        <Badge variant="outline">
                          {finding.consensus_verdict}
                        </Badge>
                      )}
                      {review.status === "done" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={flaggingId === finding.id}
                          onClick={() =>
                            finding.false_positive_flag
                              ? handleUnflag(finding.id)
                              : handleFlag(finding.id)
                          }
                          className="h-7 px-2 text-xs"
                        >
                          <Flag className={`mr-1 h-3 w-3 ${finding.false_positive_flag ? "text-yellow-600" : ""}`} />
                          {finding.false_positive_flag ? "Unflag" : "Flag FP"}
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {finding.description}
                  </p>
                  {finding.confidence !== null && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Confidence: {(finding.confidence * 100).toFixed(0)}% &middot;{" "}
                      {finding.category}
                      {finding.line_start &&
                        ` · Lines ${finding.line_start}-${finding.line_end}`}
                    </p>
                  )}
                  {finding.remediation && (
                    <>
                      <Separator className="my-3" />
                      <p className="text-sm">
                        <span className="font-medium text-primary">
                          Remediation:
                        </span>{" "}
                        {finding.remediation}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

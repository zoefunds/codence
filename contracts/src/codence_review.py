# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════

VALID_CATEGORIES = [
    "vulnerability",
    "code_smell",
    "performance",
    "architecture",
    "security_config",
    "dependency",
    "gas_optimization",
    "logic_error",
    "access_control",
    "best_practice",
]

VALID_SEVERITIES = [
    "critical",
    "high",
    "medium",
    "low",
    "informational",
]

VALID_RISK_LEVELS = [
    "critical",
    "high",
    "medium",
    "low",
    "clean",
]

VALID_VERDICTS = [
    "confirmed",
    "disputed",
    "dismissed",
]

VALID_REVIEW_STATUSES = [
    "submitted",
    "analyzing",
    "done",
    "failed",
    "appealed",
    "archived",
]

VALID_SOURCES = [
    "paste",
    "upload",
    "github_pr",
    "github_push",
    "api",
]

SEVERITY_WEIGHTS = {
    "critical": 10,
    "high": 7,
    "medium": 4,
    "low": 2,
    "informational": 1,
}

SEVERITY_CONFIDENCE = {
    "critical": 0.95,
    "high": 0.85,
    "medium": 0.70,
    "low": 0.50,
    "informational": 0.30,
}

SEVERITY_RANK = {
    "critical": 5,
    "high": 4,
    "medium": 3,
    "low": 2,
    "informational": 1,
}

MAX_CODE_LENGTH = 500000
MAX_TITLE_LENGTH = 200
MAX_FINDINGS_PER_REVIEW = 50
MAX_REVIEWS_PER_PAGE = 50
DEFAULT_PAGE_SIZE = 20


# ══════════════════════════════════════════════════════════════════════════════
# CODENCE REVIEW CONTRACT
# ══════════════════════════════════════════════════════════════════════════════

class CodenceReview(gl.Contract):

    # ─── Storage ──────────────────────────────────────────────────────────────

    owner: Address
    review_count: u32
    finding_count: u32
    total_critical: u32
    total_high: u32
    total_medium: u32
    total_low: u32
    total_informational: u32

    reviews: TreeMap[str, str]
    findings: TreeMap[str, str]
    review_ids: TreeMap[str, str]
    user_reviews: TreeMap[str, str]
    org_reviews: TreeMap[str, str]
    review_metadata: TreeMap[str, str]
    appeal_records: TreeMap[str, str]
    config: TreeMap[str, str]

    # ─── Constructor ──────────────────────────────────────────────────────────

    def __init__(self):
        self.owner = gl.message.sender_address
        self.review_count = u32(0)
        self.finding_count = u32(0)
        self.total_critical = u32(0)
        self.total_high = u32(0)
        self.total_medium = u32(0)
        self.total_low = u32(0)
        self.total_informational = u32(0)

        default_config = json.dumps({
            "max_findings_per_review": MAX_FINDINGS_PER_REVIEW,
            "max_code_length": MAX_CODE_LENGTH,
            "min_confidence_threshold": 0.3,
            "auto_dismiss_threshold": 0.2,
            "appeal_window_blocks": 100,
            "supported_languages": [
                "python", "javascript", "typescript", "solidity",
                "rust", "go", "java", "c", "cpp", "ruby",
                "php", "swift", "kotlin", "scala", "haskell",
            ],
            "enabled_categories": VALID_CATEGORIES,
            "version": "1.0.0",
        })
        self.config["global"] = default_config

    # ══════════════════════════════════════════════════════════════════════════
    # WRITE METHODS
    # ══════════════════════════════════════════════════════════════════════════

    # ─── Submit Review ────────────────────────────────────────────────────────

    @gl.public.write
    def submit_review(
        self,
        review_id: str,
        code_hash: str,
        title: str,
        source: str,
        org_id: str,
        submitter_address: str,
        language: str,
        file_count: u32,
        total_lines: u32,
        total_bytes: u32,
    ) -> str:
        if len(review_id) == 0:
            raise Exception("review_id cannot be empty")
        if len(code_hash) == 0:
            raise Exception("code_hash cannot be empty")
        if len(title) == 0 or len(title) > MAX_TITLE_LENGTH:
            raise Exception("title must be 1-200 characters")

        existing = self.reviews.get(review_id, "")
        if existing != "":
            raise Exception("Review already exists with this ID")

        if source not in VALID_SOURCES:
            source = "paste"

        record = json.dumps({
            "review_id": review_id,
            "code_hash": code_hash,
            "submitter": submitter_address if submitter_address else str(gl.message.sender_address),
            "title": title,
            "source": source,
            "org_id": org_id,
            "language": language if language else "unknown",
            "file_count": int(file_count),
            "total_lines": int(total_lines),
            "total_bytes": int(total_bytes),
            "status": "submitted",
            "total_findings": 0,
            "confirmed_count": 0,
            "disputed_count": 0,
            "dismissed_count": 0,
            "overall_risk": "pending",
            "avg_confidence": "0",
            "risk_score": 0,
            "analysis_version": "1.0.0",
            "appeal_count": 0,
        })
        self.reviews[review_id] = record

        index = int(self.review_count)
        self.review_ids[str(index)] = review_id

        submitter_key = submitter_address if submitter_address else str(gl.message.sender_address)
        existing_user_reviews = self.user_reviews.get(submitter_key, "[]")
        user_review_list = json.loads(existing_user_reviews)
        user_review_list.append(review_id)
        self.user_reviews[submitter_key] = json.dumps(user_review_list)

        if org_id:
            existing_org_reviews = self.org_reviews.get(org_id, "[]")
            org_review_list = json.loads(existing_org_reviews)
            org_review_list.append(review_id)
            self.org_reviews[org_id] = json.dumps(org_review_list)

        self.review_count = u32(int(self.review_count) + 1)

        return json.dumps({
            "review_id": review_id,
            "status": "submitted",
            "index": index,
        })

    # ─── Analyze and Review (Consensus) ───────────────────────────────────────

    @gl.public.write
    def analyze_and_review(
        self,
        review_id: str,
        code_content: str,
        language: str,
    ) -> str:
        existing = self.reviews.get(review_id, "")
        if existing == "":
            raise Exception("Review not found")

        review_data = json.loads(existing)
        current_status = review_data.get("status", "")

        if current_status not in ("submitted", "appealed"):
            raise Exception("Review cannot be analyzed in current status: " + current_status)

        if len(code_content) == 0:
            raise Exception("Code content cannot be empty")
        if len(code_content) > MAX_CODE_LENGTH:
            raise Exception("Code content exceeds maximum length of " + str(MAX_CODE_LENGTH))

        review_data["status"] = "analyzing"
        self.reviews[review_id] = json.dumps(review_data)

        lang_display = language if language else "source"

        security_prompt = (
            "Review this " + lang_display + " code. "
            "Identify security vulnerabilities, code quality issues, and performance problems.\n\n"
            "Output one finding per line in this exact format:\n"
            "FINDING|category|severity|line_number|short_title|fix\n\n"
            "Categories: vulnerability, code_smell, performance, architecture, "
            "security_config, dependency, logic_error, access_control, best_practice\n"
            "Severities: critical, high, medium, low, informational\n\n"
            "Rules:\n"
            "- Only report real issues present in the code\n"
            "- Maximum 10 findings, sorted by severity (critical first)\n"
            "- Keep titles under 60 characters\n"
            "- If no issues: FINDING|best_practice|informational|0|No issues found|Code passes review\n\n"
            "CODE:\n" + code_content
        )

        equivalence_principle = (
            "Two analyses are equivalent if they assign the same overall risk level "
            "to the code. Specifically:\n"
            "1. Both agree on whether critical-severity issues exist (yes or no)\n"
            "2. Both agree on the approximate number of high-severity issues (within 2)\n"
            "3. The specific wording, titles, line numbers, categories, and ordering "
            "of findings may differ completely\n"
            "4. One analysis may find more low/medium/informational issues than the other\n"
            "5. Different category labels for the same concept are acceptable\n"
            "6. Different remediation suggestions are acceptable"
        )

        result_str = gl.eq_principle.prompt_comparative(
            lambda: gl.nondet.exec_prompt(security_prompt),
            equivalence_principle,
        )

        parsed_findings = self._parse_findings(result_str)

        finding_count = 0
        confirmed = 0
        disputed = 0
        dismissed = 0
        total_confidence = 0.0
        risk_score = 0
        severity_counts = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "informational": 0,
        }

        max_findings = MAX_FINDINGS_PER_REVIEW
        if len(parsed_findings) > max_findings:
            parsed_findings = parsed_findings[:max_findings]

        for i in range(len(parsed_findings)):
            f = parsed_findings[i]
            finding_id = review_id + "_f" + str(i)
            severity = f.get("severity", "informational")
            category = f.get("category", "best_practice")

            if severity not in VALID_SEVERITIES:
                severity = "informational"
            if category not in VALID_CATEGORIES:
                category = "best_practice"

            confidence = SEVERITY_CONFIDENCE.get(severity, 0.5)
            total_confidence = total_confidence + confidence
            weight = SEVERITY_WEIGHTS.get(severity, 1)
            risk_score = risk_score + weight

            if severity in severity_counts:
                severity_counts[severity] = severity_counts[severity] + 1

            if confidence >= 0.7:
                verdict = "confirmed"
                confirmed = confirmed + 1
            elif confidence >= 0.4:
                verdict = "disputed"
                disputed = disputed + 1
            else:
                verdict = "dismissed"
                dismissed = dismissed + 1

            line_num = self._safe_int(f.get("line_start", "0"))

            exploitability = "none"
            if severity == "critical":
                exploitability = "proven"
            elif severity == "high":
                exploitability = "likely"
            elif severity == "medium":
                exploitability = "unlikely"

            finding_record = json.dumps({
                "finding_id": finding_id,
                "review_id": review_id,
                "category": category,
                "title": f.get("title", "Untitled Finding"),
                "description": self._generate_description(category, severity, f.get("title", "")),
                "severity": severity,
                "exploitability": exploitability,
                "line_start": line_num,
                "line_end": line_num,
                "confidence": str(round(confidence, 3)),
                "consensus_verdict": verdict,
                "remediation": f.get("remediation", "Review and fix this issue"),
                "evidence_quality": str(round(confidence, 3)),
                "weight": weight,
                "false_positive": False,
                "appeal_status": "none",
            })
            self.findings[finding_id] = finding_record
            finding_count = finding_count + 1

        self.finding_count = u32(int(self.finding_count) + finding_count)
        self.total_critical = u32(int(self.total_critical) + severity_counts["critical"])
        self.total_high = u32(int(self.total_high) + severity_counts["high"])
        self.total_medium = u32(int(self.total_medium) + severity_counts["medium"])
        self.total_low = u32(int(self.total_low) + severity_counts["low"])
        self.total_informational = u32(int(self.total_informational) + severity_counts["informational"])

        avg_conf = 0.0
        if finding_count > 0:
            avg_conf = total_confidence / finding_count

        overall_risk = self._calculate_overall_risk(severity_counts, confirmed)

        review_data["status"] = "done"
        review_data["total_findings"] = finding_count
        review_data["confirmed_count"] = confirmed
        review_data["disputed_count"] = disputed
        review_data["dismissed_count"] = dismissed
        review_data["overall_risk"] = overall_risk
        review_data["avg_confidence"] = str(round(avg_conf, 3))
        review_data["risk_score"] = risk_score
        review_data["severity_breakdown"] = severity_counts
        self.reviews[review_id] = json.dumps(review_data)

        metadata = json.dumps({
            "review_id": review_id,
            "language": language if language else "unknown",
            "code_length": len(code_content),
            "line_count": code_content.count("\n") + 1,
        })
        self.review_metadata[review_id] = metadata

        return json.dumps({
            "review_id": review_id,
            "status": "done",
            "total_findings": finding_count,
            "confirmed": confirmed,
            "disputed": disputed,
            "dismissed": dismissed,
            "overall_risk": overall_risk,
            "risk_score": risk_score,
            "avg_confidence": round(avg_conf, 3),
            "severity_breakdown": severity_counts,
        })

    # ─── Flag Finding as False Positive ───────────────────────────────────────

    @gl.public.write
    def flag_false_positive(
        self,
        finding_id: str,
        reason: str,
    ) -> str:
        finding_data = self.findings.get(finding_id, "")
        if finding_data == "":
            raise Exception("Finding not found")

        finding = json.loads(finding_data)

        finding["false_positive"] = True
        finding["false_positive_reason"] = reason
        finding["flagged_by"] = str(gl.message.sender_address)
        self.findings[finding_id] = json.dumps(finding)

        review_id = finding.get("review_id", "")
        if review_id:
            self._recalculate_review_stats(review_id)

        return json.dumps({
            "finding_id": finding_id,
            "false_positive": True,
            "status": "flagged",
        })

    # ─── Unflag Finding ───────────────────────────────────────────────────────

    @gl.public.write
    def unflag_false_positive(
        self,
        finding_id: str,
    ) -> str:
        finding_data = self.findings.get(finding_id, "")
        if finding_data == "":
            raise Exception("Finding not found")

        finding = json.loads(finding_data)
        finding["false_positive"] = False
        finding["false_positive_reason"] = ""
        finding["flagged_by"] = ""
        self.findings[finding_id] = json.dumps(finding)

        review_id = finding.get("review_id", "")
        if review_id:
            self._recalculate_review_stats(review_id)

        return json.dumps({
            "finding_id": finding_id,
            "false_positive": False,
            "status": "unflagged",
        })

    # ─── Appeal Review ────────────────────────────────────────────────────────

    @gl.public.write
    def appeal_review(
        self,
        review_id: str,
        reason: str,
        disputed_finding_ids: str,
    ) -> str:
        existing = self.reviews.get(review_id, "")
        if existing == "":
            raise Exception("Review not found")

        review_data = json.loads(existing)

        if review_data.get("status") != "done":
            raise Exception("Can only appeal completed reviews")

        appeal_count = review_data.get("appeal_count", 0)
        if appeal_count >= 3:
            raise Exception("Maximum appeal limit (3) reached for this review")

        appeal_id = review_id + "_appeal_" + str(appeal_count)
        appeal_record = json.dumps({
            "appeal_id": appeal_id,
            "review_id": review_id,
            "appellant": str(gl.message.sender_address),
            "reason": reason,
            "disputed_finding_ids": disputed_finding_ids,
            "status": "pending",
            "resolution": "",
        })
        self.appeal_records[appeal_id] = appeal_record

        review_data["status"] = "appealed"
        review_data["appeal_count"] = appeal_count + 1
        self.reviews[review_id] = json.dumps(review_data)

        return json.dumps({
            "appeal_id": appeal_id,
            "status": "pending",
            "appeal_number": appeal_count + 1,
        })

    # ─── Resolve Appeal (Re-analyze with Consensus) ───────────────────────────

    @gl.public.write
    def resolve_appeal(
        self,
        appeal_id: str,
        code_content: str,
        language: str,
    ) -> str:
        appeal_data = self.appeal_records.get(appeal_id, "")
        if appeal_data == "":
            raise Exception("Appeal not found")

        appeal = json.loads(appeal_data)
        review_id = appeal.get("review_id", "")

        existing = self.reviews.get(review_id, "")
        if existing == "":
            raise Exception("Review not found")

        review_data = json.loads(existing)
        if review_data.get("status") != "appealed":
            raise Exception("Review is not in appealed status")

        disputed_ids_str = appeal.get("disputed_finding_ids", "")
        disputed_ids = []
        if disputed_ids_str:
            disputed_ids = disputed_ids_str.split(",")

        if len(disputed_ids) > 0:
            snippets = []
            for did in disputed_ids:
                did = did.strip()
                fdata = self.findings.get(did, "")
                if fdata:
                    f = json.loads(fdata)
                    snippets.append(
                        "Finding: " + f.get("title", "") +
                        " | Severity: " + f.get("severity", "") +
                        " | Category: " + f.get("category", "")
                    )

            appeal_context = "\n".join(snippets)

            appeal_prompt = (
                "You are a senior security engineer reviewing an appeal. "
                "The following findings were disputed by the code author:\n\n"
                + appeal_context + "\n\n"
                "Appeal reason: " + appeal.get("reason", "No reason given") + "\n\n"
                "Re-examine each disputed finding against the source code below. "
                "For each finding, determine if it is a genuine issue or a false positive.\n\n"
                "Output ONE line per disputed finding:\n"
                "VERDICT|finding_title|confirmed_or_dismissed|reasoning\n\n"
                "CODE:\n" + code_content
            )

            appeal_principle = (
                "Two appeal verdicts are equivalent if they reach the same "
                "confirmed/dismissed decision for each disputed finding. "
                "The specific reasoning may differ."
            )

            verdict_str = gl.eq_principle.prompt_comparative(
                lambda: gl.nondet.exec_prompt(appeal_prompt),
                appeal_principle,
            )

            verdict_lines = verdict_str.strip().split("\n")
            for vline in verdict_lines:
                vline = vline.strip()
                if not vline.startswith("VERDICT|"):
                    continue
                parts = vline.split("|")
                if len(parts) >= 3:
                    decision = parts[2].strip().lower()
                    if decision == "dismissed":
                        for did in disputed_ids:
                            did = did.strip()
                            fdata = self.findings.get(did, "")
                            if fdata:
                                f = json.loads(fdata)
                                if parts[1].strip().lower() in f.get("title", "").lower():
                                    f["consensus_verdict"] = "dismissed"
                                    f["appeal_status"] = "overturned"
                                    self.findings[did] = json.dumps(f)

        appeal["status"] = "resolved"
        self.appeal_records[appeal_id] = json.dumps(appeal)

        self._recalculate_review_stats(review_id)

        review_data_updated = self.reviews.get(review_id, "")
        if review_data_updated:
            rd = json.loads(review_data_updated)
            rd["status"] = "done"
            self.reviews[review_id] = json.dumps(rd)

        return json.dumps({
            "appeal_id": appeal_id,
            "status": "resolved",
            "review_id": review_id,
        })

    # ─── Archive Review ───────────────────────────────────────────────────────

    @gl.public.write
    def archive_review(self, review_id: str) -> str:
        existing = self.reviews.get(review_id, "")
        if existing == "":
            raise Exception("Review not found")

        review_data = json.loads(existing)

        if review_data.get("status") not in ("done", "failed"):
            raise Exception("Can only archive completed or failed reviews")

        review_data["status"] = "archived"
        self.reviews[review_id] = json.dumps(review_data)

        return json.dumps({"review_id": review_id, "status": "archived"})

    # ─── Update Config (Owner Only) ───────────────────────────────────────────

    @gl.public.write
    def update_config(self, key: str, value: str) -> str:
        if gl.message.sender_address != self.owner:
            raise Exception("Only the contract owner can update configuration")

        current = self.config.get("global", "{}")
        cfg = json.loads(current)
        cfg[key] = value
        self.config["global"] = json.dumps(cfg)

        return json.dumps({"key": key, "updated": True})

    # ─── Transfer Ownership ───────────────────────────────────────────────────

    @gl.public.write
    def transfer_ownership(self, new_owner: str) -> str:
        if gl.message.sender_address != self.owner:
            raise Exception("Only the current owner can transfer ownership")

        if len(new_owner) == 0:
            raise Exception("New owner address cannot be empty")

        old_owner = str(self.owner)
        self.owner = Address(new_owner)

        return json.dumps({
            "old_owner": old_owner,
            "new_owner": new_owner,
            "transferred": True,
        })

    # ══════════════════════════════════════════════════════════════════════════
    # VIEW METHODS
    # ══════════════════════════════════════════════════════════════════════════

    # ─── Get Review ───────────────────────────────────────────────────────────

    @gl.public.view
    def get_review(self, review_id: str) -> str:
        data = self.reviews.get(review_id, "")
        if data == "":
            raise Exception("Review not found")
        return data

    # ─── Get Finding ──────────────────────────────────────────────────────────

    @gl.public.view
    def get_finding(self, finding_id: str) -> str:
        data = self.findings.get(finding_id, "")
        if data == "":
            raise Exception("Finding not found")
        return data

    # ─── Get All Findings for a Review ────────────────────────────────────────

    @gl.public.view
    def get_review_findings(self, review_id: str) -> str:
        review_data_str = self.reviews.get(review_id, "")
        if review_data_str == "":
            raise Exception("Review not found")

        review = json.loads(review_data_str)
        total = review.get("total_findings", 0)
        results = []
        for i in range(total):
            finding_id = review_id + "_f" + str(i)
            fdata = self.findings.get(finding_id, "")
            if fdata != "":
                results.append(json.loads(fdata))
        return json.dumps(results)

    # ─── Get Findings Filtered by Severity ────────────────────────────────────

    @gl.public.view
    def get_findings_by_severity(self, review_id: str, severity: str) -> str:
        review_data_str = self.reviews.get(review_id, "")
        if review_data_str == "":
            raise Exception("Review not found")

        if severity not in VALID_SEVERITIES:
            raise Exception("Invalid severity: " + severity)

        review = json.loads(review_data_str)
        total = review.get("total_findings", 0)
        results = []
        for i in range(total):
            finding_id = review_id + "_f" + str(i)
            fdata = self.findings.get(finding_id, "")
            if fdata != "":
                finding = json.loads(fdata)
                if finding.get("severity") == severity:
                    results.append(finding)
        return json.dumps(results)

    # ─── Get Findings Filtered by Category ────────────────────────────────────

    @gl.public.view
    def get_findings_by_category(self, review_id: str, category: str) -> str:
        review_data_str = self.reviews.get(review_id, "")
        if review_data_str == "":
            raise Exception("Review not found")

        if category not in VALID_CATEGORIES:
            raise Exception("Invalid category: " + category)

        review = json.loads(review_data_str)
        total = review.get("total_findings", 0)
        results = []
        for i in range(total):
            finding_id = review_id + "_f" + str(i)
            fdata = self.findings.get(finding_id, "")
            if fdata != "":
                finding = json.loads(fdata)
                if finding.get("category") == category:
                    results.append(finding)
        return json.dumps(results)

    # ─── Get Confirmed Findings Only ──────────────────────────────────────────

    @gl.public.view
    def get_confirmed_findings(self, review_id: str) -> str:
        review_data_str = self.reviews.get(review_id, "")
        if review_data_str == "":
            raise Exception("Review not found")

        review = json.loads(review_data_str)
        total = review.get("total_findings", 0)
        results = []
        for i in range(total):
            finding_id = review_id + "_f" + str(i)
            fdata = self.findings.get(finding_id, "")
            if fdata != "":
                finding = json.loads(fdata)
                if finding.get("consensus_verdict") == "confirmed" and not finding.get("false_positive", False):
                    results.append(finding)
        return json.dumps(results)

    # ─── Get False Positives ──────────────────────────────────────────────────

    @gl.public.view
    def get_false_positives(self, review_id: str) -> str:
        review_data_str = self.reviews.get(review_id, "")
        if review_data_str == "":
            raise Exception("Review not found")

        review = json.loads(review_data_str)
        total = review.get("total_findings", 0)
        results = []
        for i in range(total):
            finding_id = review_id + "_f" + str(i)
            fdata = self.findings.get(finding_id, "")
            if fdata != "":
                finding = json.loads(fdata)
                if finding.get("false_positive", False):
                    results.append(finding)
        return json.dumps(results)

    # ─── Get Review Count ─────────────────────────────────────────────────────

    @gl.public.view
    def get_review_count(self) -> u32:
        return self.review_count

    # ─── Get Global Stats ─────────────────────────────────────────────────────

    @gl.public.view
    def get_global_stats(self) -> str:
        return json.dumps({
            "total_reviews": int(self.review_count),
            "total_findings": int(self.finding_count),
            "total_critical": int(self.total_critical),
            "total_high": int(self.total_high),
            "total_medium": int(self.total_medium),
            "total_low": int(self.total_low),
            "total_informational": int(self.total_informational),
        })

    # ─── Get Reviews by User ──────────────────────────────────────────────────

    @gl.public.view
    def get_user_reviews(self, user_address: str) -> str:
        data = self.user_reviews.get(user_address, "[]")
        review_ids = json.loads(data)
        results = []
        for rid in review_ids:
            rdata = self.reviews.get(rid, "")
            if rdata != "":
                results.append(json.loads(rdata))
        return json.dumps(results)

    # ─── Get Reviews by Organization ──────────────────────────────────────────

    @gl.public.view
    def get_org_reviews(self, org_id: str) -> str:
        data = self.org_reviews.get(org_id, "[]")
        review_ids = json.loads(data)
        results = []
        for rid in review_ids:
            rdata = self.reviews.get(rid, "")
            if rdata != "":
                results.append(json.loads(rdata))
        return json.dumps(results)

    # ─── Get Paginated Review List ────────────────────────────────────────────

    @gl.public.view
    def get_reviews_paginated(self, page: u32, page_size: u32) -> str:
        total = int(self.review_count)
        p = int(page)
        ps = int(page_size)

        if ps <= 0:
            ps = DEFAULT_PAGE_SIZE
        if ps > MAX_REVIEWS_PER_PAGE:
            ps = MAX_REVIEWS_PER_PAGE
        if p <= 0:
            p = 1

        start = (p - 1) * ps
        end = start + ps
        if end > total:
            end = total

        results = []
        for i in range(start, end):
            rid = self.review_ids.get(str(i), "")
            if rid != "":
                rdata = self.reviews.get(rid, "")
                if rdata != "":
                    results.append(json.loads(rdata))

        return json.dumps({
            "reviews": results,
            "total": total,
            "page": p,
            "page_size": ps,
            "total_pages": (total + ps - 1) // ps if ps > 0 else 0,
        })

    # ─── Get Review Metadata ─────────────────────────────────────────────────

    @gl.public.view
    def get_review_metadata(self, review_id: str) -> str:
        data = self.review_metadata.get(review_id, "")
        if data == "":
            raise Exception("Metadata not found for this review")
        return data

    # ─── Get Review Summary ───────────────────────────────────────────────────

    @gl.public.view
    def get_review_summary(self, review_id: str) -> str:
        review_data_str = self.reviews.get(review_id, "")
        if review_data_str == "":
            raise Exception("Review not found")

        review = json.loads(review_data_str)
        total = review.get("total_findings", 0)

        critical_findings = []
        high_findings = []

        for i in range(total):
            finding_id = review_id + "_f" + str(i)
            fdata = self.findings.get(finding_id, "")
            if fdata != "":
                finding = json.loads(fdata)
                if finding.get("false_positive", False):
                    continue
                sev = finding.get("severity", "")
                if sev == "critical":
                    critical_findings.append({
                        "title": finding.get("title", ""),
                        "category": finding.get("category", ""),
                        "line_start": finding.get("line_start", 0),
                        "remediation": finding.get("remediation", ""),
                    })
                elif sev == "high":
                    high_findings.append({
                        "title": finding.get("title", ""),
                        "category": finding.get("category", ""),
                        "line_start": finding.get("line_start", 0),
                        "remediation": finding.get("remediation", ""),
                    })

        return json.dumps({
            "review_id": review_id,
            "title": review.get("title", ""),
            "status": review.get("status", ""),
            "overall_risk": review.get("overall_risk", ""),
            "risk_score": review.get("risk_score", 0),
            "total_findings": total,
            "confirmed_count": review.get("confirmed_count", 0),
            "critical_findings": critical_findings,
            "high_findings": high_findings,
        })

    # ─── Get Appeal Record ────────────────────────────────────────────────────

    @gl.public.view
    def get_appeal(self, appeal_id: str) -> str:
        data = self.appeal_records.get(appeal_id, "")
        if data == "":
            raise Exception("Appeal not found")
        return data

    # ─── Get Config ───────────────────────────────────────────────────────────

    @gl.public.view
    def get_config(self) -> str:
        return self.config.get("global", "{}")

    # ─── Get Contract Info ────────────────────────────────────────────────────

    @gl.public.view
    def get_contract_info(self) -> str:
        return json.dumps({
            "owner": str(self.owner),
            "version": "1.0.0",
            "review_count": int(self.review_count),
            "finding_count": int(self.finding_count),
            "supported_categories": VALID_CATEGORIES,
            "supported_severities": VALID_SEVERITIES,
            "supported_sources": VALID_SOURCES,
            "max_code_length": MAX_CODE_LENGTH,
            "max_findings_per_review": MAX_FINDINGS_PER_REVIEW,
            "max_appeals": 3,
        })

    # ─── Check if Review Exists ───────────────────────────────────────────────

    @gl.public.view
    def review_exists(self, review_id: str) -> bool:
        return self.reviews.get(review_id, "") != ""

    # ══════════════════════════════════════════════════════════════════════════
    # INTERNAL HELPERS
    # ══════════════════════════════════════════════════════════════════════════

    def _parse_findings(self, result_str: str) -> list:
        lines = result_str.strip().split("\n")
        findings = []
        for line in lines:
            line = line.strip()
            if not line.startswith("FINDING|"):
                continue
            parts = line.split("|")
            if len(parts) < 5:
                continue

            category = parts[1].strip()
            severity = parts[2].strip()
            line_start = parts[3].strip()
            title = parts[4].strip()
            remediation = parts[5].strip() if len(parts) > 5 else "Review and address this issue"

            if category not in VALID_CATEGORIES:
                for valid_cat in VALID_CATEGORIES:
                    if valid_cat in category.lower():
                        category = valid_cat
                        break
                else:
                    category = "best_practice"

            if severity not in VALID_SEVERITIES:
                for valid_sev in VALID_SEVERITIES:
                    if valid_sev in severity.lower():
                        severity = valid_sev
                        break
                else:
                    severity = "informational"

            findings.append({
                "category": category,
                "severity": severity,
                "line_start": line_start,
                "title": title if len(title) <= 200 else title[:200],
                "remediation": remediation if len(remediation) <= 1000 else remediation[:1000],
            })

        return findings

    def _safe_int(self, value: str) -> int:
        try:
            return int(value)
        except Exception:
            return 0

    def _generate_description(self, category: str, severity: str, title: str) -> str:
        descriptions = {
            "vulnerability": "Security vulnerability detected that could be exploited by attackers",
            "code_smell": "Code quality issue that may lead to maintenance problems",
            "performance": "Performance concern that could impact application responsiveness",
            "architecture": "Architectural issue affecting code organization and scalability",
            "security_config": "Security configuration weakness that should be hardened",
            "dependency": "Dependency-related issue that may introduce risk",
            "gas_optimization": "Gas usage could be optimized for better efficiency",
            "logic_error": "Logic flaw that could cause incorrect behavior",
            "access_control": "Access control issue that may allow unauthorized actions",
            "best_practice": "Deviation from established best practices",
        }
        base = descriptions.get(category, "Issue detected in code review")
        return base + ". " + severity.capitalize() + " severity: " + title

    def _calculate_overall_risk(self, severity_counts: dict, confirmed: int) -> str:
        if confirmed == 0:
            return "clean"

        if severity_counts.get("critical", 0) > 0:
            return "critical"
        if severity_counts.get("high", 0) > 0:
            return "high"
        if severity_counts.get("medium", 0) > 0:
            return "medium"
        if severity_counts.get("low", 0) > 0:
            return "low"
        return "clean"

    def _recalculate_review_stats(self, review_id: str) -> None:
        review_data_str = self.reviews.get(review_id, "")
        if review_data_str == "":
            return

        review_data = json.loads(review_data_str)
        total = review_data.get("total_findings", 0)

        confirmed = 0
        disputed = 0
        dismissed = 0
        total_confidence = 0.0
        risk_score = 0
        severity_counts = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "informational": 0,
        }

        active_confirmed = 0

        for i in range(total):
            finding_id = review_id + "_f" + str(i)
            fdata = self.findings.get(finding_id, "")
            if fdata == "":
                continue

            finding = json.loads(fdata)

            if finding.get("false_positive", False):
                dismissed = dismissed + 1
                continue

            verdict = finding.get("consensus_verdict", "confirmed")
            severity = finding.get("severity", "informational")
            confidence = float(finding.get("confidence", 0.5))

            total_confidence = total_confidence + confidence
            weight = SEVERITY_WEIGHTS.get(severity, 1)

            if verdict == "confirmed":
                confirmed = confirmed + 1
                active_confirmed = active_confirmed + 1
                risk_score = risk_score + weight
                if severity in severity_counts:
                    severity_counts[severity] = severity_counts[severity] + 1
            elif verdict == "disputed":
                disputed = disputed + 1
            else:
                dismissed = dismissed + 1

        avg_conf = 0.0
        active_count = confirmed + disputed
        if active_count > 0:
            avg_conf = total_confidence / (confirmed + disputed + dismissed)

        overall_risk = self._calculate_overall_risk(severity_counts, active_confirmed)

        review_data["confirmed_count"] = confirmed
        review_data["disputed_count"] = disputed
        review_data["dismissed_count"] = dismissed
        review_data["overall_risk"] = overall_risk
        review_data["avg_confidence"] = str(round(avg_conf, 3))
        review_data["risk_score"] = risk_score
        review_data["severity_breakdown"] = severity_counts
        self.reviews[review_id] = json.dumps(review_data)

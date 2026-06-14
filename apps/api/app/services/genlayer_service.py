import json
import httpx
from app.core.config import settings


BRIDGE_URL = getattr(settings, "CHAIN_BRIDGE_URL", "http://localhost:8001")


class GenlayerService:
    def __init__(self):
        self.bridge_url = BRIDGE_URL

    async def _bridge_call(self, endpoint: str, payload: dict, timeout: int = 300) -> dict:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(f"{self.bridge_url}{endpoint}", json=payload)
            data = resp.json()
            if resp.status_code >= 400:
                raise Exception(data.get("error", f"Bridge error: {resp.status_code}"))
            return data

    async def submit_review(
        self,
        review_id: str,
        code_hash: str,
        title: str,
        source: str,
        from_address: str,
        org_id: str = "",
        language: str = "unknown",
        file_count: int = 1,
        total_lines: int = 0,
        total_bytes: int = 0,
    ) -> str:
        result = await self._bridge_call("/submit-review", {
            "review_id": review_id,
            "code_hash": code_hash,
            "title": title,
            "source": source,
            "org_id": org_id,
            "submitter_address": from_address,
            "language": language,
            "file_count": file_count,
            "total_lines": total_lines,
            "total_bytes": total_bytes,
        })
        return result.get("tx_hash", "")

    async def analyze_review(
        self,
        review_id: str,
        code_content: str,
        language: str,
        from_address: str,
    ) -> str:
        result = await self._bridge_call("/analyze-review", {
            "review_id": review_id,
            "code_content": code_content,
            "language": language,
        }, timeout=600)
        return result.get("tx_hash", "")

    async def wait_for_tx(self, tx_hash: str) -> dict:
        return await self._bridge_call("/wait-for-tx", {"tx_hash": tx_hash}, timeout=1200)

    async def get_tx_status(self, tx_hash: str) -> dict:
        result = await self._bridge_call("/get-tx", {"tx_hash": tx_hash})
        return result.get("transaction", {})

    async def get_review(self, review_id: str) -> dict:
        result = await self._bridge_call("/read-review", {"review_id": review_id})
        data = result.get("result", "{}")
        return json.loads(data) if isinstance(data, str) else data

    async def get_review_findings(self, review_id: str) -> list:
        result = await self._bridge_call("/read-findings", {"review_id": review_id})
        data = result.get("result", "[]")
        return json.loads(data) if isinstance(data, str) else data

    async def get_confirmed_findings(self, review_id: str) -> list:
        result = await self._bridge_call("/read-confirmed-findings", {"review_id": review_id})
        data = result.get("result", "[]")
        return json.loads(data) if isinstance(data, str) else data

    async def get_review_summary(self, review_id: str) -> dict:
        result = await self._bridge_call("/read-review-summary", {"review_id": review_id})
        data = result.get("result", "{}")
        return json.loads(data) if isinstance(data, str) else data

    async def get_review_count(self) -> int:
        result = await self._bridge_call("/review-count", {})
        return result.get("count", 0)

    async def get_global_stats(self) -> dict:
        result = await self._bridge_call("/global-stats", {})
        data = result.get("result", "{}")
        return json.loads(data) if isinstance(data, str) else data

    async def flag_false_positive(self, finding_id: str, reason: str) -> str:
        result = await self._bridge_call("/flag-false-positive", {
            "finding_id": finding_id,
            "reason": reason,
        })
        return result.get("tx_hash", "")

    async def unflag_false_positive(self, finding_id: str) -> str:
        result = await self._bridge_call("/unflag-false-positive", {
            "finding_id": finding_id,
        })
        return result.get("tx_hash", "")

    async def appeal_review(self, review_id: str, reason: str, disputed_finding_ids: str) -> str:
        result = await self._bridge_call("/appeal-review", {
            "review_id": review_id,
            "reason": reason,
            "disputed_finding_ids": disputed_finding_ids,
        })
        return result.get("tx_hash", "")

    async def archive_review(self, review_id: str) -> str:
        result = await self._bridge_call("/archive-review", {
            "review_id": review_id,
        })
        return result.get("tx_hash", "")

    async def get_contract_info(self) -> dict:
        result = await self._bridge_call("/contract-info", {})
        data = result.get("result", "{}")
        return json.loads(data) if isinstance(data, str) else data


genlayer = GenlayerService()

import logging

logger = logging.getLogger("apex-rag")


class RAGPipeline:
    def __init__(self):
        try:
            from app.core.rag.retriever import Retriever
            self.retriever = Retriever()
        except Exception as e:
            logger.error(f"RAG RETRIEVER INITIALIZATION ERROR: {str(e)}")
            self.retriever = None

    def retrieve_context(self, user_query: str, db=None, workspace_id=None, organization_id=None):
        """Build grounded context for the LLM from the user's own ingested data.

        Two complementary parts, so the bot answers correctly over ANY dataset:
          1. A factual DATASET OVERVIEW (exact record count, columns, numeric
             aggregates, categorical distributions) — so aggregate/counting
             questions ("how many records", "total/average X") are exact rather
             than inferred from a 3-row sample.
          2. The top-k semantically relevant rows — for specific lookups.

        Returns an empty string only when the workspace genuinely has no data or
        retrieval fails; the caller then refuses via the FactCheckAgent instead
        of fabricating an answer. We never fall back to mock/hardcoded content.
        """
        if self.retriever is None or workspace_id is None or organization_id is None:
            return ""

        import uuid
        try:
            org_uuid = uuid.UUID(str(organization_id))
            ws_uuid = uuid.UUID(str(workspace_id))
        except (ValueError, TypeError):
            return ""

        parts = []

        # 1. Factual overview of the whole workspace dataset.
        if db is not None:
            try:
                from app.core.rag.data_summary import build_data_grounding_summary
                summary = build_data_grounding_summary(db, ws_uuid)
                if summary:
                    parts.append(summary)
            except Exception as e:
                logger.error(f"DATA GROUNDING SUMMARY ERROR: {str(e)}")

        # 2. Semantically relevant rows for the specific query.
        try:
            semantic = self.retriever.retrieve_and_build_context(
                query=user_query,
                organization_id=org_uuid,
                workspace_id=ws_uuid,
            )
            if semantic:
                parts.append("=== RELEVANT RECORDS ===\n" + semantic)
        except Exception as e:
            logger.error(f"RAG PRODUCTION RETRIEVAL ERROR: {str(e)}")

        return "\n\n".join(parts)

import logging

logger = logging.getLogger("apex-rag")


class RAGPipeline:
    def __init__(self):
        # Building the Retriever loads the sentence-transformer embedding model
        # (~hundreds of MB RAM). On small hosts that OOMs the process on the
        # first chat message. When RAG indexing is disabled we skip semantic
        # retrieval entirely; chat still answers from the factual DB data
        # summary + the LLM (no embeddings needed).
        try:
            from app.core.config import settings
            if not settings.RAG_INDEXING_ENABLED:
                logger.info(
                    "RAG disabled (RAG_INDEXING_ENABLED=false); semantic retrieval off."
                )
                self.retriever = None
                return
        except Exception:
            pass

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
        # Note: a missing retriever (RAG/semantic search disabled) must NOT skip
        # the factual DB summary below — that's what grounds counting/aggregate
        # answers and needs no embeddings. Only bail when we have no tenant scope.
        if workspace_id is None or organization_id is None:
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

        # 1b. Market benchmark for the workspace's sector, so the bot can compare
        #     the user's data against the market. Cloud HTTP call, no embeddings.
        if db is not None:
            try:
                from app.core.rag.market_summary import build_market_summary
                market = build_market_summary(db, ws_uuid)
                if market:
                    parts.append(market)
            except Exception as e:
                logger.error(f"MARKET SUMMARY ERROR: {str(e)}")

        # 2. Semantically relevant rows for the specific query (needs embeddings;
        #    skipped when the retriever is disabled on small hosts).
        if self.retriever is not None:
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

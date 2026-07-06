"""
Decision Service
----------------
Orchestration layer coordinating retrieval, prompt formatting, LLM generation,
JSON parsing, schema validation, and database persistence.
Handles transaction rollbacks and duplicate card checks.
"""

import uuid
import logging
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AppError
from app.core.rag.retriever import Retriever
from app.models.ai_recommendation import AIRecommendation
from app.models.enums import DecisionStatus
from app.repositories.decision_card_repository import DecisionCardRepository
from app.services.decision_engine import DecisionEngine
from app.services.decision_parser import DecisionParser
from app.services.decision_validator import DecisionValidator

logger = logging.getLogger("decision-service")


class DecisionService:
    """
    Coordinates decision intelligence generation pipelines.
    Enforces tenant boundaries, handles parsing failures, calculates scores,
    and manages transaction rollbacks.
    """

    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = DecisionCardRepository(db)
        self.decision_engine = DecisionEngine()
        self.decision_parser = DecisionParser()
        self.decision_validator = DecisionValidator()

    def generate_decision_card(
        self,
        organization_id: uuid.UUID,
        workspace_id: uuid.UUID,
        query: str,
        dataset_id: Optional[uuid.UUID] = None,
    ) -> AIRecommendation:
        """
        Coordinates the end-to-end Decision Intelligence generation pipeline.
        Ensures database transactions are rolled back in case of parser/validation errors.
        """
        try:
            # 1. Scoped RAG Context Retrieval
            retriever = Retriever()
            query_vector = retriever.embedding_provider.embed_query(query)
            raw_results = retriever.vector_store.similarity_search(
                query_embedding=query_vector,
                top_k=settings.RAG_TOP_K,
                organization_id=organization_id,
                workspace_id=workspace_id,
                score_threshold=settings.RAG_SIMILARITY_THRESHOLD,
            )

            # Extract retrieval metrics
            retrieved_docs_count = len(raw_results)
            if retrieved_docs_count > 0:
                retrieval_score = max([res.get("score", 0.0) for res in raw_results])
            else:
                retrieval_score = 0.5  # default baseline if no results returned

            # Run re-ranking and build context string
            reranked_results = retriever.reranker.rerank(query, raw_results)
            context_string = retriever.context_builder.build_context(reranked_results)

            # 2. Invoke DecisionEngine to call LLM provider
            raw_llm_text = self.decision_engine.generate_decision_text(
                query=query, context=context_string
            )

            # 3. Invoke DecisionParser to clean and parse JSON
            parsed_data, parser_quality = self.decision_parser.parse_raw_response(
                raw_llm_text
            )
            if not parsed_data:
                raise AppError(
                    status_code=422,
                    code="parse_error",
                    message="Failed to parse structured recommendation from LLM output.",
                )

            # 4. Invoke DecisionValidator to run Pydantic validations & calculate derived confidence
            decision_out = self.decision_validator.validate_and_enrich(
                parsed_data=parsed_data,
                retrieval_score=retrieval_score,
                parser_quality=parser_quality,
                retrieved_docs_count=retrieved_docs_count,
                model_name=self.decision_engine.llm_provider.model,
                provider_name=settings.LLM_PROVIDER,
                prompt_version=self.decision_engine.prompt_version,
            )

            # Check for duplicates (same title and workspace that are currently pending)
            dup_stmt = select(AIRecommendation).where(
                AIRecommendation.workspace_id == workspace_id,
                AIRecommendation.title == decision_out.title,
                AIRecommendation.decision_status == DecisionStatus.PENDING,
                AIRecommendation.is_deleted.is_(False),
            )
            existing_card = self.db.execute(dup_stmt).scalars().first()
            if existing_card:
                logger.info(
                    f"Duplicate decision card detected with title: '{decision_out.title}'. Reusing existing card."
                )
                return existing_card

            # 5. Persist via repository
            card = self.repository.create(
                organization_id=organization_id,
                workspace_id=workspace_id,
                title=decision_out.title,
                recommendation=decision_out.recommendation,  # Plain human-readable text
                confidence_score=decision_out.confidence,
                priority=decision_out.priority,
                recommendation_type=decision_out.recommendation_type,
                metadata_json=decision_out.model_dump(
                    mode="json"
                ),  # Machine-readable fields
                dataset_id=dataset_id,
            )

            self.db.flush()
            return card

        except Exception as e:
            self.db.rollback()
            logger.error(
                f"Decision generation pipeline failed, transaction rolled back. Error: {str(e)}"
            )
            raise e

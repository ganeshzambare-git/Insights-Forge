"""
Chat Router
-----------
Exposes API endpoints for chat completions, health, and conversation lifecycles.
"""

import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import CurrentUser, get_current_user
from app.db.session import get_db
from app.services.chat_service import ChatService
from app.core.memory.conversation_memory_service import ConversationMemoryService
from app.core.memory.conversation_maintenance import ConversationMaintenance
from app.schemas.chat import (
    AIConversationCreate,
    AIConversationUpdate,
    AIConversationOut,
    AIConversationDetailOut,
    MemoryHealthOut,
)
from app.core.errors import AppError

router = APIRouter(prefix="/chat", tags=["Chat"])


class _Lazy:
    """Defer service construction until first use.

    Instantiating ChatService eagerly loads heavy ML weights (embedding model),
    which blocks app startup — on small hosts the port never binds in time and
    the deploy fails with a port-scan timeout. Build on first request instead.
    """

    def __init__(self, factory):
        self._factory = factory
        self._obj = None

    def __getattr__(self, item):
        if self._obj is None:
            self._obj = self._factory()
        return getattr(self._obj, item)


chat_service = _Lazy(ChatService)
memory_service = _Lazy(ConversationMemoryService)
maintenance_service = _Lazy(ConversationMaintenance)


from fastapi.responses import StreamingResponse  # noqa: E402


class ChatRequest(BaseModel):
    query: str
    conversation_id: Optional[uuid.UUID] = None
    response_mode: Optional[str] = "MODE_BUSINESS"
    stream: Optional[bool] = False


@router.post("/completions", status_code=status.HTTP_200_OK)
def chat_completion(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Exposes standard AI completions routing, secured with JWT verification and workspace scoping.
    """
    if request.stream:

        def sse_generator():
            generator = chat_service.get_chat_completion_stream(
                db=db,
                query=request.query,
                response_mode=request.response_mode or "MODE_BUSINESS",
                current_user=current_user,
                conversation_id=request.conversation_id,
            )
            accumulated_chunks = []
            for chunk in generator:
                accumulated_chunks.append(chunk.text)
                yield f"data: {chunk.model_dump_json()}\n\n"

                if chunk.finished and chunk.conversation_id:
                    db.commit()
                    full_ai_response = "".join(accumulated_chunks)
                    maintenance_service.run_maintenance(
                        db=db,
                        conversation_id=uuid.UUID(chunk.conversation_id),
                        background_tasks=background_tasks,
                        user_query=request.query,
                        ai_response=full_ai_response,
                    )

        return StreamingResponse(
            sse_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    res = chat_service.get_chat_completion(
        db=db,
        query=request.query,
        response_mode=request.response_mode or "MODE_BUSINESS",
        current_user=current_user,
        conversation_id=request.conversation_id,
    )

    # Save/Commit DB changes made by completions thread
    db.commit()

    # Schedule non-blocking background title/summary tasks
    maintenance_service.run_maintenance(
        db=db,
        conversation_id=res["conversation_id"],
        background_tasks=background_tasks,
        user_query=request.query,
        ai_response=res["analysis"],
    )

    return {
        "status": res["status"],
        "agent": res["agent"],
        "analysis_type": res["analysis_type"],
        "message": res["analysis"],
        "confidence": res["confidence"],
        "visualization_payload": None,
        "conversation_id": res["conversation_id"],
    }


@router.get("/health", status_code=status.HTTP_200_OK)
def check_chat_health() -> dict:
    """
    Checks the connectivity, model availability, and latency metrics of the configured LLM provider.
    """
    return chat_service.get_llm_health()


# --- Conversation Lifecycle Endpoints ---


@router.post(
    "/conversations",
    response_model=AIConversationOut,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(
    payload: AIConversationCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AIConversationOut:
    """
    Explicitly creates a new conversation thread.
    """
    convo = memory_service.create_conversation(
        db=db,
        title=payload.title,
        model_name=payload.model_name,
        workspace_id=current_user.workspace_id,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
    )
    db.commit()
    return convo


@router.get("/conversations", response_model=List[AIConversationOut])
def list_conversations(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[AIConversationOut]:
    """
    Lists active conversations for the authenticated user, filtered by workspace/organization.
    """
    conversations = memory_service.list_conversations(
        db=db,
        workspace_id=current_user.workspace_id,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
    )
    return conversations


@router.get("/conversations/{conversation_id}", response_model=AIConversationDetailOut)
def get_conversation_detail(
    conversation_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AIConversationDetailOut:
    """
    Retrieves detailed metadata and all message logs in a conversation.
    """
    conversation = memory_service.get_conversation_by_id(
        db=db,
        conversation_id=conversation_id,
        workspace_id=current_user.workspace_id,
        organization_id=current_user.organization_id,
    )
    if not conversation or conversation.is_deleted:
        raise AppError(404, "not_found", "Conversation not found")

    # Load messages chronological order
    from app.repositories.message_repository import MessageRepository

    messages = MessageRepository(db).get_all_messages(conversation_id)

    # Map to schema fields
    detail = AIConversationDetailOut.model_validate(conversation)
    detail.messages = messages
    return detail


@router.patch("/conversations/{conversation_id}", response_model=AIConversationOut)
def update_conversation(
    conversation_id: uuid.UUID,
    payload: AIConversationUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AIConversationOut:
    """
    Renames a conversation thread or updates its properties.
    """
    conversation = memory_service.get_conversation_by_id(
        db=db,
        conversation_id=conversation_id,
        workspace_id=current_user.workspace_id,
        organization_id=current_user.organization_id,
    )
    if not conversation or conversation.is_deleted:
        raise AppError(404, "not_found", "Conversation not found")

    updated = memory_service.update_conversation(
        db=db,
        conversation=conversation,
        title=payload.title,
        model_name=payload.model_name,
        status=payload.status,
    )
    db.commit()
    return updated


@router.delete(
    "/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_conversation(
    conversation_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """
    Soft-deletes a conversation thread.
    """
    conversation = memory_service.get_conversation_by_id(
        db=db,
        conversation_id=conversation_id,
        workspace_id=current_user.workspace_id,
        organization_id=current_user.organization_id,
    )
    if not conversation or conversation.is_deleted:
        raise AppError(404, "not_found", "Conversation not found")

    memory_service.soft_delete_conversation(db=db, conversation=conversation)
    db.commit()


@router.get("/memory/health", response_model=MemoryHealthOut)
def get_memory_health(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MemoryHealthOut:
    """
    Exposes diagnostics for conversation memory system.
    """
    stats = memory_service.get_aggregate_stats(
        db=db,
        workspace_id=current_user.workspace_id,
        organization_id=current_user.organization_id,
    )
    return MemoryHealthOut(
        status="healthy",
        memory_enabled=True,
        conversation_count=stats["conversation_count"],
        message_count=stats["message_count"],
        average_messages=stats["average_messages"],
        average_tokens=stats["average_tokens"],
        summaries_generated=stats["summaries_generated"],
        pending_background_jobs=0,
    )


from app.schemas.chat import VectorHealthOut  # noqa: E402
from app.core.embedding.factory import EmbeddingFactory  # noqa: E402
from app.core.vector_store.factory import VectorStoreFactory  # noqa: E402
import time  # noqa: E402
from app.core.config import settings  # noqa: E402


@router.get("/vector-store/health", response_model=VectorHealthOut)
def get_vector_store_health(
    current_user: CurrentUser = Depends(get_current_user),
) -> VectorHealthOut:
    """
    Exposes deep diagnostics for RAG, Embedding, and Vector Store pipelines.
    """
    start_time = time.time()

    # 1. Resolve embedding details
    try:
        emb_provider = EmbeddingFactory.get_provider()
        emb_provider_name = settings.EMBEDDING_PROVIDER
        emb_model = settings.EMBEDDING_MODEL
        emb_dimension = emb_provider.dimension
    except Exception:
        emb_provider_name = settings.EMBEDDING_PROVIDER
        emb_model = settings.EMBEDDING_MODEL
        emb_dimension = 0

    # 2. Query Vector Store metrics
    try:
        vec_store = VectorStoreFactory.get_vector_store()
        v_health = vec_store.health_check()
        v_stats = vec_store.statistics()

        status = "healthy" if v_health.get("healthy") else "unhealthy"
        indexed_docs = v_stats.get(
            "indexed_documents", v_stats.get("indexed_chunks", 0)
        )
        ext_installed = v_health.get("diagnostics", {}).get("extension_installed", True)
        diagnostics = {
            "vector_store": v_health.get("diagnostics", {}),
            "statistics": v_stats,
        }
    except Exception as e:
        status = "unhealthy"
        indexed_docs = 0
        ext_installed = False
        diagnostics = {"error": str(e)}

    latency = time.time() - start_time

    return VectorHealthOut(
        provider=settings.VECTOR_PROVIDER,
        embedding_provider=emb_provider_name,
        model=emb_model,
        dimension=emb_dimension,
        status=status,
        indexed_documents=indexed_docs,
        extension_installed=ext_installed,
        latency=latency,
        diagnostics=diagnostics,
    )

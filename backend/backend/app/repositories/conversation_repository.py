"""
Conversation Repository
-----------------------
Handles all database operations (CRUD and metrics) for the AIConversation model.
"""

import uuid
import datetime
from sqlalchemy import select, func
from sqlalchemy.orm import Session, lazyload
from app.models.ai_conversation import AIConversation
from app.models.enums import AIConversationStatus, AIModel


class ConversationRepository:
    """
    Encapsulates all database operations for AI Conversations.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_conversation(
        self,
        title: str,
        model_name: AIModel,
        workspace_id: uuid.UUID,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> AIConversation:
        """
        Creates a new conversation record.
        """
        conversation = AIConversation(
            title=title,
            model_name=model_name,
            workspace_id=workspace_id,
            organization_id=organization_id,
            user_id=user_id,
            status=AIConversationStatus.ACTIVE,
            summary=None,
            total_messages=0,
            total_tokens=0,
        )
        self.db.add(conversation)
        self.db.flush()
        return conversation

    def get_conversation_by_id(
        self,
        conversation_id: uuid.UUID,
        workspace_id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> AIConversation | None:
        """
        Retrieves a conversation by ID, enforcing tenant isolation.
        """
        stmt = (
            select(AIConversation)
            .where(
                AIConversation.id == conversation_id,
                AIConversation.workspace_id == workspace_id,
                AIConversation.organization_id == organization_id,
                AIConversation.is_deleted.is_(False),
            )
            # Avoid the lazy="selectin" cascade (org/workspace/user/messages),
            # which fires many round-trips over Neon and made chat hang ~45s+.
            # Callers that need messages load them via MessageRepository.
            .options(lazyload("*"))
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_conversation_by_id_simple(
        self,
        conversation_id: uuid.UUID,
    ) -> AIConversation | None:
        """
        Retrieves a conversation by ID simply (for background tasks).
        """
        stmt = (
            select(AIConversation)
            .where(
                AIConversation.id == conversation_id,
                AIConversation.is_deleted.is_(False),
            )
            # Avoid the lazy="selectin" cascade — this method is called on every
            # save_user_message / save_ai_message; without lazyload it loaded all
            # messages (and their relationships) and made chat hang ~45s+.
            .options(lazyload("*"))
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_conversations(
        self,
        workspace_id: uuid.UUID,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> list[AIConversation]:
        """
        Lists active conversations for a user, sorted by last activity (last_message_at or created_at).
        """
        stmt = (
            select(AIConversation)
            .where(
                AIConversation.workspace_id == workspace_id,
                AIConversation.organization_id == organization_id,
                AIConversation.user_id == user_id,
                AIConversation.is_deleted.is_(False),
            )
            .order_by(
                AIConversation.last_message_at.desc(), AIConversation.created_at.desc()
            )
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.execute(stmt).scalars().all())

    def update_conversation(
        self,
        conversation: AIConversation,
        title: str | None = None,
        model_name: AIModel | None = None,
        status: AIConversationStatus | None = None,
        summary: str | None = None,
    ) -> AIConversation:
        """
        Updates conversation attributes.
        """
        if title is not None:
            conversation.title = title
        if model_name is not None:
            conversation.model_name = model_name
        if status is not None:
            conversation.status = status
        if summary is not None:
            conversation.summary = summary
            conversation.last_summary_at = datetime.datetime.now(datetime.timezone.utc)
        self.db.flush()
        return conversation

    def soft_delete_conversation(self, conversation: AIConversation) -> None:
        """
        Soft-deletes a conversation thread.
        """
        conversation.is_deleted = True
        conversation.deleted_at = datetime.datetime.now(datetime.timezone.utc)
        self.db.flush()

    def update_metrics(
        self,
        conversation: AIConversation,
        message_tokens: int,
        message_time: datetime.datetime,
    ) -> None:
        """
        Updates the conversation metrics fields: total_messages, total_tokens, last_message_at.
        """
        conversation.total_messages += 1
        conversation.total_tokens += message_tokens
        conversation.last_message_at = message_time
        self.db.flush()

    def get_aggregate_stats(
        self,
        workspace_id: uuid.UUID,
        organization_id: uuid.UUID,
    ) -> dict:
        """
        Retrieves aggregate health/metrics statistics for conversations in a workspace.
        """
        stmt = select(
            func.count(AIConversation.id).label("convo_count"),
            func.sum(AIConversation.total_messages).label("total_msg"),
            func.avg(AIConversation.total_messages).label("avg_msg"),
            func.avg(AIConversation.total_tokens).label("avg_tokens"),
            func.count(AIConversation.last_summary_at).label("summaries_count"),
        ).where(
            AIConversation.workspace_id == workspace_id,
            AIConversation.organization_id == organization_id,
            AIConversation.is_deleted.is_(False),
        )
        res = self.db.execute(stmt).one()
        return {
            "conversation_count": res.convo_count or 0,
            "message_count": int(res.total_msg or 0),
            "average_messages": float(res.avg_msg or 0.0),
            "average_tokens": float(res.avg_tokens or 0.0),
            "summaries_generated": int(res.summaries_count or 0),
        }

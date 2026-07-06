"""
Message Repository
------------------
Handles database operations for the AIMessage model.
"""

import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session, lazyload
from app.models.ai_message import AIMessage
from app.models.enums import AIMessageSender


class MessageRepository:
    """
    Encapsulates all database operations for AI Messages.
    """

    def __init__(self, db: Session):
        self.db = db

    def create_message(
        self,
        conversation_id: uuid.UUID,
        sender_type: AIMessageSender,
        message: str,
        tokens_used: int,
        response_time_ms: int | None = None,
    ) -> AIMessage:
        """
        Creates and persists a message.
        """
        ai_message = AIMessage(
            conversation_id=conversation_id,
            sender_type=sender_type,
            message=message,
            tokens_used=tokens_used,
            response_time_ms=response_time_ms,
        )
        self.db.add(ai_message)
        self.db.flush()
        return ai_message

    def get_recent_messages(
        self,
        conversation_id: uuid.UUID,
        limit: int = 10,
    ) -> list[AIMessage]:
        """
        Fetches recent messages in a conversation, ordered chronologically (created_at ASC).
        """
        stmt = (
            select(AIMessage)
            .where(
                AIMessage.conversation_id == conversation_id,
                AIMessage.is_deleted.is_(False),
            )
            .order_by(AIMessage.created_at.desc())
            .limit(limit)
            # AIMessage.conversation is lazy="selectin" and AIConversation.messages
            # is too, forming a cycle that loads the whole thread (and re-loads it
            # per message) — ~45s over Neon. We only need scalar columns here.
            .options(lazyload("*"))
        )
        latest = self.db.execute(stmt).scalars().all()
        return list(reversed(latest))

    def get_all_messages(
        self,
        conversation_id: uuid.UUID,
    ) -> list[AIMessage]:
        """
        Fetches all messages in a conversation in chronological order (created_at ASC).
        """
        stmt = (
            select(AIMessage)
            .where(
                AIMessage.conversation_id == conversation_id,
                AIMessage.is_deleted.is_(False),
            )
            .order_by(AIMessage.created_at.asc())
            # Same selectin cycle avoidance as get_recent_messages.
            .options(lazyload("*"))
        )
        return list(self.db.execute(stmt).scalars().all())

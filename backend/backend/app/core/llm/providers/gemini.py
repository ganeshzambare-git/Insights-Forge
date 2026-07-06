"""
Gemini Provider
---------------
Google Gemini API integration using the ``google-genai`` SDK.
Implements the full LLMProvider contract: generate, stream, health_check.
"""

import time
import logging
from typing import Any, Dict, List, Generator

from google import genai
from google.genai import types

from app.core.config import settings
from app.core.llm.provider import (
    LLMProvider,
    LLMResponse,
    LLMChunk,
    LLMHealthCheckResponse,
)
from app.core.llm.token_counter import TokenCounter

logger = logging.getLogger("gemini-provider")


def _gemini_error_message(exc: Exception) -> str:
    """Map a Gemini SDK exception to a clear, user-facing message.

    Distinguishes rate-limit/quota (429) from a genuine outage so users on the
    free tier understand the assistant is working but the API quota is spent.
    """
    text = str(exc)
    if "429" in text or "RESOURCE_EXHAUSTED" in text or "quota" in text.lower():
        return (
            "The AI service hit its request quota (rate limit). This is a limit on "
            "the Gemini API key, not your data. Please wait a moment and try again."
        )
    return "The Gemini AI service is currently unavailable. Please try again shortly."


class GeminiProvider(LLMProvider):
    """
    Google Gemini implementation of LLMProvider using the google-genai SDK.
    """

    def __init__(self) -> None:
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY is not configured. "
                "Set it in .env or as an environment variable."
            )
        self.client = genai.Client(api_key=api_key)
        self.model = settings.GEMINI_MODEL

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _split_messages(
        messages: List[Dict[str, str]],
    ) -> tuple[str | None, list[types.Content]]:
        """
        Separate system instructions from conversation history.

        Returns (system_instruction, contents) where contents uses
        Gemini's 'user'/'model' role convention.
        """
        system_parts: list[str] = []
        contents: list[types.Content] = []

        for msg in messages:
            role = msg.get("role", "user").lower()
            text = msg.get("content", "")

            if role == "system":
                system_parts.append(text)
            else:
                # Map "assistant" -> "model" for Gemini
                gemini_role = "model" if role == "assistant" else "user"
                contents.append(
                    types.Content(
                        role=gemini_role,
                        parts=[types.Part.from_text(text=text)],
                    )
                )

        system_instruction = "\n\n".join(system_parts) if system_parts else None
        return system_instruction, contents

    # ------------------------------------------------------------------
    # LLMProvider contract
    # ------------------------------------------------------------------

    def generate(self, messages: List[Dict[str, str]], **kwargs: Any) -> LLMResponse:
        """
        Submits dialog history to Gemini and returns a structured LLMResponse.
        """
        system_instruction, contents = self._split_messages(messages)

        config = types.GenerateContentConfig(
            temperature=kwargs.get("temperature", settings.LLM_TEMPERATURE),
            max_output_tokens=kwargs.get("max_tokens", settings.LLM_MAX_TOKENS),
        )
        if system_instruction:
            config.system_instruction = system_instruction

        prompt_text = "".join([m.get("content", "") for m in messages])
        prompt_tokens = TokenCounter.estimate_tokens(prompt_text)

        start_time = time.time()
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=config,
            )
            latency_ms = int((time.time() - start_time) * 1000)

            # Handle safety blocks or empty responses
            if not response.text:
                finish_reason = ""
                if response.candidates and response.candidates[0].finish_reason:
                    finish_reason = str(response.candidates[0].finish_reason)
                return LLMResponse(
                    status="error",
                    content="The model response was blocked or empty.",
                    error_details=f"finish_reason={finish_reason}",
                    model=self.model,
                    provider="gemini",
                    latency_ms=latency_ms,
                )

            content = response.text
            completion_tokens = TokenCounter.estimate_tokens(content)

            # Extract real token counts if available
            if response.usage_metadata:
                prompt_tokens = response.usage_metadata.prompt_token_count or prompt_tokens
                completion_tokens = (
                    response.usage_metadata.candidates_token_count or completion_tokens
                )

            total_tokens = prompt_tokens + completion_tokens

            logger.info(
                "Gemini request successful",
                extra={
                    "provider": "gemini",
                    "model": self.model,
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens,
                    "latency_ms": latency_ms,
                },
            )

            return LLMResponse(
                status="success",
                content=content,
                model=self.model,
                provider="gemini",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                latency_ms=latency_ms,
                retry_count=0,
            )

        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Gemini request failed: {str(e)}")
            return LLMResponse(
                status="error",
                content=_gemini_error_message(e),
                error_details=str(e),
                model=self.model,
                provider="gemini",
                latency_ms=latency_ms,
            )

    def stream(
        self, messages: List[Dict[str, str]], **kwargs: Any
    ) -> Generator[LLMChunk, None, None]:
        """
        Submits dialog history to Gemini and yields a stream of LLMChunk blocks.
        """
        system_instruction, contents = self._split_messages(messages)

        config = types.GenerateContentConfig(
            temperature=kwargs.get("temperature", settings.LLM_TEMPERATURE),
            max_output_tokens=kwargs.get("max_tokens", settings.LLM_MAX_TOKENS),
        )
        if system_instruction:
            config.system_instruction = system_instruction

        start_time = time.time()
        try:
            response_stream = self.client.models.generate_content_stream(
                model=self.model,
                contents=contents,
                config=config,
            )

            for chunk in response_stream:
                text_fragment = chunk.text or ""
                latency_ms = int((time.time() - start_time) * 1000)

                # Check finish reason
                finished = False
                finish_reason = None
                if chunk.candidates and chunk.candidates[0].finish_reason:
                    finished = True
                    finish_reason = str(chunk.candidates[0].finish_reason)

                yield LLMChunk(
                    text=text_fragment,
                    finished=finished,
                    finish_reason=finish_reason,
                    model=self.model,
                    provider="gemini",
                    latency_ms=latency_ms,
                    retry_count=0,
                )

        except Exception as e:
            logger.error(f"Gemini streaming failed: {str(e)}")
            yield LLMChunk(
                text=_gemini_error_message(e),
                finished=True,
                finish_reason="error",
                model=self.model,
                provider="gemini",
                retry_count=0,
            )

    def health_check(self) -> LLMHealthCheckResponse:
        """
        Checks connectivity to the Gemini API with a minimal generation request.
        """
        start_time = time.time()
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents="Reply with exactly: GEMINI_OK",
                config=types.GenerateContentConfig(
                    max_output_tokens=100,
                    temperature=0.0,
                ),
            )
            latency_ms = int((time.time() - start_time) * 1000)

            reachable = response.text is not None and len(response.text.strip()) > 0

            return LLMHealthCheckResponse(
                reachable=reachable,
                model=self.model,
                version="google-genai",
                provider="gemini",
                status="healthy" if reachable else "degraded",
                loaded=reachable,
                streaming=settings.LLM_STREAMING_ENABLED,
                latency_ms=latency_ms,
            )
        except Exception as e:
            logger.warning(f"Gemini health check failed: {str(e)}")
            return LLMHealthCheckResponse(
                reachable=False,
                model=self.model,
                version=None,
                provider="gemini",
                status="unhealthy",
                loaded=False,
                streaming=settings.LLM_STREAMING_ENABLED,
                latency_ms=None,
            )

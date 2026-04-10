"""
Signal Learning Scheduler
=========================
Background scheduler that runs resolve_pending_signals() every 15 minutes.
Launched as an asyncio task on server startup via start_signal_resolver().
"""

import asyncio
import logging

from services.signal_learning_engine import resolve_pending_signals

logger = logging.getLogger(__name__)


async def start_signal_resolver():
    """
    Infinite loop — resolves pending signals every 15 minutes.

    Waits 60 seconds after startup before first run so the server
    has fully initialised all routes and DB connections.
    """
    logger.info("Signal learning resolver scheduled (first run in 60s)")
    await asyncio.sleep(60)  # initial delay — let server warm up

    while True:
        try:
            result = await resolve_pending_signals()
            if result.get("resolved", 0) > 0:
                logger.info(
                    "Signal resolver: resolved=%d  hits=%d  stops=%d  misses=%d  errors=%d",
                    result.get("resolved", 0),
                    result.get("hits", 0),
                    result.get("stops", 0),
                    result.get("misses", 0),
                    result.get("errors", 0),
                )
            else:
                logger.debug("Signal resolver: no signals due for resolution")
        except Exception as exc:
            logger.error("Signal resolver error: %s", exc, exc_info=True)

        await asyncio.sleep(900)  # 15 minutes

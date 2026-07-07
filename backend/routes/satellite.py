"""
Aureos AI — Satellite Intelligence Routes
============================================
Exposes tanker tracking, floating storage, port activity, and dark-fleet
detection as REST endpoints for the frontend Satellite Intelligence page
and for JARVIS to pull as conversational context.
"""

from fastapi import APIRouter, HTTPException
import logging

from services import satellite_intelligence as sat

logger = logging.getLogger("aureos")
router = APIRouter(prefix="/api/satellite", tags=["satellite-intelligence"])


@router.get("/chokepoints")
async def chokepoints():
    """Traffic and anomaly status at major oil transit chokepoints (Hormuz, Malacca, Suez...)."""
    try:
        return sat.get_chokepoint_status()
    except Exception as e:
        logger.error(f"Chokepoint status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/floating-storage")
async def floating_storage():
    """Global floating storage levels — oversupply/undersupply signal for oil."""
    try:
        return sat.get_floating_storage()
    except Exception as e:
        logger.error(f"Floating storage error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/port-activity")
async def port_activity():
    """Loading/discharge activity at major oil terminals worldwide."""
    try:
        return sat.get_port_activity()
    except Exception as e:
        logger.error(f"Port activity error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dark-fleet")
async def dark_fleet():
    """Vessels with disabled AIS transponders — sanctions evasion / shadow fleet signal."""
    try:
        return sat.get_dark_fleet_activity()
    except Exception as e:
        logger.error(f"Dark fleet detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def summary():
    """Condensed summary for dashboard widgets and JARVIS context injection."""
    try:
        return sat.get_satellite_intelligence_summary()
    except Exception as e:
        logger.error(f"Satellite summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

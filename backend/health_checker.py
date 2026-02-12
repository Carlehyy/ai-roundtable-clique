"""
LLM Health Checker - Background task to periodically check LLM connectivity
"""
import asyncio
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import LLMProvider, LLMProviderStatus, async_session_maker
from llm_providers import create_provider

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LLMHealthChecker:
    """Background task to check LLM provider health"""
    
    def __init__(self, check_interval: int = 300):
        """
        Initialize health checker
        
        Args:
            check_interval: Interval between checks in seconds (default: 300s = 5 minutes)
        """
        self.check_interval = check_interval
        self.is_running = False
        self.task: Optional[asyncio.Task] = None
    
    async def check_provider_health(self, provider: LLMProvider, db: AsyncSession) -> bool:
        """
        Check health of a single provider
        
        Args:
            provider: LLMProvider instance
            db: Database session
            
        Returns:
            True if provider is online, False otherwise
        """
        # Skip if no API key configured
        if not provider.api_key:
            if provider.status != LLMProviderStatus.OFFLINE:
                provider.status = LLMProviderStatus.OFFLINE
                await db.commit()
                logger.info(f"Provider {provider.display_name} marked as OFFLINE (no API key)")
            return False
        
        try:
            # Create provider instance
            llm_provider = create_provider(
                provider.provider_type,
                provider.api_key,
                provider.model_name,
                provider.api_base
            )
            
            # Test connection
            success, quota_info, response_time_ms = await llm_provider.test_connection()
            
            if success:
                # Update to ONLINE status
                old_status = provider.status
                provider.status = LLMProviderStatus.ONLINE
                provider.last_check_at = datetime.utcnow()
                provider.last_used_at = datetime.utcnow()  # Update last online time
                provider.avg_response_time = response_time_ms
                
                # Update quota info if available
                if quota_info:
                    provider.total_quota = quota_info.total
                    provider.used_quota = quota_info.used or 0
                    provider.remaining_quota = quota_info.remaining
                
                await db.commit()
                
                if old_status != LLMProviderStatus.ONLINE:
                    logger.info(f"✓ Provider {provider.display_name} is now ONLINE (response: {response_time_ms:.0f}ms)")
                
                return True
            else:
                # Update to ERROR status
                old_status = provider.status
                provider.status = LLMProviderStatus.ERROR
                provider.last_check_at = datetime.utcnow()
                await db.commit()
                
                if old_status != LLMProviderStatus.ERROR:
                    logger.warning(f"✗ Provider {provider.display_name} connection failed")
                
                return False
                
        except Exception as e:
            # Update to ERROR status
            old_status = provider.status
            provider.status = LLMProviderStatus.ERROR
            provider.last_check_at = datetime.utcnow()
            await db.commit()
            
            if old_status != LLMProviderStatus.ERROR:
                logger.error(f"✗ Provider {provider.display_name} error: {str(e)}")
            
            return False
    
    async def check_all_providers(self):
        """Check health of all enabled providers"""
        async with async_session_maker() as db:
            try:
                # Get all enabled providers
                result = await db.execute(
                    select(LLMProvider).where(LLMProvider.is_enabled == True)
                )
                providers = result.scalars().all()
                
                if not providers:
                    logger.debug("No enabled providers to check")
                    return
                
                logger.info(f"Checking health of {len(providers)} providers...")
                
                # Check each provider
                online_count = 0
                for provider in providers:
                    is_online = await self.check_provider_health(provider, db)
                    if is_online:
                        online_count += 1
                    
                    # Small delay between checks to avoid rate limiting
                    await asyncio.sleep(1)
                
                logger.info(f"Health check complete: {online_count}/{len(providers)} providers online")
                
            except Exception as e:
                logger.error(f"Error during health check: {str(e)}")
    
    async def run(self):
        """Run the health checker loop"""
        self.is_running = True
        logger.info(f"LLM Health Checker started (interval: {self.check_interval}s)")
        
        # Initial check after 10 seconds
        await asyncio.sleep(10)
        await self.check_all_providers()
        
        # Periodic checks
        while self.is_running:
            try:
                await asyncio.sleep(self.check_interval)
                await self.check_all_providers()
            except asyncio.CancelledError:
                logger.info("Health checker cancelled")
                break
            except Exception as e:
                logger.error(f"Error in health checker loop: {str(e)}")
                # Continue running even if there's an error
                await asyncio.sleep(60)  # Wait a bit before retrying
    
    def start(self):
        """Start the health checker as a background task"""
        if not self.is_running:
            self.task = asyncio.create_task(self.run())
            logger.info("Health checker task created")
    
    async def stop(self):
        """Stop the health checker"""
        self.is_running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
            logger.info("Health checker stopped")

# Global health checker instance
health_checker = LLMHealthChecker(check_interval=300)  # Check every 5 minutes

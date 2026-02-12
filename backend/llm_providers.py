"""
LLM Provider management and API integration
"""
import os
import time
import httpx
from typing import Optional, Dict, Any, List
from abc import ABC, abstractmethod
from dataclasses import dataclass
import anthropic
import openai
import google.generativeai as genai

@dataclass
class LLMResponse:
    content: str
    thinking_content: Optional[str] = None
    tokens_used: int = 0
    response_time_ms: float = 0.0
    error: Optional[str] = None

@dataclass
class QuotaInfo:
    total: Optional[float] = None
    used: Optional[float] = None
    remaining: Optional[float] = None

class BaseLLMProvider(ABC):
    """Base class for LLM providers"""
    
    def __init__(self, api_key: str, model_name: str, api_base: Optional[str] = None):
        self.api_key = api_key
        self.model_name = model_name
        self.api_base = api_base
    
    @abstractmethod
    async def generate_response(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> LLMResponse:
        pass
    
    @abstractmethod
    async def test_connection(self) -> tuple[bool, Optional[QuotaInfo], float]:
        """Test connection and return (success, quota_info, response_time_ms)"""
        pass

class ClaudeProvider(BaseLLMProvider):
    """Anthropic Claude provider"""
    
    def __init__(self, api_key: str, model_name: str = "claude-3-sonnet-20240229", api_base: Optional[str] = None):
        super().__init__(api_key, model_name, api_base)
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
    
    async def generate_response(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> LLMResponse:
        start_time = time.time()
        
        try:
            # Convert messages to Claude format
            system_msg = ""
            claude_messages = []
            
            for msg in messages:
                if msg.get("role") == "system":
                    system_msg = msg.get("content", "")
                else:
                    claude_messages.append({
                        "role": msg.get("role"),
                        "content": msg.get("content", "")
                    })
            
            response = await self.client.messages.create(
                model=self.model_name,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_msg,
                messages=claude_messages
            )
            
            response_time = (time.time() - start_time) * 1000
            
            return LLMResponse(
                content=response.content[0].text,
                tokens_used=response.usage.input_tokens + response.usage.output_tokens,
                response_time_ms=response_time
            )
            
        except Exception as e:
            return LLMResponse(
                content="",
                error=str(e),
                response_time_ms=(time.time() - start_time) * 1000
            )
    
    async def test_connection(self) -> tuple[bool, Optional[QuotaInfo], float]:
        start_time = time.time()
        try:
            response = await self.client.messages.create(
                model=self.model_name,
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )
            response_time = (time.time() - start_time) * 1000
            return True, None, response_time  # Claude doesn't provide quota info easily
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return False, None, response_time

class OpenAIProvider(BaseLLMProvider):
    """OpenAI GPT provider"""
    
    def __init__(self, api_key: str, model_name: str = "gpt-4", api_base: Optional[str] = None):
        super().__init__(api_key, model_name, api_base)
        # If api_base is None, let OpenAI client use its default (which may be proxied)
        if api_base:
            self.client = openai.AsyncOpenAI(api_key=api_key, base_url=api_base)
        else:
            self.client = openai.AsyncOpenAI(api_key=api_key)
    
    async def generate_response(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> LLMResponse:
        start_time = time.time()
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            response_time = (time.time() - start_time) * 1000
            
            return LLMResponse(
                content=response.choices[0].message.content,
                tokens_used=response.usage.total_tokens,
                response_time_ms=response_time
            )
            
        except Exception as e:
            return LLMResponse(
                content="",
                error=str(e),
                response_time_ms=(time.time() - start_time) * 1000
            )
    
    async def test_connection(self) -> tuple[bool, Optional[QuotaInfo], float]:
        start_time = time.time()
        try:
            # Just test with a simple request
            await self.generate_response([{"role": "user", "content": "Hi"}], max_tokens=10)
            response_time = (time.time() - start_time) * 1000
            return True, None, response_time
                    
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return False, None, response_time

class GeminiProvider(BaseLLMProvider):
    """Google Gemini provider"""
    
    def __init__(self, api_key: str, model_name: str = "gemini-pro", api_base: Optional[str] = None):
        super().__init__(api_key, model_name, api_base)
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
    
    async def generate_response(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> LLMResponse:
        start_time = time.time()
        
        try:
            # Convert to Gemini format (simple prompt for now)
            prompt = "\n".join([f"{m.get('role', 'user')}: {m.get('content', '')}" for m in messages])
            
            response = await self.model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens
                )
            )
            
            response_time = (time.time() - start_time) * 1000
            
            return LLMResponse(
                content=response.text,
                tokens_used=response.usage_metadata.total_token_count if response.usage_metadata else 0,
                response_time_ms=response_time
            )
            
        except Exception as e:
            return LLMResponse(
                content="",
                error=str(e),
                response_time_ms=(time.time() - start_time) * 1000
            )
    
    async def test_connection(self) -> tuple[bool, Optional[QuotaInfo], float]:
        start_time = time.time()
        try:
            response = await self.model.generate_content_async("Hi", generation_config=genai.types.GenerationConfig(max_output_tokens=10))
            response_time = (time.time() - start_time) * 1000
            return True, None, response_time
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return False, None, response_time

class DeepSeekProvider(OpenAIProvider):
    """DeepSeek provider (OpenAI compatible)"""
    
    def __init__(self, api_key: str, model_name: str = "deepseek-chat", api_base: Optional[str] = None):
        api_base = api_base or "https://api.deepseek.com/v1"
        super().__init__(api_key, model_name, api_base)

class KimiProvider(OpenAIProvider):
    """Moonshot Kimi provider (OpenAI compatible)"""
    
    def __init__(self, api_key: str, model_name: str = "moonshot-v1-8k", api_base: Optional[str] = None):
        api_base = api_base or "https://api.moonshot.cn/v1"
        super().__init__(api_key, model_name, api_base)

class QwenProvider(OpenAIProvider):
    """Alibaba Qwen provider (OpenAI compatible)"""
    
    def __init__(self, api_key: str, model_name: str = "qwen-turbo", api_base: Optional[str] = None):
        api_base = api_base or "https://dashscope.aliyuncs.com/compatible-mode/v1"
        super().__init__(api_key, model_name, api_base)

class ZhipuProvider(OpenAIProvider):
    """Zhipu GLM provider (OpenAI compatible)"""
    
    def __init__(self, api_key: str, model_name: str = "glm-4", api_base: Optional[str] = None):
        api_base = api_base or "https://open.bigmodel.cn/api/paas/v4"
        super().__init__(api_key, model_name, api_base)

# Provider factory
PROVIDER_MAP = {
    "claude": ClaudeProvider,
    "openai": OpenAIProvider,
    "gemini": GeminiProvider,
    "deepseek": DeepSeekProvider,
    "kimi": KimiProvider,
    "qwen": QwenProvider,
    "zhipu": ZhipuProvider,
}

def create_provider(provider_type: str, api_key: str, model_name: str, api_base: Optional[str] = None) -> BaseLLMProvider:
    """Create a provider instance"""
    provider_class = PROVIDER_MAP.get(provider_type.lower())
    if not provider_class:
        raise ValueError(f"Unknown provider type: {provider_type}")
    
    return provider_class(api_key, model_name, api_base)

# Default providers configuration
DEFAULT_PROVIDERS = [
    {
        "name": "claude",
        "display_name": "Claude 3.5 Sonnet",
        "provider_type": "claude",
        "model_name": "claude-3-5-sonnet-20241022",
        "brand_color": "#d97757",
    },
    {
        "name": "gpt4",
        "display_name": "GPT-4 Turbo",
        "provider_type": "openai",
        "model_name": "gpt-4-turbo-preview",
        "brand_color": "#10a37f",
    },
    {
        "name": "gemini",
        "display_name": "Gemini Pro",
        "provider_type": "gemini",
        "model_name": "gemini-pro",
        "brand_color": "#4285f4",
    },
    {
        "name": "deepseek",
        "display_name": "DeepSeek Chat",
        "provider_type": "deepseek",
        "model_name": "deepseek-chat",
        "brand_color": "#4f46e5",
    },
    {
        "name": "kimi",
        "display_name": "Kimi Moonshot",
        "provider_type": "kimi",
        "model_name": "moonshot-v1-8k",
        "brand_color": "#3b82f6",
    },
    {
        "name": "qwen",
        "display_name": "通义千问",
        "provider_type": "qwen",
        "model_name": "qwen-turbo",
        "brand_color": "#1677ff",
    },
    {
        "name": "zhipu",
        "display_name": "智谱 GLM-4",
        "provider_type": "zhipu",
        "model_name": "glm-4",
        "brand_color": "#1a1a1a",
    },
]

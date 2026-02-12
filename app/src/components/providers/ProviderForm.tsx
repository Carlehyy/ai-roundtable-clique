import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import type { LLMProvider, LLMProviderCreate, LLMProviderUpdate } from '@/types';

const PROVIDER_TYPES = [
  { value: 'claude', label: 'Claude (Anthropic)', defaultModel: 'claude-3-5-sonnet-20241022', color: '#d97757' },
  { value: 'openai', label: 'OpenAI GPT', defaultModel: 'gpt-4-turbo-preview', color: '#10a37f' },
  { value: 'gemini', label: 'Google Gemini', defaultModel: 'gemini-pro', color: '#4285f4' },
  { value: 'deepseek', label: 'DeepSeek', defaultModel: 'deepseek-chat', color: '#4f46e5' },
  { value: 'kimi', label: 'Kimi Moonshot', defaultModel: 'moonshot-v1-8k', color: '#3b82f6' },
  { value: 'qwen', label: '通义千问', defaultModel: 'qwen-turbo', color: '#1677ff' },
  { value: 'zhipu', label: '智谱 GLM', defaultModel: 'glm-4', color: '#1a1a1a' },
];

interface ProviderFormProps {
  provider?: LLMProvider | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LLMProviderCreate | LLMProviderUpdate) => Promise<void>;
}

export function ProviderForm({ provider, open, onOpenChange, onSubmit }: ProviderFormProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<LLMProviderCreate>>({
    name: '',
    display_name: '',
    provider_type: 'claude',
    model_name: 'claude-3-5-sonnet-20241022',
    api_key: '',
    api_base: '',
    brand_color: '#d97757',
  });

  useEffect(() => {
    if (provider) {
      setFormData({
        name: provider.name,
        display_name: provider.display_name,
        provider_type: provider.provider_type,
        model_name: provider.model_name,
        api_key: provider.api_key || '',
        api_base: provider.api_base || '',
        brand_color: provider.brand_color,
      });
    } else {
      setFormData({
        name: '',
        display_name: '',
        provider_type: 'claude',
        model_name: 'claude-3-5-sonnet-20241022',
        api_key: '',
        api_base: '',
        brand_color: '#d97757',
      });
    }
  }, [provider, open]);

  const handleProviderTypeChange = (type: string) => {
    const providerType = PROVIDER_TYPES.find(p => p.value === type);
    if (providerType) {
      setFormData(prev => ({
        ...prev,
        provider_type: type,
        model_name: providerType.defaultModel,
        brand_color: providerType.color,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData as LLMProviderCreate);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save provider:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = !!provider;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl gradient-text">
            {isEditing ? '编辑 LLM 配置' : '添加 LLM 配置'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Provider Type */}
          <div className="space-y-2">
            <Label>LLM 类型</Label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDER_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleProviderTypeChange(type.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    formData.provider_type === type.value
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-border hover:border-cyan-500/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-sm font-medium">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">标识名称</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="例如: claude-prod"
              className="input-glow"
              disabled={isEditing}
              required
            />
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display_name">显示名称</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="例如: Claude 3.5 Sonnet"
              className="input-glow"
              required
            />
          </div>

          {/* Model Name */}
          <div className="space-y-2">
            <Label htmlFor="model_name">模型名称</Label>
            <Input
              id="model_name"
              value={formData.model_name}
              onChange={(e) => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
              placeholder="例如: claude-3-5-sonnet-20241022"
              className="input-glow"
              required
            />
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api_key">API Key</Label>
            <div className="relative">
              <Input
                id="api_key"
                type={showApiKey ? 'text' : 'password'}
                value={formData.api_key}
                onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                placeholder="输入 API Key"
                className="input-glow pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* API Base (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="api_base">
              API Base URL <span className="text-muted-foreground">(可选)</span>
            </Label>
            <Input
              id="api_base"
              value={formData.api_base}
              onChange={(e) => setFormData(prev => ({ ...prev, api_base: e.target.value }))}
              placeholder="https://api.example.com/v1"
              className="input-glow"
            />
          </div>

          {/* Brand Color */}
          <div className="space-y-2">
            <Label htmlFor="brand_color">品牌颜色</Label>
            <div className="flex gap-3">
              <input
                type="color"
                id="brand_color"
                value={formData.brand_color}
                onChange={(e) => setFormData(prev => ({ ...prev, brand_color: e.target.value }))}
                className="w-12 h-10 rounded-lg cursor-pointer border border-border"
              />
              <Input
                value={formData.brand_color}
                onChange={(e) => setFormData(prev => ({ ...prev, brand_color: e.target.value }))}
                placeholder="#3b82f6"
                className="input-glow flex-1"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              className="flex-1 btn-glow bg-gradient-to-r from-cyan-500 to-blue-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? '保存中...' : isEditing ? '保存' : '添加'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

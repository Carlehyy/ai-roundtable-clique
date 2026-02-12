import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Check, Cpu, Settings2 } from 'lucide-react';
import type { LLMProvider, SessionCreate } from '@/types';

interface CreateSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: LLMProvider[];
  onSubmit: (data: SessionCreate) => Promise<void>;
}

export function CreateSessionModal({ 
  open, 
  onOpenChange, 
  providers, 
  onSubmit 
}: CreateSessionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<Partial<SessionCreate>>({
    title: '',
    description: '',
    topic: '',
    llm_ids: [],
    max_rounds: 5,
    temperature: 0.7,
    max_tokens: 2000,
  });

  const onlineProviders = providers.filter(p => p.status === 'online');

  const toggleLLM = (id: number) => {
    setFormData(prev => ({
      ...prev,
      llm_ids: prev.llm_ids?.includes(id)
        ? prev.llm_ids.filter(lid => lid !== id)
        : [...(prev.llm_ids || []), id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.llm_ids?.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData as SessionCreate);
      onOpenChange(false);
      // Reset form
      setFormData({
        title: '',
        description: '',
        topic: '',
        llm_ids: [],
        max_rounds: 5,
        temperature: 0.7,
        max_tokens: 2000,
      });
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl gradient-text">
            发起新的头脑风暴
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">讨论标题</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="给你的讨论起个名字"
              className="input-glow"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">描述 (可选)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="简短描述讨论的目的"
              className="input-glow"
            />
          </div>

          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic">讨论话题 *</Label>
            <Textarea
              id="topic"
              value={formData.topic}
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="详细描述要讨论的话题或问题..."
              className="input-glow min-h-[100px]"
              required
            />
          </div>

          {/* LLM Selection */}
          <div className="space-y-3">
            <Label>选择参与的 AI 助手 *</Label>
            <p className="text-sm text-muted-foreground">
              只有状态为"在线"的 LLM 可以选择
            </p>
            
            {onlineProviders.length === 0 ? (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                没有可用的在线 LLM，请先配置并测试至少一个 LLM 提供商。
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {onlineProviders.map((provider) => {
                  const isSelected = formData.llm_ids?.includes(provider.id);
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => toggleLLM(provider.id)}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-border hover:border-cyan-500/50 bg-secondary/30'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-2">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ 
                            backgroundColor: `${provider.brand_color}30`,
                            color: provider.brand_color
                          }}
                        >
                          <Cpu className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-center">
                          {provider.display_name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            
            {formData.llm_ids && formData.llm_ids.length > 0 && (
              <p className="text-sm text-cyan-400">
                已选择 {formData.llm_ids.length} 个 AI 助手
              </p>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              高级设置
              <Badge variant="outline" className="text-xs">
                {showAdvanced ? '收起' : '展开'}
              </Badge>
            </button>
            
            {showAdvanced && (
              <div className="space-y-5 p-4 rounded-lg bg-secondary/30 border border-border">
                {/* Max Rounds */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>最大轮数</Label>
                    <span className="text-sm font-medium">{formData.max_rounds}</span>
                  </div>
                  <Slider
                    value={[formData.max_rounds || 5]}
                    onValueChange={([v]) => setFormData(prev => ({ ...prev, max_rounds: v }))}
                    min={1}
                    max={20}
                    step={1}
                  />
                </div>

                {/* Temperature */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>温度 (创造性)</Label>
                    <span className="text-sm font-medium">{formData.temperature}</span>
                  </div>
                  <Slider
                    value={[formData.temperature || 0.7]}
                    onValueChange={([v]) => setFormData(prev => ({ ...prev, temperature: v }))}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                </div>

                {/* Max Tokens */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>最大 Token 数</Label>
                    <span className="text-sm font-medium">{formData.max_tokens}</span>
                  </div>
                  <Slider
                    value={[formData.max_tokens || 2000]}
                    onValueChange={([v]) => setFormData(prev => ({ ...prev, max_tokens: v }))}
                    min={500}
                    max={8000}
                    step={500}
                  />
                </div>
              </div>
            )}
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
              disabled={isSubmitting || formData.llm_ids?.length === 0}
            >
              {isSubmitting ? '创建中...' : '开始讨论'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

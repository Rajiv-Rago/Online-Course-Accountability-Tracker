'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useProfile } from '../hooks/use-profile';
import { updatePreferredAiModel } from '../actions/profile-actions';
import { SUPPORTED_MODELS, DEFAULT_MODEL, type SupportedModel } from '@/lib/ai/models';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  groq: 'Groq',
  cerebras: 'Cerebras',
};

const TIER_COLORS: Record<string, string> = {
  free: 'bg-green-500/10 text-green-600 border-green-500/20',
  budget: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  standard: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  premium: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
};

function groupByProvider(models: SupportedModel[]): Map<string, SupportedModel[]> {
  const groups = new Map<string, SupportedModel[]>();
  for (const model of models) {
    const existing = groups.get(model.provider) ?? [];
    existing.push(model);
    groups.set(model.provider, existing);
  }
  return groups;
}

export function AiModelSelect() {
  const { profile, isLoading, refetch } = useProfile();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setSelectedModel(profile.preferred_ai_model || DEFAULT_MODEL);
    }
  }, [profile]);

  const displayModel = selectedModel ?? DEFAULT_MODEL;
  const currentModel = SUPPORTED_MODELS.find((m) => m.id === displayModel);
  const isDirty = profile && selectedModel !== null && selectedModel !== profile.preferred_ai_model;
  const grouped = groupByProvider(SUPPORTED_MODELS);

  const handleSave = async () => {
    if (!selectedModel) return;
    setIsSaving(true);
    try {
      await updatePreferredAiModel(selectedModel);
      await refetch();
      toast.success('AI model preference saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save preference');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || selectedModel === null) {
    return <div className="text-muted-foreground">Loading preferences...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">AI Model</h3>
        <p className="text-sm text-muted-foreground">
          Choose which AI model powers your course analysis and recommendations.
        </p>
      </div>
      <Separator />

      <div className="space-y-2">
        <Label htmlFor="ai_model">Preferred Model</Label>
        <Select value={displayModel} onValueChange={setSelectedModel}>
          <SelectTrigger id="ai_model" className="max-w-md">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {Array.from(grouped.entries()).map(([provider, models]) => (
              <SelectGroup key={provider}>
                <SelectLabel>{PROVIDER_LABELS[provider] ?? provider}</SelectLabel>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <span className="flex items-center gap-2">
                      {model.label}
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TIER_COLORS[model.tier] ?? ''}`}>
                        {model.tier}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {currentModel && (
        <div className="rounded-lg border p-4 max-w-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{currentModel.label}</span>
            <Badge variant="outline" className={TIER_COLORS[currentModel.tier] ?? ''}>
              {currentModel.tier}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{currentModel.description}</p>
          <p className="text-xs text-muted-foreground">
            Provider: {PROVIDER_LABELS[currentModel.provider] ?? currentModel.provider}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-dashed p-4 max-w-md">
        <p className="text-xs text-muted-foreground">
          If your chosen model is unavailable (rate limit, outage), the system
          automatically falls back to the next available provider.
        </p>
      </div>

      <Button onClick={handleSave} disabled={!isDirty || isSaving}>
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}

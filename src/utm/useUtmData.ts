import { useCallback, useEffect, useState } from 'react';
import { pb } from '../lib/pocketbase';

export const UTM_CATEGORIES = ['source', 'medium', 'campaign', 'term', 'content'] as const;
export const UTM_REQUIRED_FIELDS = ['source', 'medium'] as const;
export const UTM_OPTIONAL_FIELDS = ['campaign', 'term', 'content'] as const;

export type UtmCategory = (typeof UTM_CATEGORIES)[number];
export type UtmRequiredField = (typeof UTM_REQUIRED_FIELDS)[number];
export type UtmOptionalField = (typeof UTM_OPTIONAL_FIELDS)[number];

export type UtmTag = {
  id: string;
  category: UtmCategory;
  value: string;
  description?: string;
};

export type UtmTemplate = {
  id: string;
  name: string;
  description?: string;
  source: string;      // required
  medium: string;      // required
  campaign?: string;   // optional
  term?: string;       // optional
  content?: string;    // optional
};

// Validation helper
export const isValidTemplate = (template: Partial<UtmTemplate>): boolean => {
  return !!(template.name?.trim() && template.source?.trim() && template.medium?.trim());
};

// Migration helper: coerce empty strings to undefined for optional fields
export const normalizeTemplate = (data: Record<string, string>): Partial<UtmTemplate> => ({
  name: data.name,
  description: data.description || undefined,
  source: data.source,
  medium: data.medium,
  campaign: data.campaign?.trim() || undefined,
  term: data.term?.trim() || undefined,
  content: data.content?.trim() || undefined,
});

const currentUserId = () => pb.authStore.record?.id;

export const useUtmTags = () => {
  const [tags, setTags] = useState<UtmTag[]>([]);

  const fetch = useCallback(async () => {
    const userId = currentUserId();
    if (!userId) {
      setTags([]);
      return;
    }

    try {
      const records = await pb.collection('utm_tags').getFullList<UtmTag>({
        sort: 'category,value',
      });
      setTags(records);
    } catch {
      setTags([]);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const addTag = async (category: UtmCategory, value: string, description = '') => {
    const userId = currentUserId();
    if (!userId || !value.trim()) {
      return;
    }

    await pb.collection('utm_tags').create({
      category,
      value: value.trim(),
      description: description.trim(),
      user: userId,
    });
    await fetch();
  };

  const deleteTag = async (id: string) => {
    await pb.collection('utm_tags').delete(id);
    await fetch();
  };

  const updateTag = async (id: string, category: UtmCategory, value: string, description = '') => {
    const userId = currentUserId();
    if (!userId || !value.trim()) {
      return;
    }

    await pb.collection('utm_tags').update(id, {
      category,
      value: value.trim(),
      description: description.trim(),
      user: userId,
    });
    await fetch();
  };

  return { tags, addTag, updateTag, deleteTag, refetch: fetch };
};

export const useUtmTemplates = () => {
  const [templates, setTemplates] = useState<UtmTemplate[]>([]);

  const fetch = useCallback(async () => {
    const userId = currentUserId();
    if (!userId) {
      setTemplates([]);
      return;
    }

    try {
      const records = await pb.collection('utm_templates').getFullList<UtmTemplate>({
        sort: 'name',
      });
      setTemplates(records);
    } catch {
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const saveTemplate = async (data: Omit<UtmTemplate, 'id'>) => {
    const userId = currentUserId();
    if (!userId) {
      return;
    }

    const normalized = normalizeTemplate(data as Record<string, string>);
    if (!isValidTemplate(normalized)) {
      return;
    }

    await pb.collection('utm_templates').create({
      ...normalized,
      user: userId,
    });
    await fetch();
  };

  const updateTemplate = async (id: string, data: Omit<UtmTemplate, 'id'>) => {
    const userId = currentUserId();
    if (!userId) {
      return;
    }

    const normalized = normalizeTemplate(data as Record<string, string>);
    if (!isValidTemplate(normalized)) {
      return;
    }

    await pb.collection('utm_templates').update(id, {
      ...normalized,
      user: userId,
    });
    await fetch();
  };

  const deleteTemplate = async (id: string) => {
    await pb.collection('utm_templates').delete(id);
    await fetch();
  };

  return { templates, saveTemplate, updateTemplate, deleteTemplate };
};

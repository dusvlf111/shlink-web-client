import { useCallback, useEffect, useState } from 'react';
import { pb } from '../lib/pocketbase';

export const UTM_CATEGORIES = ['source', 'medium', 'campaign', 'term', 'content'] as const;
export type UtmCategory = (typeof UTM_CATEGORIES)[number];

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
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
};

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

    await pb.collection('utm_templates').create({
      ...data,
      user: userId,
    });
    await fetch();
  };

  const updateTemplate = async (id: string, data: Omit<UtmTemplate, 'id'>) => {
    const userId = currentUserId();
    if (!userId) {
      return;
    }

    await pb.collection('utm_templates').update(id, {
      ...data,
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

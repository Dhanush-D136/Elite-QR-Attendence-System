import api from './api';

export interface Spell {
  id: string;
  spell_name: string;
  start_date: string;
  end_date: string;
  is_active: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SpellsResponse {
  success: boolean;
  spells: Spell[];
  activeSpell: Spell | null;
}

export const spellManagementService = {
  // Get all spells
  getSpells: async (): Promise<SpellsResponse> => {
    const response = await api.get('/admin/spells');
    return response.data;
  },

  // Get current active spell
  getActiveSpell: async (): Promise<{ success: boolean; activeSpell: Spell | null }> => {
    const response = await api.get('/admin/spells/active');
    return response.data;
  },

  // Create new spell
  createSpell: async (spellData: {
    spell_name: string;
    start_date: string;
    end_date: string;
    status?: 'ACTIVE' | 'INACTIVE';
    is_active?: boolean | number;
  }): Promise<{ success: boolean; message: string; spell: Spell }> => {
    const response = await api.post('/admin/spells', spellData);
    return response.data;
  },

  // Update existing spell
  updateSpell: async (
    id: string,
    spellData: {
      spell_name?: string;
      start_date?: string;
      end_date?: string;
      status?: 'ACTIVE' | 'INACTIVE';
      is_active?: boolean | number;
    }
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.put(`/admin/spells/${id}`, spellData);
    return response.data;
  },

  // Set active spell
  setActiveSpell: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/admin/spells/${id}/activate`);
    return response.data;
  },

  // Duplicate spell
  duplicateSpell: async (id: string): Promise<{ success: boolean; message: string; spell: Spell }> => {
    const response = await api.post(`/admin/spells/${id}/duplicate`);
    return response.data;
  },

  // Delete spell (Non-destructive to attendance/students)
  deleteSpell: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/admin/spells/${id}`);
    return response.data;
  }
};

import { supabase } from '../lib/supabase';
import { EntryUnion } from '../types/networth';
import { Transaction } from '../types/expense';
import { AppSettings } from '../types/settings';
import { Scenario } from '../types/projection';

export interface UserDataRow {
  user_id: string;
  entries: EntryUnion[];
  transactions: Transaction[];
  settings: AppSettings | null;
  category_memory: Record<string, string>;
  categories: string[];
  scenarios: Scenario[];
  updated_at: string;
}

export async function fetchUserData(userId: string): Promise<UserDataRow | null> {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      if (error) console.error('[cloudStorage] fetchUserData error:', error.message);
      return null;
    }
    return data as UserDataRow;
  } catch (err) {
    console.error('[cloudStorage] fetchUserData unexpected error:', err);
    return null;
  }
}

export async function upsertUserData(
  userId: string,
  payload: Partial<Omit<UserDataRow, 'user_id' | 'updated_at'>>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_data')
      .upsert(
        { user_id: userId, ...payload, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) console.error('[cloudStorage] upsertUserData error:', error.message);
  } catch (err) {
    console.error('[cloudStorage] upsertUserData unexpected error:', err);
  }
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          telegram_id: number | null
          telegram_username: string | null
          display_name: string
          created_at: string
        }
        Insert: {
          id: string
          telegram_id?: number | null
          telegram_username?: string | null
          display_name: string
          created_at?: string
        }
        Update: {
          id?: string
          telegram_id?: number | null
          telegram_username?: string | null
          display_name?: string
          created_at?: string
        }
      }
      gatherings: {
        Row: {
          id: string
          title: string
          description: string | null
          creator_id: string | null
          max_slots: number
          gathering_date: string
          booking_deadline: string | null
          created_at: string
          status: 'open' | 'closed' | 'cancelled'
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          creator_id?: string | null
          max_slots?: number
          gathering_date: string
          booking_deadline?: string | null
          created_at?: string
          status?: 'open' | 'closed' | 'cancelled'
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          creator_id?: string | null
          max_slots?: number
          gathering_date?: string
          booking_deadline?: string | null
          created_at?: string
          status?: 'open' | 'closed' | 'cancelled'
        }
      }
      slots: {
        Row: {
          id: string
          gathering_id: string
          user_id: string
          slot_number: number
          booked_at: string
        }
        Insert: {
          id?: string
          gathering_id: string
          user_id: string
          slot_number: number
          booked_at?: string
        }
        Update: {
          id?: string
          gathering_id?: string
          user_id?: string
          slot_number?: number
          booked_at?: string
        }
      }
      waitlist: {
        Row: {
          id: string
          gathering_id: string
          user_id: string
          position: number
          joined_at: string
        }
        Insert: {
          id?: string
          gathering_id: string
          user_id: string
          position: number
          joined_at?: string
        }
        Update: {
          id?: string
          gathering_id?: string
          user_id?: string
          position?: number
          joined_at?: string
        }
      }
    }
    Functions: {
      book_slot: {
        Args: {
          p_gathering_id: string
          p_user_id: string
        }
        Returns: Json
      }
      join_waitlist: {
        Args: {
          p_gathering_id: string
          p_user_id: string
        }
        Returns: Json
      }
      check_available_slots: {
        Args: {
          p_gathering_id: string
        }
        Returns: boolean
      }
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Gathering = Database['public']['Tables']['gatherings']['Row']
export type Slot = Database['public']['Tables']['slots']['Row']
export type WaitlistEntry = Database['public']['Tables']['waitlist']['Row']

export type GatheringWithDetails = Gathering & {
  creator?: Profile | null
  slots?: (Slot & { user?: Profile })[]
  waitlist?: (WaitlistEntry & { user?: Profile })[]
  slots_count?: number
  is_full?: boolean
}

export type BookSlotResponse = {
  success: boolean
  slot_number?: number
  error?: string
}

export type JoinWaitlistResponse = {
  success: boolean
  position?: number
  error?: string
}


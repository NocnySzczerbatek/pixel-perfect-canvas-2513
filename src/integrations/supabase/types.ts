export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_quests: {
        Row: {
          created_at: string
          difficulty: string
          id: string
          owner_id: string
          progress: number
          quest_date: string
          quest_type: string
          reward_coins: number
          reward_item_key: string | null
          reward_item_quantity: number
          status: string
          target: number
          target_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          difficulty: string
          id?: string
          owner_id: string
          progress?: number
          quest_date: string
          quest_type: string
          reward_coins?: number
          reward_item_key?: string | null
          reward_item_quantity?: number
          status?: string
          target: number
          target_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: string
          owner_id?: string
          progress?: number
          quest_date?: string
          quest_type?: string
          reward_coins?: number
          reward_item_key?: string | null
          reward_item_quantity?: number
          status?: string
          target?: number
          target_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_quests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      encounters: {
        Row: {
          biome: string
          bot_team: Json | null
          created_at: string
          energy_cost: number
          hp_current: number
          hp_max: number
          id: string
          kind: string
          level: number
          log: Json
          owner_id: string
          reward_coins: number
          reward_exp: number
          species_id: number | null
          species_name: string | null
          species_type: string | null
          status: string
          trainer_class: string | null
          trainer_person: string | null
          updated_at: string
        }
        Insert: {
          biome: string
          bot_team?: Json | null
          created_at?: string
          energy_cost?: number
          hp_current?: number
          hp_max?: number
          id?: string
          kind: string
          level?: number
          log?: Json
          owner_id: string
          reward_coins?: number
          reward_exp?: number
          species_id?: number | null
          species_name?: string | null
          species_type?: string | null
          status?: string
          trainer_class?: string | null
          trainer_person?: string | null
          updated_at?: string
        }
        Update: {
          biome?: string
          bot_team?: Json | null
          created_at?: string
          energy_cost?: number
          hp_current?: number
          hp_max?: number
          id?: string
          kind?: string
          level?: number
          log?: Json
          owner_id?: string
          reward_coins?: number
          reward_exp?: number
          species_id?: number | null
          species_name?: string | null
          species_type?: string | null
          status?: string
          trainer_class?: string | null
          trainer_person?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encounters_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gts_listings: {
        Row: {
          buyer_id: string | null
          created_at: string
          id: string
          level: number
          pokemon_id: string | null
          price: number
          seller_id: string
          snapshot: Json | null
          sold_at: string | null
          species_id: number
          species_name: string
          species_type: string | null
          status: string
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          level?: number
          pokemon_id?: string | null
          price: number
          seller_id: string
          snapshot?: Json | null
          sold_at?: string | null
          species_id: number
          species_name: string
          species_type?: string | null
          status?: string
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          level?: number
          pokemon_id?: string | null
          price?: number
          seller_id?: string
          snapshot?: Json | null
          sold_at?: string | null
          species_id?: number
          species_name?: string
          species_type?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gts_listings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gts_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_badges: {
        Row: {
          badge_key: string
          badge_name: string
          earned_at: string
          gym_index: number
          id: string
          leader_name: string
          owner_id: string
          region: string
        }
        Insert: {
          badge_key: string
          badge_name: string
          earned_at?: string
          gym_index: number
          id?: string
          leader_name: string
          owner_id: string
          region: string
        }
        Update: {
          badge_key?: string
          badge_name?: string
          earned_at?: string
          gym_index?: number
          id?: string
          leader_name?: string
          owner_id?: string
          region?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_badges_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      oak_research: {
        Row: {
          created_at: string
          dialog_complete: string
          dialog_intro: string
          id: string
          owner_id: string
          progress: number
          research_type: string
          reward_coins: number
          reward_item_key: string | null
          reward_item_quantity: number
          stage: number
          status: string
          target: number
          target_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dialog_complete: string
          dialog_intro: string
          id?: string
          owner_id: string
          progress?: number
          research_type: string
          reward_coins?: number
          reward_item_key?: string | null
          reward_item_quantity?: number
          stage: number
          status?: string
          target: number
          target_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dialog_complete?: string
          dialog_intro?: string
          id?: string
          owner_id?: string
          progress?: number
          research_type?: string
          reward_coins?: number
          reward_item_key?: string | null
          reward_item_quantity?: number
          stage?: number
          status?: string
          target?: number
          target_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oak_research_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_items: {
        Row: {
          created_at: string
          id: string
          item_key: string
          metadata: Json
          owner_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_key: string
          metadata?: Json
          owner_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_key?: string
          metadata?: Json
          owner_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_pokemon: {
        Row: {
          ability: string | null
          caught_at: string
          exp: number
          fainted: boolean
          friendship: number
          hp_current: number
          hp_max: number
          id: string
          in_party: boolean
          is_starter: boolean
          iv_atk: number
          iv_def: number
          iv_hp: number
          iv_spa: number
          iv_spd: number
          iv_spe: number
          level: number
          nature: string | null
          nickname: string | null
          owner_id: string
          species_id: number
          species_name: string
          training_points: number
        }
        Insert: {
          ability?: string | null
          caught_at?: string
          exp?: number
          fainted?: boolean
          friendship?: number
          hp_current?: number
          hp_max?: number
          id?: string
          in_party?: boolean
          is_starter?: boolean
          iv_atk?: number
          iv_def?: number
          iv_hp?: number
          iv_spa?: number
          iv_spd?: number
          iv_spe?: number
          level?: number
          nature?: string | null
          nickname?: string | null
          owner_id: string
          species_id: number
          species_name: string
          training_points?: number
        }
        Update: {
          ability?: string | null
          caught_at?: string
          exp?: number
          fainted?: boolean
          friendship?: number
          hp_current?: number
          hp_max?: number
          id?: string
          in_party?: boolean
          is_starter?: boolean
          iv_atk?: number
          iv_def?: number
          iv_hp?: number
          iv_spa?: number
          iv_spd?: number
          iv_spe?: number
          level?: number
          nature?: string | null
          nickname?: string | null
          owner_id?: string
          species_id?: number
          species_name?: string
          training_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_pokemon_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          candy_normal: number
          candy_xl: number
          catch_coins: number
          created_at: string
          dive_balls: number
          dusk_balls: number
          energy: number
          energy_bottles: number
          energy_updated_at: string
          featured_badge: string | null
          great_balls: number
          id: string
          luxury_balls: number
          master_ball_bought_at: string | null
          master_balls: number
          mega_stones: number
          net_balls: number
          oak_stage: number
          poke_balls: number
          potions: number
          premier_balls: number
          pvp_losses: number
          pvp_wins: number
          quick_balls: number
          razz_berries: number
          region: string | null
          repeat_balls: number
          revives: number
          shield_until: string | null
          super_potions: number
          timer_balls: number
          trainer_exp: number
          trainer_level: number
          trainer_name: string
          travel_region: string | null
          travel_tickets: number
          travel_until: string | null
          tutorial_completed: boolean
          ultra_balls: number
          updated_at: string
        }
        Insert: {
          candy_normal?: number
          candy_xl?: number
          catch_coins?: number
          created_at?: string
          dive_balls?: number
          dusk_balls?: number
          energy?: number
          energy_bottles?: number
          energy_updated_at?: string
          featured_badge?: string | null
          great_balls?: number
          id: string
          luxury_balls?: number
          master_ball_bought_at?: string | null
          master_balls?: number
          mega_stones?: number
          net_balls?: number
          oak_stage?: number
          poke_balls?: number
          potions?: number
          premier_balls?: number
          pvp_losses?: number
          pvp_wins?: number
          quick_balls?: number
          razz_berries?: number
          region?: string | null
          repeat_balls?: number
          revives?: number
          shield_until?: string | null
          super_potions?: number
          timer_balls?: number
          trainer_exp?: number
          trainer_level?: number
          trainer_name: string
          travel_region?: string | null
          travel_tickets?: number
          travel_until?: string | null
          tutorial_completed?: boolean
          ultra_balls?: number
          updated_at?: string
        }
        Update: {
          candy_normal?: number
          candy_xl?: number
          catch_coins?: number
          created_at?: string
          dive_balls?: number
          dusk_balls?: number
          energy?: number
          energy_bottles?: number
          energy_updated_at?: string
          featured_badge?: string | null
          great_balls?: number
          id?: string
          luxury_balls?: number
          master_ball_bought_at?: string | null
          master_balls?: number
          mega_stones?: number
          net_balls?: number
          oak_stage?: number
          poke_balls?: number
          potions?: number
          premier_balls?: number
          pvp_losses?: number
          pvp_wins?: number
          quick_balls?: number
          razz_berries?: number
          region?: string | null
          repeat_balls?: number
          revives?: number
          shield_until?: string | null
          super_potions?: number
          timer_balls?: number
          trainer_exp?: number
          trainer_level?: number
          trainer_name?: string
          travel_region?: string | null
          travel_tickets?: number
          travel_until?: string | null
          tutorial_completed?: boolean
          ultra_balls?: number
          updated_at?: string
        }
        Relationships: []
      }
      pvp_battles_log: {
        Row: {
          coins_stolen: number
          created_at: string
          id: string
          loser_id: string | null
          winner_id: string | null
        }
        Insert: {
          coins_stolen?: number
          created_at?: string
          id?: string
          loser_id?: string | null
          winner_id?: string | null
        }
        Update: {
          coins_stolen?: number
          created_at?: string
          id?: string
          loser_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pvp_battles_log_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pvp_battles_log_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

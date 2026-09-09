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
      achievements: {
        Row: {
          achievement_key: string
          claimed_at: string
          created_at: string
          id: string
          label: string
          owner_id: string
        }
        Insert: {
          achievement_key: string
          claimed_at?: string
          created_at?: string
          id?: string
          label: string
          owner_id: string
        }
        Update: {
          achievement_key?: string
          claimed_at?: string
          created_at?: string
          id?: string
          label?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_history: {
        Row: {
          bonus_key: string
          created_at: string
          duration_minutes: number | null
          expires_at: string | null
          id: string
          kind: string
          label: string
          owner_id: string
          rare_bonus_pct: number
          shiny_bonus_pct: number
          shiny_denom_after: number | null
          shiny_denom_before: number | null
          source: string
          started_at: string
        }
        Insert: {
          bonus_key: string
          created_at?: string
          duration_minutes?: number | null
          expires_at?: string | null
          id?: string
          kind: string
          label: string
          owner_id: string
          rare_bonus_pct?: number
          shiny_bonus_pct?: number
          shiny_denom_after?: number | null
          shiny_denom_before?: number | null
          source: string
          started_at?: string
        }
        Update: {
          bonus_key?: string
          created_at?: string
          duration_minutes?: number | null
          expires_at?: string | null
          id?: string
          kind?: string
          label?: string
          owner_id?: string
          rare_bonus_pct?: number
          shiny_bonus_pct?: number
          shiny_denom_after?: number | null
          shiny_denom_before?: number | null
          source?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_history_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_login: {
        Row: {
          best_streak: number
          created_at: string
          id: string
          last_claim_date: string | null
          owner_id: string
          streak: number
          updated_at: string
        }
        Insert: {
          best_streak?: number
          created_at?: string
          id?: string
          last_claim_date?: string | null
          owner_id: string
          streak?: number
          updated_at?: string
        }
        Update: {
          best_streak?: number
          created_at?: string
          id?: string
          last_claim_date?: string | null
          owner_id?: string
          streak?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_login_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_quests: {
        Row: {
          biome: string | null
          created_at: string
          description: string | null
          difficulty: string
          id: string
          owner_id: string
          progress: number
          quest_date: string
          quest_type: string
          rerolled: boolean
          reward_coins: number
          reward_item_key: string | null
          reward_item_quantity: number
          slot: number | null
          status: string
          target: number
          target_key: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          biome?: string | null
          created_at?: string
          description?: string | null
          difficulty: string
          id?: string
          owner_id: string
          progress?: number
          quest_date: string
          quest_type: string
          rerolled?: boolean
          reward_coins?: number
          reward_item_key?: string | null
          reward_item_quantity?: number
          slot?: number | null
          status?: string
          target: number
          target_key?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          biome?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          id?: string
          owner_id?: string
          progress?: number
          quest_date?: string
          quest_type?: string
          rerolled?: boolean
          reward_coins?: number
          reward_item_key?: string | null
          reward_item_quantity?: number
          slot?: number | null
          status?: string
          target?: number
          target_key?: string | null
          title?: string | null
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
          is_shiny: boolean
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
          is_shiny?: boolean
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
          is_shiny?: boolean
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
      league_runs: {
        Row: {
          attempts: number
          champion: boolean
          cleared_stages: number
          created_at: string
          id: string
          owner_id: string
          region: string
          stage: number
          updated_at: string
        }
        Insert: {
          attempts?: number
          champion?: boolean
          cleared_stages?: number
          created_at?: string
          id?: string
          owner_id: string
          region: string
          stage?: number
          updated_at?: string
        }
        Update: {
          attempts?: number
          champion?: boolean
          cleared_stages?: number
          created_at?: string
          id?: string
          owner_id?: string
          region?: string
          stage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_runs_owner_id_fkey"
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
      payment_orders: {
        Row: {
          checkout_session_id: string
          created_at: string
          environment: string
          fulfilled_at: string | null
          id: string
          owner_id: string
          payment_intent_id: string | null
          price_id: string
          status: string
          updated_at: string
        }
        Insert: {
          checkout_session_id: string
          created_at?: string
          environment?: string
          fulfilled_at?: string | null
          id?: string
          owner_id: string
          payment_intent_id?: string | null
          price_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          checkout_session_id?: string
          created_at?: string
          environment?: string
          fulfilled_at?: string | null
          id?: string
          owner_id?: string
          payment_intent_id?: string | null
          price_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_bonuses: {
        Row: {
          bonus_key: string
          created_at: string
          id: string
          label: string
          owner_id: string
          rare_bonus_pct: number
          shiny_bonus_pct: number
          unlocked_at: string
          updated_at: string
        }
        Insert: {
          bonus_key: string
          created_at?: string
          id?: string
          label: string
          owner_id: string
          rare_bonus_pct?: number
          shiny_bonus_pct?: number
          unlocked_at?: string
          updated_at?: string
        }
        Update: {
          bonus_key?: string
          created_at?: string
          id?: string
          label?: string
          owner_id?: string
          rare_bonus_pct?: number
          shiny_bonus_pct?: number
          unlocked_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_bonuses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_buffs: {
        Row: {
          buff_key: string
          created_at: string
          expires_at: string
          id: string
          label: string
          owner_id: string
          rare_bonus_pct: number
          shiny_bonus_pct: number
          source: string
          updated_at: string
        }
        Insert: {
          buff_key: string
          created_at?: string
          expires_at: string
          id?: string
          label: string
          owner_id: string
          rare_bonus_pct?: number
          shiny_bonus_pct?: number
          source: string
          updated_at?: string
        }
        Update: {
          buff_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          label?: string
          owner_id?: string
          rare_bonus_pct?: number
          shiny_bonus_pct?: number
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_buffs_owner_id_fkey"
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
          active_moves: string[] | null
          caught_at: string
          exp: number
          fainted: boolean
          friendship: number
          hp_current: number
          hp_max: number
          id: string
          in_party: boolean
          is_shiny: boolean
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
          train_atk: number
          train_def: number
          train_hp: number
          train_spa: number
          train_spd: number
          train_spe: number
          training_points: number
        }
        Insert: {
          ability?: string | null
          active_moves?: string[] | null
          caught_at?: string
          exp?: number
          fainted?: boolean
          friendship?: number
          hp_current?: number
          hp_max?: number
          id?: string
          in_party?: boolean
          is_shiny?: boolean
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
          train_atk?: number
          train_def?: number
          train_hp?: number
          train_spa?: number
          train_spd?: number
          train_spe?: number
          training_points?: number
        }
        Update: {
          ability?: string | null
          active_moves?: string[] | null
          caught_at?: string
          exp?: number
          fainted?: boolean
          friendship?: number
          hp_current?: number
          hp_max?: number
          id?: string
          in_party?: boolean
          is_shiny?: boolean
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
          train_atk?: number
          train_def?: number
          train_hp?: number
          train_spa?: number
          train_spd?: number
          train_spe?: number
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
          avatar_key: string | null
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
          avatar_key?: string | null
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
          avatar_key?: string | null
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
      raid_runs: {
        Row: {
          boss_key: string
          boss_name: string
          created_at: string
          damage_done: number
          id: string
          level: number
          log: Json
          owner_id: string
          raid_date: string
          reward_coins: number
          rewards: Json
          species_id: number
          tier: number
          turns: number
          won: boolean
        }
        Insert: {
          boss_key: string
          boss_name: string
          created_at?: string
          damage_done?: number
          id?: string
          level: number
          log?: Json
          owner_id: string
          raid_date: string
          reward_coins?: number
          rewards?: Json
          species_id: number
          tier: number
          turns?: number
          won?: boolean
        }
        Update: {
          boss_key?: string
          boss_name?: string
          created_at?: string
          damage_done?: number
          id?: string
          level?: number
          log?: Json
          owner_id?: string
          raid_date?: string
          reward_coins?: number
          rewards?: Json
          species_id?: number
          tier?: number
          turns?: number
          won?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "raid_runs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      region_visits: {
        Row: {
          first_visit_at: string
          id: string
          last_visit_at: string
          owner_id: string
          region: string
          visits: number
        }
        Insert: {
          first_visit_at?: string
          id?: string
          last_visit_at?: string
          owner_id: string
          region: string
          visits?: number
        }
        Update: {
          first_visit_at?: string
          id?: string
          last_visit_at?: string
          owner_id?: string
          region?: string
          visits?: number
        }
        Relationships: []
      }
      tournament_entries: {
        Row: {
          battles_today: number
          created_at: string
          final_place: number | null
          id: string
          last_battle_at: string | null
          losses: number
          player_id: string
          points: number
          reward_text: string | null
          tournament_id: string
          updated_at: string
          wins: number
        }
        Insert: {
          battles_today?: number
          created_at?: string
          final_place?: number | null
          id?: string
          last_battle_at?: string | null
          losses?: number
          player_id: string
          points?: number
          reward_text?: string | null
          tournament_id: string
          updated_at?: string
          wins?: number
        }
        Update: {
          battles_today?: number
          created_at?: string
          final_place?: number | null
          id?: string
          last_battle_at?: string | null
          losses?: number
          player_id?: string
          points?: number
          reward_text?: string | null
          tournament_id?: string
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_entries_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          id: string
          status: string
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      trainer_battles: {
        Row: {
          created_at: string
          id: string
          log: Json
          opponent: string
          owner_id: string
          person: string | null
          report: Json | null
          reward_coins: number
          reward_exp: number
          trainer_class: string | null
          won: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          log?: Json
          opponent: string
          owner_id: string
          person?: string | null
          report?: Json | null
          reward_coins?: number
          reward_exp?: number
          trainer_class?: string | null
          won?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          log?: Json
          opponent?: string
          owner_id?: string
          person?: string | null
          report?: Json | null
          reward_coins?: number
          reward_exp?: number
          trainer_class?: string | null
          won?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "trainer_battles_owner_id_fkey"
            columns: ["owner_id"]
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
      fulfill_game_purchase: {
        Args: {
          _checkout_session_id: string
          _environment: string
          _owner_id: string
          _payment_intent_id: string
          _price_id: string
        }
        Returns: boolean
      }
      public_trainers: {
        Args: never
        Returns: {
          catch_coins: number
          featured_badge: string
          id: string
          pvp_losses: number
          pvp_wins: number
          region: string
          shield_until: string
          trainer_exp: number
          trainer_level: number
          trainer_name: string
        }[]
      }
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

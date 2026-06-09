export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity: {
        Row: {
          child_id: string
          content_id: string | null
          created_at: string
          detail: Json | null
          fluency_score: number | null
          id: string
          pronunciation_score: number | null
          session_id: string
          type: string
          wcpm: number | null
        }
        Insert: {
          child_id: string
          content_id?: string | null
          created_at?: string
          detail?: Json | null
          fluency_score?: number | null
          id?: string
          pronunciation_score?: number | null
          session_id: string
          type: string
          wcpm?: number | null
        }
        Update: {
          child_id?: string
          content_id?: string | null
          created_at?: string
          detail?: Json | null
          fluency_score?: number | null
          id?: string
          pronunciation_score?: number | null
          session_id?: string
          type?: string
          wcpm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "learning_session"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          birth_date: string
          cefr_level: string | null
          coach_id: string | null
          created_at: string
          id: string
          lexile: number | null
          mico_state: Json
          name: string
          parent_id: string
        }
        Insert: {
          birth_date: string
          cefr_level?: string | null
          coach_id?: string | null
          created_at?: string
          id?: string
          lexile?: number | null
          mico_state?: Json
          name: string
          parent_id: string
        }
        Update: {
          birth_date?: string
          cefr_level?: string | null
          coach_id?: string | null
          created_at?: string
          id?: string
          lexile?: number | null
          mico_state?: Json
          name?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_message: {
        Row: {
          ai_draft: string | null
          body: string
          child_id: string
          coach_id: string
          id: string
          parent_cheer: boolean
          sent_at: string | null
          status: string
        }
        Insert: {
          ai_draft?: string | null
          body: string
          child_id: string
          coach_id: string
          id?: string
          parent_cheer?: boolean
          sent_at?: string | null
          status?: string
        }
        Update: {
          ai_draft?: string | null
          body?: string
          child_id?: string
          coach_id?: string
          id?: string
          parent_cheer?: boolean
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_message_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_message_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          body: Json | null
          cefr_level: string | null
          created_at: string
          id: string
          lexile: number | null
          title: string
          type: string
        }
        Insert: {
          body?: Json | null
          cefr_level?: string | null
          created_at?: string
          id?: string
          lexile?: number | null
          title: string
          type: string
        }
        Update: {
          body?: Json | null
          cefr_level?: string | null
          created_at?: string
          id?: string
          lexile?: number | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      daily_plan: {
        Row: {
          book_id: string | null
          child_id: string
          created_at: string
          id: string
          plan_date: string
          shadow_clip_id: string | null
          status: string
          word_card_ids: Json
        }
        Insert: {
          book_id?: string | null
          child_id: string
          created_at?: string
          id?: string
          plan_date: string
          shadow_clip_id?: string | null
          status?: string
          word_card_ids?: Json
        }
        Update: {
          book_id?: string | null
          child_id?: string
          created_at?: string
          id?: string
          plan_date?: string
          shadow_clip_id?: string | null
          status?: string
          word_card_ids?: Json
        }
        Relationships: [
          {
            foreignKeyName: "daily_plan_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_plan_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_plan_shadow_clip_id_fkey"
            columns: ["shadow_clip_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_session: {
        Row: {
          child_id: string
          ended_at: string | null
          id: string
          plan_id: string | null
          started_at: string
        }
        Insert: {
          child_id: string
          ended_at?: string | null
          id?: string
          plan_id?: string | null
          started_at?: string
        }
        Update: {
          child_id?: string
          ended_at?: string | null
          id?: string
          plan_id?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_session_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_session_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "daily_plan"
            referencedColumns: ["id"]
          },
        ]
      }
      progress: {
        Row: {
          child_id: string
          last_active: string | null
          stickers: Json
          streak_days: number
          total_stars: number
        }
        Insert: {
          child_id: string
          last_active?: string | null
          stickers?: Json
          streak_days?: number
          total_stars?: number
        }
        Update: {
          child_id?: string
          last_active?: string | null
          stickers?: Json
          streak_days?: number
          total_stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "progress_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          status: string
          trial_end: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status: string
          trial_end?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          trial_end?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      weekly_report: {
        Row: {
          ai_summary: string | null
          child_id: string
          coach_reviewed: boolean
          id: string
          metrics: Json
          opened_at: string | null
          sent_at: string | null
          week_start: string
        }
        Insert: {
          ai_summary?: string | null
          child_id: string
          coach_reviewed?: boolean
          id?: string
          metrics?: Json
          opened_at?: string | null
          sent_at?: string | null
          week_start: string
        }
        Update: {
          ai_summary?: string | null
          child_id?: string
          coach_reviewed?: boolean
          id?: string
          metrics?: Json
          opened_at?: string | null
          sent_at?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_report_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      word_card: {
        Row: {
          child_id: string
          created_at: string
          due_date: string
          ease: number
          id: string
          interval_days: number
          source_content_id: string | null
          status: string
          word: string
        }
        Insert: {
          child_id: string
          created_at?: string
          due_date: string
          ease?: number
          id?: string
          interval_days?: number
          source_content_id?: string | null
          status?: string
          word: string
        }
        Update: {
          child_id?: string
          created_at?: string
          due_date?: string
          ease?: number
          id?: string
          interval_days?: number
          source_content_id?: string | null
          status?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "word_card_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "word_card_source_content_id_fkey"
            columns: ["source_content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_child: { Args: { p_child: string }; Returns: boolean }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


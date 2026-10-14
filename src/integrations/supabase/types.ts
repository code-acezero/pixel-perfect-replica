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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          body: string
          id: string
          level: string
          location: string
          savings: number | null
          title: string
          ts: number
        }
        Insert: {
          body?: string
          id: string
          level: string
          location?: string
          savings?: number | null
          title: string
          ts: number
        }
        Update: {
          body?: string
          id?: string
          level?: string
          location?: string
          savings?: number | null
          title?: string
          ts?: number
        }
        Relationships: []
      }
      buyers: {
        Row: {
          id: string
          name: string
          region: string
          score_limit: number
          system: string
        }
        Insert: {
          id: string
          name: string
          region?: string
          score_limit?: number
          system?: string
        }
        Update: {
          id?: string
          name?: string
          region?: string
          score_limit?: number
          system?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          id: string
          issued_at: number
          issued_by: string | null
          issuer: string
          roll_id: string
          score: number
          verdict: string
        }
        Insert: {
          id: string
          issued_at: number
          issued_by?: string | null
          issuer: string
          roll_id: string
          score: number
          verdict: string
        }
        Update: {
          id?: string
          issued_at?: number
          issued_by?: string | null
          issuer?: string
          roll_id?: string
          score?: number
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_roll_id_fkey"
            columns: ["roll_id"]
            isOneToOne: false
            referencedRelation: "rolls"
            referencedColumns: ["id"]
          },
        ]
      }
      defects: {
        Row: {
          cls: string
          confidence: number
          created_by: string | null
          id: string
          meter: number
          original_cls: string | null
          points: number
          reviewer: string | null
          roll_id: string
          session_id: string
          source: string
          status: string
          thumb_path: string | null
          ts: number
          x: number
        }
        Insert: {
          cls: string
          confidence?: number
          created_by?: string | null
          id: string
          meter?: number
          original_cls?: string | null
          points: number
          reviewer?: string | null
          roll_id: string
          session_id?: string
          source?: string
          status?: string
          thumb_path?: string | null
          ts: number
          x?: number
        }
        Update: {
          cls?: string
          confidence?: number
          created_by?: string | null
          id?: string
          meter?: number
          original_cls?: string | null
          points?: number
          reviewer?: string | null
          roll_id?: string
          session_id?: string
          source?: string
          status?: string
          thumb_path?: string | null
          ts?: number
          x?: number
        }
        Relationships: [
          {
            foreignKeyName: "defects_roll_id_fkey"
            columns: ["roll_id"]
            isOneToOne: false
            referencedRelation: "rolls"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          calibrated: boolean
          fps: number
          id: string
          kind: string
          last_session: string
          location: string
          name: string
          quality: number
          resolution: string
          status: string
        }
        Insert: {
          calibrated?: boolean
          fps?: number
          id: string
          kind: string
          last_session?: string
          location?: string
          name: string
          quality?: number
          resolution?: string
          status?: string
        }
        Update: {
          calibrated?: boolean
          fps?: number
          id?: string
          kind?: string
          last_session?: string
          location?: string
          name?: string
          quality?: number
          resolution?: string
          status?: string
        }
        Relationships: []
      }
      inspection_sessions: {
        Row: {
          created_by: string | null
          device_id: string
          id: string
          inspector: string
          location: string
          meters_inspected: number
          roll_id: string
          site: string
          started_at: number
          status: string
        }
        Insert: {
          created_by?: string | null
          device_id?: string
          id: string
          inspector?: string
          location?: string
          meters_inspected?: number
          roll_id: string
          site?: string
          started_at: number
          status?: string
        }
        Update: {
          created_by?: string | null
          device_id?: string
          id?: string
          inspector?: string
          location?: string
          meters_inspected?: number
          roll_id?: string
          site?: string
          started_at?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_sessions_roll_id_fkey"
            columns: ["roll_id"]
            isOneToOne: false
            referencedRelation: "rolls"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      rolls: {
        Row: {
          article: string
          bow_pct: number
          buyer_id: string
          gsm: number
          gsm_measured: number
          id: string
          length_m: number
          line: string
          lot: string
          shade_de: number
          shrink_pct: number
          site: string
          status: string
          supplier: string
          width_in: number
          width_measured: number
          yarn_lot: string
        }
        Insert: {
          article: string
          bow_pct?: number
          buyer_id: string
          gsm?: number
          gsm_measured?: number
          id: string
          length_m?: number
          line?: string
          lot?: string
          shade_de?: number
          shrink_pct?: number
          site?: string
          status?: string
          supplier?: string
          width_in?: number
          width_measured?: number
          yarn_lot?: string
        }
        Update: {
          article?: string
          bow_pct?: number
          buyer_id?: string
          gsm?: number
          gsm_measured?: number
          id?: string
          length_m?: number
          line?: string
          lot?: string
          shade_de?: number
          shrink_pct?: number
          site?: string
          status?: string
          supplier?: string
          width_in?: number
          width_measured?: number
          yarn_lot?: string
        }
        Relationships: [
          {
            foreignKeyName: "rolls_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      training_examples: {
        Row: {
          cls: string
          created_at: string
          created_by: string | null
          defect_id: string | null
          id: string
          image_path: string
          note: string
          points: number
          source: string
        }
        Insert: {
          cls: string
          created_at?: string
          created_by?: string | null
          defect_id?: string | null
          id?: string
          image_path: string
          note?: string
          points?: number
          source?: string
        }
        Update: {
          cls?: string
          created_at?: string
          created_by?: string | null
          defect_id?: string | null
          id?: string
          image_path?: string
          note?: string
          points?: number
          source?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      verify_certificate: {
        Args: { _id: string }
        Returns: {
          article: string
          buyer: string
          id: string
          issued_at: number
          issuer: string
          roll_id: string
          score: number
          verdict: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "field_inspector"
        | "qc_lead"
        | "quality_manager"
        | "plant_admin"
        | "buyer_auditor"
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
    Enums: {
      app_role: [
        "field_inspector",
        "qc_lead",
        "quality_manager",
        "plant_admin",
        "buyer_auditor",
      ],
    },
  },
} as const

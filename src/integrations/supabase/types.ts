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
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          author_office: string
          category_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          published_at: string | null
          status: Database["public"]["Enums"]["announcement_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_office?: string
          category_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_office?: string
          category_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "announcement_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_attachments: {
        Row: {
          complaint_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string
          size_bytes: number
          uploaded_by: string
        }
        Insert: {
          complaint_id: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type: string
          size_bytes: number
          uploaded_by: string
        }
        Update: {
          complaint_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_attachments_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_status_history: {
        Row: {
          changed_by: string | null
          complaint_id: string
          created_at: string
          id: string
          remark: string | null
          status: Database["public"]["Enums"]["complaint_status"]
        }
        Insert: {
          changed_by?: string | null
          complaint_id: string
          created_at?: string
          id?: string
          remark?: string | null
          status: Database["public"]["Enums"]["complaint_status"]
        }
        Update: {
          changed_by?: string | null
          complaint_id?: string
          created_at?: string
          id?: string
          remark?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
        }
        Relationships: [
          {
            foreignKeyName: "complaint_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_status_history_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          id: string
          incident_date: string
          latest_remark: string | null
          location: string
          reference_no: string
          resident_id: string
          status: Database["public"]["Enums"]["complaint_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          incident_date: string
          latest_remark?: string | null
          location: string
          reference_no: string
          resident_id: string
          status?: Database["public"]["Enums"]["complaint_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          incident_date?: string
          latest_remark?: string | null
          location?: string
          reference_no?: string
          resident_id?: string
          status?: Database["public"]["Enums"]["complaint_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          contact_number: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          privacy_consent_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          contact_number?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean
          privacy_consent_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          contact_number?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          privacy_consent_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          requirements: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          requirements?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          requirements?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_request_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string
          request_id: string
          size_bytes: number
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type: string
          request_id: string
          size_bytes: number
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string
          request_id?: string
          size_bytes?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_request_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          remark: string | null
          request_id: string
          status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          remark?: string | null
          request_id: string
          status: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          remark?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "service_request_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          additional_info: string | null
          admin_remarks: string | null
          category_id: string
          created_at: string
          id: string
          processed_by: string | null
          purpose: string
          reference_no: string
          resident_id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          additional_info?: string | null
          admin_remarks?: string | null
          category_id: string
          created_at?: string
          id?: string
          processed_by?: string | null
          purpose: string
          reference_no: string
          resident_id: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          additional_info?: string | null
          admin_remarks?: string | null
          category_id?: string
          created_at?: string
          id?: string
          processed_by?: string | null
          purpose?: string
          reference_no?: string
          resident_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_permissions: {
        Row: {
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["staff_permission"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: Database["public"]["Enums"]["staff_permission"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["staff_permission"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      admin_dashboard_stats: { Args: never; Returns: Json }
      admin_setup_open: { Args: never; Returns: boolean }
      has_permission: {
        Args: {
          _perm: Database["public"]["Enums"]["staff_permission"]
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff_or_admin: { Args: { _user_id: string }; Returns: boolean }
      list_accounts: {
        Args: {
          _active?: boolean
          _limit?: number
          _offset?: number
          _q?: string
          _role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: {
          address: string
          contact_number: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          permissions: Database["public"]["Enums"]["staff_permission"][]
          roles: Database["public"]["Enums"]["app_role"][]
          total: number
        }[]
      }
      notify: {
        Args: { _link: string; _message: string; _title: string; _user: string }
        Returns: undefined
      }
      write_log: {
        Args: {
          _action: string
          _actor: string
          _description: string
          _entity_id: string
          _entity_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      announcement_status: "draft" | "published"
      app_role: "admin" | "staff" | "resident"
      complaint_status:
        | "pending"
        | "under_review"
        | "in_progress"
        | "resolved"
        | "closed"
        | "rejected"
      request_status:
        | "pending"
        | "under_review"
        | "approved"
        | "rejected"
        | "completed"
      staff_permission:
        | "view_complaints"
        | "review_complaints"
        | "update_assigned_complaints"
        | "view_requests"
        | "process_requests"
        | "view_residents"
        | "manage_announcements"
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
      announcement_status: ["draft", "published"],
      app_role: ["admin", "staff", "resident"],
      complaint_status: [
        "pending",
        "under_review",
        "in_progress",
        "resolved",
        "closed",
        "rejected",
      ],
      request_status: [
        "pending",
        "under_review",
        "approved",
        "rejected",
        "completed",
      ],
      staff_permission: [
        "view_complaints",
        "review_complaints",
        "update_assigned_complaints",
        "view_requests",
        "process_requests",
        "view_residents",
        "manage_announcements",
      ],
    },
  },
} as const

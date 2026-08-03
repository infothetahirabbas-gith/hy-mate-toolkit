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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agent_conversations: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memories: {
        Row: {
          category: string
          content: string
          created_at: string
          employee_id: string | null
          id: string
          importance: number
          memory_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          employee_id?: string | null
          id?: string
          importance?: number
          memory_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          importance?: number
          memory_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memories_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_employee_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_employees: {
        Row: {
          accent: string
          agent_configuration: Json
          available_tools: string[]
          avatar_url: string | null
          business_benefits: string[]
          category: string
          category_id: string | null
          created_at: string
          daily_tasks: string[]
          department: string
          description: string
          features: string[]
          gender: string
          id: string
          integrations: string[]
          is_active: boolean
          knowledge_base: Json
          main_responsibility: string
          name: string
          persona: string
          personality: string[]
          price_monthly: number
          reviews: Json
          role_title: string
          skills: string[]
          slug: string
          sort_order: number
          status: string
          system_prompt: string | null
          tagline: string
          target_customers: string[]
          updated_at: string
          workspace_input_label: string
          workspace_input_placeholder: string
        }
        Insert: {
          accent?: string
          agent_configuration?: Json
          available_tools?: string[]
          avatar_url?: string | null
          business_benefits?: string[]
          category: string
          category_id?: string | null
          created_at?: string
          daily_tasks?: string[]
          department?: string
          description: string
          features?: string[]
          gender?: string
          id?: string
          integrations?: string[]
          is_active?: boolean
          knowledge_base?: Json
          main_responsibility?: string
          name: string
          persona: string
          personality?: string[]
          price_monthly: number
          reviews?: Json
          role_title: string
          skills?: string[]
          slug: string
          sort_order?: number
          status?: string
          system_prompt?: string | null
          tagline: string
          target_customers?: string[]
          updated_at?: string
          workspace_input_label?: string
          workspace_input_placeholder?: string
        }
        Update: {
          accent?: string
          agent_configuration?: Json
          available_tools?: string[]
          avatar_url?: string | null
          business_benefits?: string[]
          category?: string
          category_id?: string | null
          created_at?: string
          daily_tasks?: string[]
          department?: string
          description?: string
          features?: string[]
          gender?: string
          id?: string
          integrations?: string[]
          is_active?: boolean
          knowledge_base?: Json
          main_responsibility?: string
          name?: string
          persona?: string
          personality?: string[]
          price_monthly?: number
          reviews?: Json
          role_title?: string
          skills?: string[]
          slug?: string
          sort_order?: number
          status?: string
          system_prompt?: string | null
          tagline?: string
          target_customers?: string[]
          updated_at?: string
          workspace_input_label?: string
          workspace_input_placeholder?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_employees_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ai_employee_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          deadline: string | null
          description: string | null
          employee_id: string
          error: string | null
          id: string
          input: string | null
          priority: string
          result: Json | null
          status: string
          task_name: string
          task_type: string
          tools_required: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          employee_id: string
          error?: string | null
          id?: string
          input?: string | null
          priority?: string
          result?: Json | null
          status?: string
          task_name: string
          task_type?: string
          tools_required?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          employee_id?: string
          error?: string | null
          id?: string
          input?: string | null
          priority?: string
          result?: Json | null
          status?: string
          task_name?: string
          task_type?: string
          tools_required?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          brand_info: string | null
          business_name: string | null
          country: string | null
          created_at: string
          goals: string | null
          industry: string | null
          primary_goal: string | null
          target_audience: string | null
          target_customer: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          brand_info?: string | null
          business_name?: string | null
          country?: string | null
          created_at?: string
          goals?: string | null
          industry?: string | null
          primary_goal?: string | null
          target_audience?: string | null
          target_customer?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          brand_info?: string | null
          business_name?: string | null
          country?: string | null
          created_at?: string
          goals?: string | null
          industry?: string | null
          primary_goal?: string | null
          target_audience?: string | null
          target_customer?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      employee_performance: {
        Row: {
          created_at: string
          day: string
          employee_id: string
          id: string
          minutes_saved: number
          reports_generated: number
          tasks_completed: number
          tasks_failed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          employee_id: string
          id?: string
          minutes_saved?: number
          reports_generated?: number
          tasks_completed?: number
          tasks_failed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          employee_id?: string
          id?: string
          minutes_saved?: number
          reports_generated?: number
          tasks_completed?: number
          tasks_failed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_performance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_skills: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          proficiency: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          proficiency?: string
          skill_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          proficiency?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          content: string
          created_at: string
          doc_type: string
          employee_id: string | null
          id: string
          source_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          doc_type?: string
          employee_id?: string | null
          id?: string
          source_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          doc_type?: string
          employee_id?: string | null
          id?: string
          source_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          employee_id: string | null
          id: string
          kind: string
          read_at: string | null
          task_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          task_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          task_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          company_website: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          name: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          company_website?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id: string
          industry?: string | null
          name?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          company_website?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          content: Json
          created_at: string
          employee_id: string | null
          id: string
          report_type: string | null
          summary: string | null
          task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          employee_id?: string | null
          id?: string
          report_type?: string | null
          summary?: string | null
          task_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          employee_id?: string | null
          id?: string
          report_type?: string | null
          summary?: string | null
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string
          created_at: string
          description: string
          difficulty: string
          id: string
          name: string
          required_tools: string[]
          slug: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          difficulty?: string
          id?: string
          name: string
          required_tools?: string[]
          slug: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          difficulty?: string
          id?: string
          name?: string
          required_tools?: string[]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_feedback: {
        Row: {
          correction: string | null
          created_at: string
          employee_id: string
          id: string
          rating: number
          task_id: string | null
          user_id: string
        }
        Insert: {
          correction?: string | null
          created_at?: string
          employee_id: string
          id?: string
          rating?: number
          task_id?: string | null
          user_id: string
        }
        Update: {
          correction?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          rating?: number
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_feedback_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_feedback_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_integrations: {
        Row: {
          account_label: string | null
          category: string
          connected_at: string
          created_at: string
          id: string
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          category: string
          connected_at?: string
          created_at?: string
          id?: string
          provider: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          category?: string
          connected_at?: string
          created_at?: string
          id?: string
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_subscriptions: {
        Row: {
          activated_at: string | null
          amount: number
          billing_cycle: string
          brand_voice: string | null
          cancelled_at: string | null
          display_name: string | null
          employee_id: string
          end_date: string | null
          id: string
          instructions: string | null
          onboarding_completed: boolean
          plan: string
          plan_name: string
          price_monthly: number
          start_date: string
          status: string
          subscription_date: string
          user_id: string
          working_preferences: string | null
        }
        Insert: {
          activated_at?: string | null
          amount?: number
          billing_cycle?: string
          brand_voice?: string | null
          cancelled_at?: string | null
          display_name?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          instructions?: string | null
          onboarding_completed?: boolean
          plan?: string
          plan_name?: string
          price_monthly?: number
          start_date?: string
          status?: string
          subscription_date?: string
          user_id: string
          working_preferences?: string | null
        }
        Update: {
          activated_at?: string | null
          amount?: number
          billing_cycle?: string
          brand_voice?: string | null
          cancelled_at?: string | null
          display_name?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          instructions?: string | null
          onboarding_completed?: boolean
          plan?: string
          plan_name?: string
          price_monthly?: number
          start_date?: string
          status?: string
          subscription_date?: string
          user_id?: string
          working_preferences?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const

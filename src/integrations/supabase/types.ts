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
      action_risk_policies: {
        Row: {
          created_at: string
          id: string
          requires_approval: boolean
          target_key: string
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requires_approval?: boolean
          target_key: string
          target_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requires_approval?: boolean
          target_key?: string
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          confidence: number
          content: string
          created_at: string
          employee_id: string | null
          id: string
          importance: number
          memory_type: string
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          confidence?: number
          content: string
          created_at?: string
          employee_id?: string | null
          id?: string
          importance?: number
          memory_type?: string
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          confidence?: number
          content?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          importance?: number
          memory_type?: string
          source?: string
          status?: string
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
          avg_completion_minutes: number
          business_benefits: string[]
          businesses_served: number
          category: string
          category_id: string | null
          cost_savings_monthly: number
          created_at: string
          daily_tasks: string[]
          department: string
          department_slug: string | null
          description: string
          experience_years: number
          faqs: Json
          features: string[]
          gender: string
          hours_saved_monthly: number
          id: string
          integrations: string[]
          intro_line: string | null
          is_active: boolean
          knowledge_base: Json
          languages: string[]
          last_updated_on: string
          main_responsibility: string
          name: string
          persona: string
          personality: string[]
          portfolio: Json
          price_monthly: number
          rating: number
          review_count: number
          reviews: Json
          role_title: string
          satisfaction: number
          skill_levels: Json
          skills: string[]
          slug: string
          sort_order: number
          status: string
          success_rate: number
          system_prompt: string | null
          tagline: string
          target_customers: string[]
          tasks_completed: number
          team_slug: string | null
          tool_status: Json
          updated_at: string
          verified: boolean
          version: string
          workspace_input_label: string
          workspace_input_placeholder: string
        }
        Insert: {
          accent?: string
          agent_configuration?: Json
          available_tools?: string[]
          avatar_url?: string | null
          avg_completion_minutes?: number
          business_benefits?: string[]
          businesses_served?: number
          category: string
          category_id?: string | null
          cost_savings_monthly?: number
          created_at?: string
          daily_tasks?: string[]
          department?: string
          department_slug?: string | null
          description: string
          experience_years?: number
          faqs?: Json
          features?: string[]
          gender?: string
          hours_saved_monthly?: number
          id?: string
          integrations?: string[]
          intro_line?: string | null
          is_active?: boolean
          knowledge_base?: Json
          languages?: string[]
          last_updated_on?: string
          main_responsibility?: string
          name: string
          persona: string
          personality?: string[]
          portfolio?: Json
          price_monthly: number
          rating?: number
          review_count?: number
          reviews?: Json
          role_title: string
          satisfaction?: number
          skill_levels?: Json
          skills?: string[]
          slug: string
          sort_order?: number
          status?: string
          success_rate?: number
          system_prompt?: string | null
          tagline: string
          target_customers?: string[]
          tasks_completed?: number
          team_slug?: string | null
          tool_status?: Json
          updated_at?: string
          verified?: boolean
          version?: string
          workspace_input_label?: string
          workspace_input_placeholder?: string
        }
        Update: {
          accent?: string
          agent_configuration?: Json
          available_tools?: string[]
          avatar_url?: string | null
          avg_completion_minutes?: number
          business_benefits?: string[]
          businesses_served?: number
          category?: string
          category_id?: string | null
          cost_savings_monthly?: number
          created_at?: string
          daily_tasks?: string[]
          department?: string
          department_slug?: string | null
          description?: string
          experience_years?: number
          faqs?: Json
          features?: string[]
          gender?: string
          hours_saved_monthly?: number
          id?: string
          integrations?: string[]
          intro_line?: string | null
          is_active?: boolean
          knowledge_base?: Json
          languages?: string[]
          last_updated_on?: string
          main_responsibility?: string
          name?: string
          persona?: string
          personality?: string[]
          portfolio?: Json
          price_monthly?: number
          rating?: number
          review_count?: number
          reviews?: Json
          role_title?: string
          satisfaction?: number
          skill_levels?: Json
          skills?: string[]
          slug?: string
          sort_order?: number
          status?: string
          success_rate?: number
          system_prompt?: string | null
          tagline?: string
          target_customers?: string[]
          tasks_completed?: number
          team_slug?: string | null
          tool_status?: Json
          updated_at?: string
          verified?: boolean
          version?: string
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
      ai_project_members: {
        Row: {
          contribution: Json | null
          created_at: string
          employee_id: string
          id: string
          project_id: string
          project_role: string
          status: string
          user_id: string
        }
        Insert: {
          contribution?: Json | null
          created_at?: string
          employee_id: string
          id?: string
          project_id: string
          project_role?: string
          status?: string
          user_id: string
        }
        Update: {
          contribution?: Json | null
          created_at?: string
          employee_id?: string
          id?: string
          project_id?: string
          project_role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_project_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_project_messages: {
        Row: {
          author: string
          content: string
          created_at: string
          employee_id: string | null
          id: string
          kind: string
          project_id: string
          user_id: string
        }
        Insert: {
          author?: string
          content: string
          created_at?: string
          employee_id?: string | null
          id?: string
          kind?: string
          project_id: string
          user_id: string
        }
        Update: {
          author?: string
          content?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          kind?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_project_messages_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_projects: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          final_output: Json | null
          goal: string | null
          id: string
          name: string
          progress: number
          shared_knowledge: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          final_output?: Json | null
          goal?: string | null
          id?: string
          name: string
          progress?: number
          shared_knowledge?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          final_output?: Json | null
          goal?: string | null
          id?: string
          name?: string
          progress?: number
          shared_knowledge?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          project_id: string | null
          requires_approval: boolean
          result: Json | null
          status: string
          steps: Json
          task_name: string
          task_type: string
          tools_required: string[]
          tools_used: string[]
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
          project_id?: string | null
          requires_approval?: boolean
          result?: Json | null
          status?: string
          steps?: Json
          task_name: string
          task_type?: string
          tools_required?: string[]
          tools_used?: string[]
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
          project_id?: string | null
          requires_approval?: boolean
          result?: Json | null
          status?: string
          steps?: Json
          task_name?: string
          task_type?: string
          tools_required?: string[]
          tools_used?: string[]
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
          {
            foreignKeyName: "ai_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_teams: {
        Row: {
          created_at: string
          department_slug: string | null
          description: string | null
          id: string
          name: string
          price_monthly: number
          slug: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_slug?: string | null
          description?: string | null
          id?: string
          name: string
          price_monthly?: number
          slug: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_slug?: string | null
          description?: string | null
          id?: string
          name?: string
          price_monthly?: number
          slug?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          action_id: string | null
          created_at: string
          data_used: string | null
          decided_at: string | null
          decision_note: string | null
          employee_id: string | null
          expected_result: string | null
          id: string
          payload: Json
          reason: string | null
          risk: string
          status: string
          target: string | null
          task_id: string | null
          title: string
          tool_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_id?: string | null
          created_at?: string
          data_used?: string | null
          decided_at?: string | null
          decision_note?: string | null
          employee_id?: string | null
          expected_result?: string | null
          id?: string
          payload?: Json
          reason?: string | null
          risk?: string
          status?: string
          target?: string | null
          task_id?: string | null
          title: string
          tool_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_id?: string | null
          created_at?: string
          data_used?: string | null
          decided_at?: string | null
          decision_note?: string | null
          employee_id?: string | null
          expected_result?: string | null
          id?: string
          payload?: Json
          reason?: string | null
          risk?: string
          status?: string
          target?: string | null
          task_id?: string | null
          title?: string
          tool_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "task_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_label: string | null
          actor_type: string
          created_at: string
          id: string
          metadata: Json
          new_value: Json | null
          previous_value: Json | null
          resource_id: string | null
          resource_type: string
          result: string
          risk: string | null
          user_id: string
        }
        Insert: {
          action: string
          actor_label?: string | null
          actor_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          previous_value?: Json | null
          resource_id?: string | null
          resource_type: string
          result?: string
          risk?: string | null
          user_id: string
        }
        Update: {
          action?: string
          actor_label?: string | null
          actor_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          new_value?: Json | null
          previous_value?: Json | null
          resource_id?: string | null
          resource_type?: string
          result?: string
          risk?: string | null
          user_id?: string
        }
        Relationships: []
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
      company_goal_steps: {
        Row: {
          created_at: string
          department_slug: string | null
          detail: string | null
          employee_id: string | null
          expected_outcome: string | null
          goal_id: string
          id: string
          owner_role: string
          requires_approval: boolean
          result: string | null
          risk: string
          sequence: number
          status: string
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_slug?: string | null
          detail?: string | null
          employee_id?: string | null
          expected_outcome?: string | null
          goal_id: string
          id?: string
          owner_role?: string
          requires_approval?: boolean
          result?: string | null
          risk?: string
          sequence?: number
          status?: string
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_slug?: string | null
          detail?: string | null
          employee_id?: string | null
          expected_outcome?: string | null
          goal_id?: string
          id?: string
          owner_role?: string
          requires_approval?: boolean
          result?: string | null
          risk?: string
          sequence?: number
          status?: string
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_goal_steps_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_goal_steps_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "company_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_goal_steps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      company_goals: {
        Row: {
          autonomy_level: string
          budget: number
          context: string | null
          created_at: string
          currency: string
          deadline: string | null
          goal: string
          id: string
          kpis: Json
          progress: number
          risks: Json
          status: string
          strategy: Json
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          autonomy_level?: string
          budget?: number
          context?: string | null
          created_at?: string
          currency?: string
          deadline?: string | null
          goal: string
          id?: string
          kpis?: Json
          progress?: number
          risks?: Json
          status?: string
          strategy?: Json
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          autonomy_level?: string
          budget?: number
          context?: string | null
          created_at?: string
          currency?: string
          deadline?: string | null
          goal?: string
          id?: string
          kpis?: Json
          progress?: number
          risks?: Json
          status?: string
          strategy?: Json
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      departments: {
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
      employee_tool_permissions: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          permission: string
          tool_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          permission?: string
          tool_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          permission?: string
          tool_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_tool_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_accounts: {
        Row: {
          account_type: string
          balance: number
          code: string | null
          created_at: string
          currency: string
          id: string
          institution: string | null
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          balance?: number
          code?: string | null
          created_at?: string
          currency?: string
          id?: string
          institution?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          balance?: number
          code?: string | null
          created_at?: string
          currency?: string
          id?: string
          institution?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fin_budgets: {
        Row: {
          actual: number
          category: string
          created_at: string
          currency: string
          department: string | null
          id: string
          period_month: string
          planned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          actual?: number
          category: string
          created_at?: string
          currency?: string
          department?: string | null
          id?: string
          period_month: string
          planned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          actual?: number
          category?: string
          created_at?: string
          currency?: string
          department?: string | null
          id?: string
          period_month?: string
          planned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fin_compliance_checks: {
        Row: {
          control: string
          created_at: string
          description: string | null
          framework: string
          id: string
          last_checked_at: string | null
          notes: string | null
          severity: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          control: string
          created_at?: string
          description?: string | null
          framework?: string
          id?: string
          last_checked_at?: string | null
          notes?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          control?: string
          created_at?: string
          description?: string | null
          framework?: string
          id?: string
          last_checked_at?: string | null
          notes?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fin_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          department: string | null
          expense_date: string
          id: string
          notes: string | null
          recurring: boolean
          status: string
          updated_at: string
          user_id: string
          vendor: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          department?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          recurring?: boolean
          status?: string
          updated_at?: string
          user_id: string
          vendor: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          department?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          recurring?: boolean
          status?: string
          updated_at?: string
          user_id?: string
          vendor?: string
        }
        Relationships: []
      }
      fin_forecasts: {
        Row: {
          amount: number
          confidence: number
          created_at: string
          generated_by: string
          high: number | null
          horizon_month: string
          id: string
          low: number | null
          method: string
          metric: string
          user_id: string
        }
        Insert: {
          amount?: number
          confidence?: number
          created_at?: string
          generated_by?: string
          high?: number | null
          horizon_month: string
          id?: string
          low?: number | null
          method?: string
          metric: string
          user_id: string
        }
        Update: {
          amount?: number
          confidence?: number
          created_at?: string
          generated_by?: string
          high?: number | null
          horizon_month?: string
          id?: string
          low?: number | null
          method?: string
          metric?: string
          user_id?: string
        }
        Relationships: []
      }
      fin_goal_steps: {
        Row: {
          created_at: string
          detail: string | null
          expected_impact: number
          goal_id: string
          id: string
          owner_role: string
          requires_approval: boolean
          result: string | null
          risk: string
          sequence: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          expected_impact?: number
          goal_id: string
          id?: string
          owner_role?: string
          requires_approval?: boolean
          result?: string | null
          risk?: string
          sequence?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          expected_impact?: number
          goal_id?: string
          id?: string
          owner_role?: string
          requires_approval?: boolean
          result?: string | null
          risk?: string
          sequence?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_goal_steps_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "fin_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_goals: {
        Row: {
          autonomy_level: string
          baseline_amount: number
          created_at: string
          current_amount: number
          description: string | null
          due_date: string | null
          id: string
          progress: number
          realized_savings: number
          status: string
          target_change_pct: number
          target_metric: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          autonomy_level?: string
          baseline_amount?: number
          created_at?: string
          current_amount?: number
          description?: string | null
          due_date?: string | null
          id?: string
          progress?: number
          realized_savings?: number
          status?: string
          target_change_pct?: number
          target_metric?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          autonomy_level?: string
          baseline_amount?: number
          created_at?: string
          current_amount?: number
          description?: string | null
          due_date?: string | null
          id?: string
          progress?: number
          realized_savings?: number
          status?: string
          target_change_pct?: number
          target_metric?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fin_insights: {
        Row: {
          confidence: number
          created_at: string
          detail: string | null
          employee_id: string | null
          evidence: Json
          id: string
          impact_amount: number
          kind: string
          severity: string
          source: string
          status: string
          title: string
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          confidence?: number
          created_at?: string
          detail?: string | null
          employee_id?: string | null
          evidence?: Json
          id?: string
          impact_amount?: number
          kind?: string
          severity?: string
          source?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          confidence?: number
          created_at?: string
          detail?: string | null
          employee_id?: string | null
          evidence?: Json
          id?: string
          impact_amount?: number
          kind?: string
          severity?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fin_insights_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_invoices: {
        Row: {
          amount: number
          counterparty: string
          created_at: string
          currency: string
          due_date: string | null
          id: string
          issue_date: string
          kind: string
          notes: string | null
          number: string
          paid_at: string | null
          status: string
          tax_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          counterparty: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          kind?: string
          notes?: string | null
          number: string
          paid_at?: string | null
          status?: string
          tax_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          counterparty?: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          kind?: string
          notes?: string | null
          number?: string
          paid_at?: string | null
          status?: string
          tax_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fin_settings: {
        Row: {
          approval_threshold: number
          autonomy_level: string
          base_currency: string
          created_at: string
          fiscal_year_start: number
          require_approval_high_risk: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_threshold?: number
          autonomy_level?: string
          base_currency?: string
          created_at?: string
          fiscal_year_start?: number
          require_approval_high_risk?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_threshold?: number
          autonomy_level?: string
          base_currency?: string
          created_at?: string
          fiscal_year_start?: number
          require_approval_high_risk?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fin_transactions: {
        Row: {
          account_id: string | null
          amount: number
          anomaly_reason: string | null
          category: string
          counterparty: string | null
          created_at: string
          currency: string
          description: string
          direction: string
          id: string
          is_anomaly: boolean
          metadata: Json
          source: string
          status: string
          txn_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          anomaly_reason?: string | null
          category?: string
          counterparty?: string | null
          created_at?: string
          currency?: string
          description: string
          direction?: string
          id?: string
          is_anomaly?: boolean
          metadata?: Json
          source?: string
          status?: string
          txn_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          anomaly_reason?: string | null
          category?: string
          counterparty?: string | null
          created_at?: string
          currency?: string
          description?: string
          direction?: string
          id?: string
          is_anomaly?: boolean
          metadata?: Json
          source?: string
          status?: string
          txn_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
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
      memory_settings: {
        Row: {
          auto_save: boolean
          created_at: string
          require_approval: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_save?: boolean
          created_at?: string
          require_approval?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_save?: boolean
          created_at?: string
          require_approval?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      task_actions: {
        Row: {
          attempts: number
          completed_at: string | null
          connector_id: string | null
          created_at: string
          description: string | null
          employee_id: string | null
          error: string | null
          id: string
          operation: string
          params: Json
          requires_approval: boolean
          result: Json | null
          risk: string
          sequence: number
          started_at: string | null
          status: string
          task_id: string | null
          title: string
          tool_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          connector_id?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string | null
          error?: string | null
          id?: string
          operation?: string
          params?: Json
          requires_approval?: boolean
          result?: Json | null
          risk?: string
          sequence?: number
          started_at?: string | null
          status?: string
          task_id?: string | null
          title: string
          tool_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          connector_id?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string | null
          error?: string | null
          id?: string
          operation?: string
          params?: Json
          requires_approval?: boolean
          result?: Json | null
          risk?: string
          sequence?: number
          started_at?: string | null
          status?: string
          task_id?: string | null
          title?: string
          tool_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_actions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_actions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ai_tasks"
            referencedColumns: ["id"]
          },
        ]
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
      tool_activity_logs: {
        Row: {
          action: string
          created_at: string
          employee_id: string | null
          id: string
          outcome: string
          project_id: string | null
          task_id: string | null
          tool_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          employee_id?: string | null
          id?: string
          outcome?: string
          project_id?: string | null
          task_id?: string | null
          tool_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          outcome?: string
          project_id?: string | null
          task_id?: string | null
          tool_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_activity_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_activity_logs_task_id_fkey"
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
          connector_id: string | null
          created_at: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          permission_level: string
          provider: string
          scopes: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          category: string
          connected_at?: string
          connector_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          permission_level?: string
          provider: string
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          category?: string
          connected_at?: string
          connector_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          permission_level?: string
          provider?: string
          scopes?: string[]
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
          department_slug: string | null
          display_name: string | null
          employee_id: string
          end_date: string | null
          id: string
          instructions: string | null
          onboarding_completed: boolean
          plan: string
          plan_name: string
          price_monthly: number
          scope: string
          start_date: string
          status: string
          subscription_date: string
          team_slug: string | null
          user_id: string
          working_preferences: string | null
        }
        Insert: {
          activated_at?: string | null
          amount?: number
          billing_cycle?: string
          brand_voice?: string | null
          cancelled_at?: string | null
          department_slug?: string | null
          display_name?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          instructions?: string | null
          onboarding_completed?: boolean
          plan?: string
          plan_name?: string
          price_monthly?: number
          scope?: string
          start_date?: string
          status?: string
          subscription_date?: string
          team_slug?: string | null
          user_id: string
          working_preferences?: string | null
        }
        Update: {
          activated_at?: string | null
          amount?: number
          billing_cycle?: string
          brand_voice?: string | null
          cancelled_at?: string | null
          department_slug?: string | null
          display_name?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          instructions?: string | null
          onboarding_completed?: boolean
          plan?: string
          plan_name?: string
          price_monthly?: number
          scope?: string
          start_date?: string
          status?: string
          subscription_date?: string
          team_slug?: string | null
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
      workflow_runs: {
        Row: {
          created_at: string
          id: string
          log: Json
          status: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log?: Json
          status?: string
          user_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log?: Json
          status?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          last_run_at: string | null
          name: string
          run_count: number
          status: string
          steps: Json
          trigger_config: Json
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          run_count?: number
          status?: string
          steps?: Json
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          run_count?: number
          status?: string
          steps?: Json
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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

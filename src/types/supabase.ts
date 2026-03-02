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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      archived_assets: {
        Row: {
          add_to_ppm: boolean | null
          archived_by: string | null
          archived_on: string | null
          area_id: string | null
          asset_code: string | null
          category_id: string | null
          code: string | null
          company_id: string | null
          contractor_id: string | null
          created_at: string | null
          date_of_purchase: string | null
          deactivated_on: string | null
          document_url: string | null
          id: string
          installed_on: string | null
          is_active: boolean | null
          label: string | null
          manufacturer: string | null
          model: string | null
          next_service_due: string | null
          original_asset_id: string | null
          ppm_services_per_year: number | null
          serial_number: string | null
          site_id: string | null
          status: string | null
          type: string | null
          under_warranty: boolean | null
          updated_at: string | null
          warranty_callout_info: string | null
          warranty_length_years: number | null
        }
        Insert: {
          add_to_ppm?: boolean | null
          archived_by?: string | null
          archived_on?: string | null
          area_id?: string | null
          asset_code?: string | null
          category_id?: string | null
          code?: string | null
          company_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          date_of_purchase?: string | null
          deactivated_on?: string | null
          document_url?: string | null
          id?: string
          installed_on?: string | null
          is_active?: boolean | null
          label?: string | null
          manufacturer?: string | null
          model?: string | null
          next_service_due?: string | null
          original_asset_id?: string | null
          ppm_services_per_year?: number | null
          serial_number?: string | null
          site_id?: string | null
          status?: string | null
          type?: string | null
          under_warranty?: boolean | null
          updated_at?: string | null
          warranty_callout_info?: string | null
          warranty_length_years?: number | null
        }
        Update: {
          add_to_ppm?: boolean | null
          archived_by?: string | null
          archived_on?: string | null
          area_id?: string | null
          asset_code?: string | null
          category_id?: string | null
          code?: string | null
          company_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          date_of_purchase?: string | null
          deactivated_on?: string | null
          document_url?: string | null
          id?: string
          installed_on?: string | null
          is_active?: boolean | null
          label?: string | null
          manufacturer?: string | null
          model?: string | null
          next_service_due?: string | null
          original_asset_id?: string | null
          ppm_services_per_year?: number | null
          serial_number?: string | null
          site_id?: string | null
          status?: string | null
          type?: string | null
          under_warranty?: boolean | null
          updated_at?: string | null
          warranty_callout_info?: string | null
          warranty_length_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "archived_assets_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_assets_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_assets_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_assets_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      archived_users: {
        Row: {
          app_role: string | null
          archived_at: string | null
          auth_user_id: string | null
          boh_foh: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          original_id: string | null
          position: string | null
          role: string | null
          site_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          app_role?: string | null
          archived_at?: string | null
          auth_user_id?: string | null
          boh_foh?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          original_id?: string | null
          position?: string | null
          role?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          app_role?: string | null
          archived_at?: string | null
          auth_user_id?: string | null
          boh_foh?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          original_id?: string | null
          position?: string | null
          role?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "archived_users_original_id_fkey"
            columns: ["original_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_users_original_id_fkey"
            columns: ["original_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_users_original_id_fkey"
            columns: ["original_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_users_original_id_fkey"
            columns: ["original_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_breakdowns: {
        Row: {
          asset_id: string | null
          company_id: string | null
          contractor_id: string | null
          cost: number | null
          created_at: string | null
          fault_summary: string | null
          id: string
          notes: string | null
          reported_by: string | null
          reported_on: string | null
          resolved_on: string | null
          site_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          company_id?: string | null
          contractor_id?: string | null
          cost?: number | null
          created_at?: string | null
          fault_summary?: string | null
          id?: string
          notes?: string | null
          reported_by?: string | null
          reported_on?: string | null
          resolved_on?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          company_id?: string | null
          contractor_id?: string | null
          cost?: number | null
          created_at?: string | null
          fault_summary?: string | null
          id?: string
          notes?: string | null
          reported_by?: string | null
          reported_on?: string | null
          resolved_on?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_breakdowns_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_uptime_report"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_breakdowns_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_breakdowns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "asset_breakdowns_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "asset_breakdowns_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          brand: string | null
          category: string | null
          company_id: string | null
          created_at: string | null
          id: string
          install_date: string | null
          last_service_date: string | null
          model: string | null
          name: string
          next_service_date: string | null
          notes: string | null
          ppm_contractor_id: string | null
          ppm_frequency_months: number | null
          ppm_status: string | null
          purchase_date: string | null
          reactive_contractor_id: string | null
          serial_number: string | null
          site_id: string | null
          status: string | null
          updated_at: string | null
          warranty_contractor_id: string | null
          warranty_end: string | null
          working_temp_max: number | null
          working_temp_min: number | null
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          brand?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          install_date?: string | null
          last_service_date?: string | null
          model?: string | null
          name: string
          next_service_date?: string | null
          notes?: string | null
          ppm_contractor_id?: string | null
          ppm_frequency_months?: number | null
          ppm_status?: string | null
          purchase_date?: string | null
          reactive_contractor_id?: string | null
          serial_number?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
          warranty_contractor_id?: string | null
          warranty_end?: string | null
          working_temp_max?: number | null
          working_temp_min?: number | null
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          brand?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          install_date?: string | null
          last_service_date?: string | null
          model?: string | null
          name?: string
          next_service_date?: string | null
          notes?: string | null
          ppm_contractor_id?: string | null
          ppm_frequency_months?: number | null
          ppm_status?: string | null
          purchase_date?: string | null
          reactive_contractor_id?: string | null
          serial_number?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
          warranty_contractor_id?: string | null
          warranty_end?: string | null
          working_temp_max?: number | null
          working_temp_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_company_id_fkey1"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_company_id_fkey1"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_contractor_id_fkey1"
            columns: ["ppm_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_contractor_id_fkey1"
            columns: ["ppm_contractor_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "assets_site_id_fkey1"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_site_id_fkey1"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_conversations: {
        Row: {
          company_id: string
          content: string
          created_at: string | null
          feedback_text: string | null
          id: string
          knowledge_refs: string[] | null
          role: string
          session_id: string
          user_id: string
          was_helpful: boolean | null
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          knowledge_refs?: string[] | null
          role: string
          session_id: string
          user_id: string
          was_helpful?: boolean | null
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          knowledge_refs?: string[] | null
          role?: string
          session_id?: string
          user_id?: string
          was_helpful?: boolean | null
        }
        Relationships: []
      }
      callouts: {
        Row: {
          asset_id: string
          attachments: Json | null
          callout_type: string
          closed_at: string | null
          company_id: string
          contractor_id: string | null
          created_at: string | null
          created_by: string
          documents: Json | null
          fault_description: string | null
          id: string
          log_timeline: Json | null
          notes: string | null
          priority: string
          reopened: boolean | null
          reopened_at: string | null
          repair_summary: string | null
          site_id: string | null
          status: string
          troubleshooting_complete: boolean | null
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          attachments?: Json | null
          callout_type: string
          closed_at?: string | null
          company_id: string
          contractor_id?: string | null
          created_at?: string | null
          created_by: string
          documents?: Json | null
          fault_description?: string | null
          id?: string
          log_timeline?: Json | null
          notes?: string | null
          priority?: string
          reopened?: boolean | null
          reopened_at?: string | null
          repair_summary?: string | null
          site_id?: string | null
          status?: string
          troubleshooting_complete?: boolean | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          attachments?: Json | null
          callout_type?: string
          closed_at?: string | null
          company_id?: string
          contractor_id?: string | null
          created_at?: string | null
          created_by?: string
          documents?: Json | null
          fault_description?: string | null
          id?: string
          log_timeline?: Json | null
          notes?: string | null
          priority?: string
          reopened?: boolean | null
          reopened_at?: string | null
          repair_summary?: string | null
          site_id?: string | null
          status?: string
          troubleshooting_complete?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "callouts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_uptime_report"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "callouts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callouts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "callouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callouts_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callouts_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "callouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callouts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "callouts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_tasks: {
        Row: {
          assigned_to_role: string | null
          assigned_to_user_id: string | null
          company_id: string
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          created_at: string
          custom_instructions: string | null
          custom_name: string | null
          daypart: string | null
          due_date: string
          due_time: string | null
          escalated: boolean | null
          escalated_to: string | null
          escalation_reason: string | null
          expires_at: string | null
          flag_reason: string | null
          flagged: boolean | null
          generated_at: string | null
          id: string
          priority: string | null
          site_checklist_id: string | null
          site_id: string | null
          status: string | null
          task_data: Json | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to_role?: string | null
          assigned_to_user_id?: string | null
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string
          custom_instructions?: string | null
          custom_name?: string | null
          daypart?: string | null
          due_date: string
          due_time?: string | null
          escalated?: boolean | null
          escalated_to?: string | null
          escalation_reason?: string | null
          expires_at?: string | null
          flag_reason?: string | null
          flagged?: boolean | null
          generated_at?: string | null
          id?: string
          priority?: string | null
          site_checklist_id?: string | null
          site_id?: string | null
          status?: string | null
          task_data?: Json | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to_role?: string | null
          assigned_to_user_id?: string | null
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string
          custom_instructions?: string | null
          custom_name?: string | null
          daypart?: string | null
          due_date?: string
          due_time?: string | null
          escalated?: boolean | null
          escalated_to?: string | null
          escalation_reason?: string | null
          expires_at?: string | null
          flag_reason?: string | null
          flagged?: boolean | null
          generated_at?: string | null
          id?: string
          priority?: string | null
          site_checklist_id?: string | null
          site_id?: string | null
          status?: string | null
          task_data?: Json | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "checklist_tasks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["template_category"]
          company_id: string | null
          created_at: string | null
          day_part: string | null
          default_selected: boolean
          description: string | null
          form_schema: Json | null
          frequency: Database["public"]["Enums"]["freq"]
          id: string
          library_id: string | null
          name: string
          notes: string | null
          role_required: string | null
          site_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: Database["public"]["Enums"]["template_category"]
          company_id?: string | null
          created_at?: string | null
          day_part?: string | null
          default_selected?: boolean
          description?: string | null
          form_schema?: Json | null
          frequency: Database["public"]["Enums"]["freq"]
          id?: string
          library_id?: string | null
          name: string
          notes?: string | null
          role_required?: string | null
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["template_category"]
          company_id?: string | null
          created_at?: string | null
          day_part?: string | null
          default_selected?: boolean
          description?: string | null
          form_schema?: Json | null
          frequency?: Database["public"]["Enums"]["freq"]
          id?: string
          library_id?: string | null
          name?: string
          notes?: string | null
          role_required?: string | null
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_templates_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "task_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_templates_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "checklist_templates_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          active: boolean
          created_at: string | null
          frequency: Database["public"]["Enums"]["freq"]
          id: string
          name: string
          site_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          frequency: Database["public"]["Enums"]["freq"]
          id?: string
          name: string
          site_id: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          frequency?: Database["public"]["Enums"]["freq"]
          id?: string
          name?: string
          site_id?: string
        }
        Relationships: []
      }
      chemicals: {
        Row: {
          coshh_url: string | null
          dilution_instructions: string | null
          id: string
          name: string
          ppe_required: string[] | null
          purpose: string | null
          site_id: string | null
          supplier: string | null
        }
        Insert: {
          coshh_url?: string | null
          dilution_instructions?: string | null
          id?: string
          name: string
          ppe_required?: string[] | null
          purpose?: string | null
          site_id?: string | null
          supplier?: string | null
        }
        Update: {
          coshh_url?: string | null
          dilution_instructions?: string | null
          id?: string
          name?: string
          ppe_required?: string[] | null
          purpose?: string | null
          site_id?: string | null
          supplier?: string | null
        }
        Relationships: []
      }
      chemicals_library: {
        Row: {
          company_id: string
          contact_time: string | null
          coshh_sheet_url: string | null
          created_at: string
          dilution_ratio: string | null
          environmental_info: string | null
          first_aid_instructions: string | null
          hazard_symbols: string[] | null
          id: string
          linked_risks: string[] | null
          manufacturer: string | null
          notes: string | null
          pack_size: string | null
          product_name: string
          required_ppe: string[] | null
          storage_requirements: string | null
          supplier: string | null
          unit_cost: number | null
          updated_at: string
          use_case: string | null
        }
        Insert: {
          company_id: string
          contact_time?: string | null
          coshh_sheet_url?: string | null
          created_at?: string
          dilution_ratio?: string | null
          environmental_info?: string | null
          first_aid_instructions?: string | null
          hazard_symbols?: string[] | null
          id?: string
          linked_risks?: string[] | null
          manufacturer?: string | null
          notes?: string | null
          pack_size?: string | null
          product_name: string
          required_ppe?: string[] | null
          storage_requirements?: string | null
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
          use_case?: string | null
        }
        Update: {
          company_id?: string
          contact_time?: string | null
          coshh_sheet_url?: string | null
          created_at?: string
          dilution_ratio?: string | null
          environmental_info?: string | null
          first_aid_instructions?: string | null
          hazard_symbols?: string[] | null
          id?: string
          linked_risks?: string[] | null
          manufacturer?: string | null
          notes?: string | null
          pack_size?: string | null
          product_name?: string
          required_ppe?: string[] | null
          storage_requirements?: string | null
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
          use_case?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chemicals_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chemicals_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_id: string | null
          company_number: string | null
          contact_email: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          id: string
          industry: string | null
          legal_name: string | null
          logo_url: string | null
          name: string
          onboarding_step: number | null
          phone: string | null
          postcode: string | null
          setup_status: string | null
          site_id: string | null
          status: string | null
          stripe_customer_id: string | null
          updated_at: string | null
          user_id: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id?: string | null
          company_number?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name: string
          onboarding_step?: number | null
          phone?: string | null
          postcode?: string | null
          setup_status?: string | null
          site_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id?: string | null
          company_number?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          industry?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          onboarding_step?: number | null
          phone?: string | null
          postcode?: string | null
          setup_status?: string | null
          site_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "companies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      companies_backup: {
        Row: {
          company_number: string | null
          contact_email: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          industry: string | null
          legal_name: string | null
          name: string | null
          onboarding_step: number | null
          owner_id: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          company_number?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          industry?: string | null
          legal_name?: string | null
          name?: string | null
          onboarding_step?: number | null
          owner_id?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          company_number?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          industry?: string | null
          legal_name?: string | null
          name?: string | null
          onboarding_step?: number | null
          owner_id?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_addon_purchases: {
        Row: {
          addon_id: string
          cancelled_at: string | null
          company_id: string
          created_at: string | null
          hardware_cost_total: number | null
          id: string
          monthly_recurring_cost: number | null
          notes: string | null
          purchased_at: string | null
          quantity: number | null
          quantity_per_site: number | null
          status: string
          total_price: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          addon_id: string
          cancelled_at?: string | null
          company_id: string
          created_at?: string | null
          hardware_cost_total?: number | null
          id?: string
          monthly_recurring_cost?: number | null
          notes?: string | null
          purchased_at?: string | null
          quantity?: number | null
          quantity_per_site?: number | null
          status?: string
          total_price: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          addon_id?: string
          cancelled_at?: string | null
          company_id?: string
          created_at?: string | null
          hardware_cost_total?: number | null
          id?: string
          monthly_recurring_cost?: number | null
          notes?: string | null
          purchased_at?: string | null
          quantity?: number | null
          quantity_per_site?: number | null
          status?: string
          total_price?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_addon_purchases_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "subscription_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addon_purchases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addon_purchases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_addon_site_quantities: {
        Row: {
          company_addon_purchase_id: string
          created_at: string | null
          id: string
          quantity: number
          site_id: string
          updated_at: string | null
        }
        Insert: {
          company_addon_purchase_id: string
          created_at?: string | null
          id?: string
          quantity?: number
          site_id: string
          updated_at?: string | null
        }
        Update: {
          company_addon_purchase_id?: string
          created_at?: string | null
          id?: string
          quantity?: number
          site_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_addon_site_quantities_company_addon_purchase_id_fkey"
            columns: ["company_addon_purchase_id"]
            isOneToOne: false
            referencedRelation: "company_addon_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_addon_site_quantities_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "company_addon_site_quantities_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      company_departments: {
        Row: {
          base_department_id: string | null
          code: string
          company_id: string
          id: string
          is_active: boolean | null
          label: string
        }
        Insert: {
          base_department_id?: string | null
          code: string
          company_id: string
          id?: string
          is_active?: boolean | null
          label: string
        }
        Update: {
          base_department_id?: string | null
          code?: string
          company_id?: string
          id?: string
          is_active?: boolean | null
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_departments_base_department_id_fkey"
            columns: ["base_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          billing_address: Json | null
          billing_email: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          company_id: string
          created_at: string | null
          id: string
          monthly_amount: number | null
          notes: string | null
          payment_method: string | null
          plan_id: string
          site_count: number | null
          status: string
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          trial_ends_at: string
          trial_started_at: string | null
          trial_used: boolean | null
          updated_at: string | null
        }
        Insert: {
          billing_address?: Json | null
          billing_email?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          monthly_amount?: number | null
          notes?: string | null
          payment_method?: string | null
          plan_id: string
          site_count?: number | null
          status?: string
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          trial_ends_at: string
          trial_started_at?: string | null
          trial_used?: boolean | null
          updated_at?: string | null
        }
        Update: {
          billing_address?: Json | null
          billing_email?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          monthly_amount?: number | null
          notes?: string | null
          payment_method?: string | null
          plan_id?: string
          site_count?: number | null
          status?: string
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          trial_ends_at?: string
          trial_started_at?: string | null
          trial_used?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_categories: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      contractor_sites: {
        Row: {
          contractor_id: string | null
          id: string
          site_id: string | null
        }
        Insert: {
          contractor_id?: string | null
          id?: string
          site_id?: string | null
        }
        Update: {
          contractor_id?: string | null
          id?: string
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      contractors: {
        Row: {
          address: string | null
          callout_fee: number | null
          category: string
          category_id: string | null
          company_id: string | null
          contact_name: string | null
          contract_expiry: string | null
          contract_file: string | null
          contract_start: string | null
          created_at: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          ooh: string | null
          ooh_phone: string | null
          phone: string | null
          postcode: string | null
          region: string | null
          site_id: string | null
          status: string | null
          type: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          callout_fee?: number | null
          category?: string
          category_id?: string | null
          company_id?: string | null
          contact_name?: string | null
          contract_expiry?: string | null
          contract_file?: string | null
          contract_start?: string | null
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          ooh?: string | null
          ooh_phone?: string | null
          phone?: string | null
          postcode?: string | null
          region?: string | null
          site_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          callout_fee?: number | null
          category?: string
          category_id?: string | null
          company_id?: string | null
          contact_name?: string | null
          contract_expiry?: string | null
          contract_file?: string | null
          contract_start?: string | null
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          ooh?: string | null
          ooh_phone?: string | null
          phone?: string | null
          postcode?: string | null
          region?: string | null
          site_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "contractor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractors_company_id_fkey1"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractors_company_id_fkey1"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractors_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "contractors_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          last_read_message_id: string | null
          left_at: string | null
          muted_until: string | null
          notification_preferences: Json | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          left_at?: string | null
          muted_until?: string | null
          notification_preferences?: Json | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          left_at?: string | null
          muted_until?: string | null
          notification_preferences?: Json | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived_at: string | null
          avatar_url: string | null
          company_id: string | null
          context_id: string | null
          context_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_pinned: boolean | null
          last_message_at: string | null
          name: string | null
          site_id: string | null
          topic: string | null
          topic_category: string | null
          type: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          avatar_url?: string | null
          company_id?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean | null
          last_message_at?: string | null
          name?: string | null
          site_id?: string | null
          topic?: string | null
          topic_category?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          avatar_url?: string | null
          company_id?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean | null
          last_message_at?: string | null
          name?: string | null
          site_id?: string | null
          topic?: string | null
          topic_category?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "conversations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations_backup: {
        Row: {
          archived_at: string | null
          avatar_url: string | null
          company_id: string | null
          context_id: string | null
          context_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          is_pinned: boolean | null
          last_message_at: string | null
          name: string | null
          site_id: string | null
          topic: string | null
          topic_category: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          avatar_url?: string | null
          company_id?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          name?: string | null
          site_id?: string | null
          topic?: string | null
          topic_category?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          avatar_url?: string | null
          company_id?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          name?: string | null
          site_id?: string | null
          topic?: string | null
          topic_category?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coshh_data_sheets: {
        Row: {
          chemical_id: string | null
          company_id: string
          created_at: string | null
          document_type: string | null
          emergency_contact: string | null
          expiry_date: string | null
          expiry_reminder_sent: boolean | null
          file_name: string
          file_size_kb: number | null
          file_url: string
          hazard_types: string[] | null
          id: string
          issue_date: string | null
          manufacturer: string | null
          notes: string | null
          product_name: string
          review_reminder_sent: boolean | null
          revision_number: string | null
          status: string | null
          updated_at: string | null
          uploaded_by: string | null
          verification_status: string | null
          verified_by: string | null
          verified_date: string | null
        }
        Insert: {
          chemical_id?: string | null
          company_id: string
          created_at?: string | null
          document_type?: string | null
          emergency_contact?: string | null
          expiry_date?: string | null
          expiry_reminder_sent?: boolean | null
          file_name: string
          file_size_kb?: number | null
          file_url: string
          hazard_types?: string[] | null
          id?: string
          issue_date?: string | null
          manufacturer?: string | null
          notes?: string | null
          product_name: string
          review_reminder_sent?: boolean | null
          revision_number?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          verification_status?: string | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Update: {
          chemical_id?: string | null
          company_id?: string
          created_at?: string | null
          document_type?: string | null
          emergency_contact?: string | null
          expiry_date?: string | null
          expiry_reminder_sent?: boolean | null
          file_name?: string
          file_size_kb?: number | null
          file_url?: string
          hazard_types?: string[] | null
          id?: string
          issue_date?: string | null
          manufacturer?: string | null
          notes?: string | null
          product_name?: string
          review_reminder_sent?: boolean | null
          revision_number?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          verification_status?: string | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coshh_data_sheets_chemical_id_fkey"
            columns: ["chemical_id"]
            isOneToOne: false
            referencedRelation: "chemicals_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coshh_data_sheets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coshh_data_sheets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      coshh_register: {
        Row: {
          chemical_name: string
          company_id: string | null
          created_at: string | null
          id: string
          last_review_date: string | null
          msds_url: string | null
          next_review_date: string | null
          responsible_person: string | null
          site_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          chemical_name: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          last_review_date?: string | null
          msds_url?: string | null
          next_review_date?: string | null
          responsible_person?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          chemical_name?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          last_review_date?: string | null
          msds_url?: string | null
          next_review_date?: string | null
          responsible_person?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coshh_register_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coshh_register_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coshh_register_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coshh_register_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      dashboard_preferences: {
        Row: {
          columns: number | null
          company_id: string | null
          created_at: string | null
          id: string
          layout_type: string | null
          updated_at: string | null
          user_id: string
          widget_config: Json
        }
        Insert: {
          columns?: number | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          layout_type?: string | null
          updated_at?: string | null
          user_id: string
          widget_config?: Json
        }
        Update: {
          columns?: number | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          layout_type?: string | null
          updated_at?: string | null
          user_id?: string
          widget_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      data_export_requests: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          expires_at: string | null
          export_type: string
          file_size_bytes: number | null
          file_url: string | null
          id: string
          requested_at: string | null
          requested_by: string | null
          status: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_export_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_export_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      day_parts: {
        Row: {
          company_id: string
          end_time: string
          id: string
          name: string
          sort_order: number
          start_time: string
        }
        Insert: {
          company_id: string
          end_time: string
          id?: string
          name: string
          sort_order: number
          start_time: string
        }
        Update: {
          company_id?: string
          end_time?: string
          id?: string
          name?: string
          sort_order?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_parts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_parts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dayparts: {
        Row: {
          end_time: string | null
          id: string
          name: string | null
          site_id: string | null
          start_time: string | null
        }
        Insert: {
          end_time?: string | null
          id?: string
          name?: string | null
          site_id?: string | null
          start_time?: string | null
        }
        Update: {
          end_time?: string | null
          id?: string
          name?: string | null
          site_id?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dayparts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dayparts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          id: string
          is_active: boolean | null
          label: string
        }
        Insert: {
          code: string
          id?: string
          is_active?: boolean | null
          label: string
        }
        Update: {
          code?: string
          id?: string
          is_active?: boolean | null
          label?: string
        }
        Relationships: []
      }
      device_accounts: {
        Row: {
          active: boolean
          created_at: string
          device_auth_user_id: string
          label: string | null
          site_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          device_auth_user_id: string
          label?: string | null
          site_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          device_auth_user_id?: string
          label?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_accounts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_accounts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      disposables_library: {
        Row: {
          category: string | null
          color_finish: string | null
          company_id: string
          created_at: string
          dimensions: string | null
          eco_friendly: boolean | null
          id: string
          item_name: string
          material: string | null
          notes: string | null
          pack_cost: number | null
          pack_size: number | null
          reorder_level: number | null
          storage_location: string | null
          supplier: string | null
          updated_at: string
          usage_context: string | null
        }
        Insert: {
          category?: string | null
          color_finish?: string | null
          company_id: string
          created_at?: string
          dimensions?: string | null
          eco_friendly?: boolean | null
          id?: string
          item_name: string
          material?: string | null
          notes?: string | null
          pack_cost?: number | null
          pack_size?: number | null
          reorder_level?: number | null
          storage_location?: string | null
          supplier?: string | null
          updated_at?: string
          usage_context?: string | null
        }
        Update: {
          category?: string | null
          color_finish?: string | null
          company_id?: string
          created_at?: string
          dimensions?: string | null
          eco_friendly?: boolean | null
          id?: string
          item_name?: string
          material?: string | null
          notes?: string | null
          pack_cost?: number | null
          pack_size?: number | null
          reorder_level?: number | null
          storage_location?: string | null
          supplier?: string | null
          updated_at?: string
          usage_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disposables_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disposables_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      drinks_library: {
        Row: {
          abv: number | null
          allergens: string[] | null
          category: string | null
          company_id: string
          created_at: string
          id: string
          item_name: string
          notes: string | null
          pack_size: string | null
          pairing_suggestions: string[] | null
          prep_notes: string | null
          shelf_life: string | null
          storage_type: string | null
          sub_category: string | null
          supplier: string | null
          unit: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          abv?: number | null
          allergens?: string[] | null
          category?: string | null
          company_id: string
          created_at?: string
          id?: string
          item_name: string
          notes?: string | null
          pack_size?: string | null
          pairing_suggestions?: string[] | null
          prep_notes?: string | null
          shelf_life?: string | null
          storage_type?: string | null
          sub_category?: string | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          abv?: number | null
          allergens?: string[] | null
          category?: string | null
          company_id?: string
          created_at?: string
          id?: string
          item_name?: string
          notes?: string | null
          pack_size?: string | null
          pairing_suggestions?: string[] | null
          prep_notes?: string | null
          shelf_life?: string | null
          storage_type?: string | null
          sub_category?: string | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drinks_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drinks_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      eho_visits: {
        Row: {
          id: string
          inspector_name: string | null
          notes: string | null
          outcome: string | null
          rating: number | null
          report_url: string | null
          score: number | null
          site_id: string
          visit_date: string
        }
        Insert: {
          id?: string
          inspector_name?: string | null
          notes?: string | null
          outcome?: string | null
          rating?: number | null
          report_url?: string | null
          score?: number | null
          site_id: string
          visit_date: string
        }
        Update: {
          id?: string
          inspector_name?: string | null
          notes?: string | null
          outcome?: string | null
          rating?: number | null
          report_url?: string | null
          score?: number | null
          site_id?: string
          visit_date?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          company_id: string | null
          contact_type: Database["public"]["Enums"]["contact_role"]
          created_at: string
          display_order: number
          email: string | null
          id: string
          is_active: boolean
          language: string
          name: string
          notes: string | null
          phone_number: string | null
          role_title: string | null
          site_id: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          contact_type: Database["public"]["Enums"]["contact_role"]
          created_at?: string
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name: string
          notes?: string | null
          phone_number?: string | null
          role_title?: string | null
          site_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          contact_type?: Database["public"]["Enums"]["contact_role"]
          created_at?: string
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name?: string
          notes?: string | null
          phone_number?: string | null
          role_title?: string | null
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_keywords: {
        Row: {
          id: string
          keywords: Json
          template_type: string
        }
        Insert: {
          id?: string
          keywords: Json
          template_type: string
        }
        Update: {
          id?: string
          keywords?: Json
          template_type?: string
        }
        Relationships: []
      }
      equipment_library: {
        Row: {
          category: string | null
          colour_code: string | null
          company_id: string
          created_at: string
          equipment_name: string
          id: string
          location: string | null
          maintenance_schedule: string | null
          manufacturer: string | null
          model_serial: string | null
          notes: string | null
          purchase_date: string | null
          sub_category: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          colour_code?: string | null
          company_id: string
          created_at?: string
          equipment_name: string
          id?: string
          location?: string | null
          maintenance_schedule?: string | null
          manufacturer?: string | null
          model_serial?: string | null
          notes?: string | null
          purchase_date?: string | null
          sub_category?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          colour_code?: string | null
          company_id?: string
          created_at?: string
          equipment_name?: string
          id?: string
          location?: string | null
          maintenance_schedule?: string | null
          manufacturer?: string | null
          model_serial?: string | null
          notes?: string | null
          purchase_date?: string | null
          sub_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          client_id: string
          created_at: string | null
          equipment_name: string
          event_date: string
          event_type: string
          id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          equipment_name: string
          event_date: string
          event_type: string
          id?: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          equipment_name?: string
          event_date?: string
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fire_tests: {
        Row: {
          asset_id: string
          auth_user_id: string
          id: string
          note: string | null
          performed_at: string
          result: string
          test_type: string
        }
        Insert: {
          asset_id: string
          auth_user_id: string
          id?: string
          note?: string | null
          performed_at?: string
          result: string
          test_type: string
        }
        Update: {
          asset_id?: string
          auth_user_id?: string
          id?: string
          note?: string | null
          performed_at?: string
          result?: string
          test_type?: string
        }
        Relationships: []
      }
      first_aid_requirements: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          library_item_id: string | null
          max_staff_count: number | null
          min_staff_count: number
          notes: string | null
          required_quantity: number
          requirement_name: string
          updated_at: string
          venue_type: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          library_item_id?: string | null
          max_staff_count?: number | null
          min_staff_count?: number
          notes?: string | null
          required_quantity?: number
          requirement_name: string
          updated_at?: string
          venue_type: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          library_item_id?: string | null
          max_staff_count?: number | null
          min_staff_count?: number
          notes?: string | null
          required_quantity?: number
          requirement_name?: string
          updated_at?: string
          venue_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "first_aid_requirements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_aid_requirements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_aid_requirements_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "first_aid_supplies_library"
            referencedColumns: ["id"]
          },
        ]
      }
      first_aid_supplies_library: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string
          expiry_period_months: number | null
          id: string
          item_name: string
          notes: string | null
          pack_size: string | null
          standard_compliance: string | null
          storage_requirements: string | null
          sub_category: string | null
          supplier: string | null
          typical_usage: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string
          expiry_period_months?: number | null
          id?: string
          item_name: string
          notes?: string | null
          pack_size?: string | null
          standard_compliance?: string | null
          storage_requirements?: string | null
          sub_category?: string | null
          supplier?: string | null
          typical_usage?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string
          expiry_period_months?: number | null
          id?: string
          item_name?: string
          notes?: string | null
          pack_size?: string | null
          standard_compliance?: string | null
          storage_requirements?: string | null
          sub_category?: string | null
          supplier?: string | null
          typical_usage?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "first_aid_supplies_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_aid_supplies_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      glassware_library: {
        Row: {
          breakage_rate: string | null
          capacity_ml: number | null
          category: string
          company_id: string
          created_at: string
          dishwasher_safe: boolean | null
          id: string
          item_name: string
          material: string
          notes: string | null
          pack_size: number | null
          recommended_for: string | null
          reorder_level: number | null
          shape_style: string | null
          storage_location: string | null
          supplier: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          breakage_rate?: string | null
          capacity_ml?: number | null
          category: string
          company_id: string
          created_at?: string
          dishwasher_safe?: boolean | null
          id?: string
          item_name: string
          material?: string
          notes?: string | null
          pack_size?: number | null
          recommended_for?: string | null
          reorder_level?: number | null
          shape_style?: string | null
          storage_location?: string | null
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          breakage_rate?: string | null
          capacity_ml?: number | null
          category?: string
          company_id?: string
          created_at?: string
          dishwasher_safe?: boolean | null
          id?: string
          item_name?: string
          material?: string
          notes?: string | null
          pack_size?: number | null
          recommended_for?: string | null
          reorder_level?: number | null
          shape_style?: string | null
          storage_location?: string | null
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "glassware_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "glassware_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      global_documents: {
        Row: {
          category: string
          company_id: string | null
          created_at: string | null
          expiry_date: string | null
          file_path: string
          id: string
          is_active: boolean | null
          is_archived: boolean | null
          name: string
          notes: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          version: string | null
        }
        Insert: {
          category: string
          company_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          file_path: string
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          name: string
          notes?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          version?: string | null
        }
        Update: {
          category?: string
          company_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          file_path?: string
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          name?: string
          notes?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      global_documents_audit: {
        Row: {
          action: string
          document_id: string | null
          id: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          document_id?: string | null
          id?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          document_id?: string | null
          id?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_documents_audit_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "global_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      gm_index: {
        Row: {
          app_role: Database["public"]["Enums"]["app_role"] | null
          company_id: string | null
          email: string | null
          full_name: string | null
          home_site: string | null
          id: string
          phone: string | null
          position_title: string | null
          updated_at: string | null
        }
        Insert: {
          app_role?: Database["public"]["Enums"]["app_role"] | null
          company_id?: string | null
          email?: string | null
          full_name?: string | null
          home_site?: string | null
          id: string
          phone?: string | null
          position_title?: string | null
          updated_at?: string | null
        }
        Update: {
          app_role?: Database["public"]["Enums"]["app_role"] | null
          company_id?: string | null
          email?: string | null
          full_name?: string | null
          home_site?: string | null
          id?: string
          phone?: string | null
          position_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      incidents: {
        Row: {
          action_taken: string | null
          casualties: Json | null
          company_id: string | null
          corrective_actions: string | null
          created_at: string | null
          description: string
          documents: string[] | null
          emergency_services_called: boolean | null
          emergency_services_type: string | null
          environmental_release: boolean | null
          export_url: string | null
          first_aid_provided: boolean | null
          follow_up_tasks: Json | null
          hospitalisation: boolean | null
          id: string
          immediate_actions_taken: string | null
          incident_date: string
          incident_type: string | null
          investigation_notes: string | null
          location: string | null
          lost_time_days: number | null
          photos: string[] | null
          public_involved: boolean | null
          report_url: string | null
          reportable_disease: boolean | null
          reported_by: string | null
          reported_date: string
          riddor_category: string | null
          riddor_due_date: string | null
          riddor_notes: string | null
          riddor_notified_at: string | null
          riddor_reason: string | null
          riddor_reference: string | null
          riddor_reportable: boolean | null
          riddor_reported: boolean | null
          riddor_reported_date: string | null
          root_cause: string | null
          scene_preserved: boolean | null
          severity: string
          site_id: string
          source_task_id: string | null
          source_template_id: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          witnesses: Json | null
        }
        Insert: {
          action_taken?: string | null
          casualties?: Json | null
          company_id?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          description: string
          documents?: string[] | null
          emergency_services_called?: boolean | null
          emergency_services_type?: string | null
          environmental_release?: boolean | null
          export_url?: string | null
          first_aid_provided?: boolean | null
          follow_up_tasks?: Json | null
          hospitalisation?: boolean | null
          id?: string
          immediate_actions_taken?: string | null
          incident_date?: string
          incident_type?: string | null
          investigation_notes?: string | null
          location?: string | null
          lost_time_days?: number | null
          photos?: string[] | null
          public_involved?: boolean | null
          report_url?: string | null
          reportable_disease?: boolean | null
          reported_by?: string | null
          reported_date?: string
          riddor_category?: string | null
          riddor_due_date?: string | null
          riddor_notes?: string | null
          riddor_notified_at?: string | null
          riddor_reason?: string | null
          riddor_reference?: string | null
          riddor_reportable?: boolean | null
          riddor_reported?: boolean | null
          riddor_reported_date?: string | null
          root_cause?: string | null
          scene_preserved?: boolean | null
          severity: string
          site_id: string
          source_task_id?: string | null
          source_template_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          witnesses?: Json | null
        }
        Update: {
          action_taken?: string | null
          casualties?: Json | null
          company_id?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          description?: string
          documents?: string[] | null
          emergency_services_called?: boolean | null
          emergency_services_type?: string | null
          environmental_release?: boolean | null
          export_url?: string | null
          first_aid_provided?: boolean | null
          follow_up_tasks?: Json | null
          hospitalisation?: boolean | null
          id?: string
          immediate_actions_taken?: string | null
          incident_date?: string
          incident_type?: string | null
          investigation_notes?: string | null
          location?: string | null
          lost_time_days?: number | null
          photos?: string[] | null
          public_involved?: boolean | null
          report_url?: string | null
          reportable_disease?: boolean | null
          reported_by?: string | null
          reported_date?: string
          riddor_category?: string | null
          riddor_due_date?: string | null
          riddor_notes?: string | null
          riddor_notified_at?: string | null
          riddor_reason?: string | null
          riddor_reference?: string | null
          riddor_reportable?: boolean | null
          riddor_reported?: boolean | null
          riddor_reported_date?: string | null
          root_cause?: string | null
          scene_preserved?: boolean | null
          severity?: string
          site_id?: string
          source_task_id?: string | null
          source_template_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          witnesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients_library: {
        Row: {
          allergens: string[] | null
          category: string | null
          company_id: string
          created_at: string
          default_colour_code: string | null
          density_g_per_cup: number | null
          density_g_per_tbsp: number | null
          density_g_per_tsp: number | null
          food_group: string | null
          id: string
          ingredient_name: string
          ingredient_type: string | null
          linked_sop_id: string | null
          notes: string | null
          pack_size: string | null
          prep_state: string | null
          supplier: string | null
          unit: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          category?: string | null
          company_id: string
          created_at?: string
          default_colour_code?: string | null
          density_g_per_cup?: number | null
          density_g_per_tbsp?: number | null
          density_g_per_tsp?: number | null
          food_group?: string | null
          id?: string
          ingredient_name: string
          ingredient_type?: string | null
          linked_sop_id?: string | null
          notes?: string | null
          pack_size?: string | null
          prep_state?: string | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          category?: string | null
          company_id?: string
          created_at?: string
          default_colour_code?: string | null
          density_g_per_cup?: number | null
          density_g_per_tbsp?: number | null
          density_g_per_tsp?: number | null
          food_group?: string | null
          id?: string
          ingredient_name?: string
          ingredient_type?: string | null
          linked_sop_id?: string | null
          notes?: string | null
          pack_size?: string | null
          prep_state?: string | null
          supplier?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_library_linked_sop_id_fkey"
            columns: ["linked_sop_id"]
            isOneToOne: false
            referencedRelation: "sop_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          company_id: string
          created_at: string | null
          currency: string | null
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          line_items: Json | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string
          stripe_invoice_id: string | null
          subscription_id: string
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          company_id: string
          created_at?: string | null
          currency?: string | null
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          line_items?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id: string
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          company_id?: string
          created_at?: string | null
          currency?: string | null
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          line_items?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "company_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          last_verified_at: string | null
          search_vector: unknown
          source: string | null
          source_url: string | null
          subcategory: string | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          search_vector?: unknown
          source?: string | null
          source_url?: string | null
          subcategory?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_verified_at?: string | null
          search_vector?: unknown
          source?: string | null
          source_url?: string | null
          subcategory?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      library_requests: {
        Row: {
          category_options: string[] | null
          company_id: string
          created_at: string
          deployed_at: string | null
          deployed_by: string | null
          deployment_notes: string | null
          description: string | null
          enable_csv_export: boolean | null
          enable_csv_import: boolean | null
          fields: Json
          generated_component_template: string | null
          generated_sql: string | null
          generated_typescript_types: string | null
          id: string
          library_name: string
          main_table_columns: string[] | null
          rejection_reason: string | null
          requested_by: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          table_name: string
          updated_at: string
        }
        Insert: {
          category_options?: string[] | null
          company_id: string
          created_at?: string
          deployed_at?: string | null
          deployed_by?: string | null
          deployment_notes?: string | null
          description?: string | null
          enable_csv_export?: boolean | null
          enable_csv_import?: boolean | null
          fields?: Json
          generated_component_template?: string | null
          generated_sql?: string | null
          generated_typescript_types?: string | null
          id?: string
          library_name: string
          main_table_columns?: string[] | null
          rejection_reason?: string | null
          requested_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          table_name: string
          updated_at?: string
        }
        Update: {
          category_options?: string[] | null
          company_id?: string
          created_at?: string
          deployed_at?: string | null
          deployed_by?: string | null
          deployment_notes?: string | null
          description?: string | null
          enable_csv_export?: boolean | null
          enable_csv_import?: boolean | null
          fields?: Json
          generated_component_template?: string | null
          generated_sql?: string | null
          generated_typescript_types?: string | null
          id?: string
          library_name?: string
          main_table_columns?: string[] | null
          rejection_reason?: string | null
          requested_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          table_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      licences: {
        Row: {
          document_url: string | null
          expiry_date: string | null
          id: string
          licence_type: Database["public"]["Enums"]["licence_type"]
          site_id: string
        }
        Insert: {
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          licence_type: Database["public"]["Enums"]["licence_type"]
          site_id: string
        }
        Update: {
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          licence_type?: Database["public"]["Enums"]["licence_type"]
          site_id?: string
        }
        Relationships: []
      }
      maintenance_contractors: {
        Row: {
          address: string | null
          category: string
          company_id: string
          contact_name: string | null
          contract_expiry: string | null
          contract_file: string | null
          contract_start: string | null
          created_at: string
          email: string | null
          emergency_phone: string | null
          id: string
          linked_sites: string[] | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category: string
          company_id: string
          contact_name?: string | null
          contract_expiry?: string | null
          contract_file?: string | null
          contract_start?: string | null
          created_at?: string
          email?: string | null
          emergency_phone?: string | null
          id?: string
          linked_sites?: string[] | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string
          company_id?: string
          contact_name?: string | null
          contract_expiry?: string | null
          contract_file?: string | null
          contract_start?: string | null
          created_at?: string
          email?: string | null
          emergency_phone?: string | null
          id?: string
          linked_sites?: string[] | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_contractors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contractors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          asset_id: string | null
          company_id: string | null
          created_at: string | null
          id: string
          next_due: string | null
          notes: string | null
          performed_at: string | null
          performed_by: string | null
          site_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          next_due?: string | null
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          next_due?: string | null
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      maintenance_templates: {
        Row: {
          description: string
          equipment_type: string
          event_type: string
          id: string
          title: string
        }
        Insert: {
          description: string
          equipment_type: string
          event_type: string
          id?: string
          title: string
        }
        Update: {
          description?: string
          equipment_type?: string
          event_type?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          auth_user_id: string
          company_id: string
          id: string
          role: Database["public"]["Enums"]["company_role"]
        }
        Insert: {
          auth_user_id: string
          company_id: string
          id?: string
          role: Database["public"]["Enums"]["company_role"]
        }
        Update: {
          auth_user_id?: string
          company_id?: string
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
        }
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      message_deliveries: {
        Row: {
          delivered_at: string
          message_id: string
          user_id: string
        }
        Insert: {
          delivered_at?: string
          message_id: string
          user_id: string
        }
        Update: {
          delivered_at?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_deliveries_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      message_mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_user_id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_user_id: string
          message_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_user_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_system: boolean | null
          is_task: boolean | null
          message_type: string
          metadata: Json | null
          reply_to_id: string | null
          sender_id: string
          task_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_system?: boolean | null
          is_task?: boolean | null
          message_type?: string
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id: string
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_system?: boolean | null
          is_task?: boolean | null
          message_type?: string
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      messages_backup: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string | null
          is_system: boolean | null
          is_task: boolean | null
          message_type: string | null
          metadata: Json | null
          reply_to_id: string | null
          sender_id: string | null
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string | null
          is_system?: boolean | null
          is_task?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string | null
          is_system?: boolean | null
          is_task?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messaging_channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          last_read_message_id: string | null
          left_at: string | null
          member_role: string
          mention_notifications_only: boolean | null
          notifications_enabled: boolean | null
          unread_count: number | null
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          left_at?: string | null
          member_role: string
          mention_notifications_only?: boolean | null
          notifications_enabled?: boolean | null
          unread_count?: number | null
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          left_at?: string | null
          member_role?: string
          mention_notifications_only?: boolean | null
          notifications_enabled?: boolean | null
          unread_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "messaging_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_channel_members_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "messaging_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_channels: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          channel_type: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          entity_id: string | null
          id: string
          is_auto_created: boolean | null
          is_pinned: boolean | null
          last_message_at: string | null
          name: string
          pinned_at: string | null
          pinned_by: string | null
          topic: string | null
          topic_category: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          channel_type: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_id?: string | null
          id?: string
          is_auto_created?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          name: string
          pinned_at?: string | null
          pinned_by?: string | null
          topic?: string | null
          topic_category?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          channel_type?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_id?: string | null
          id?: string
          is_auto_created?: boolean | null
          is_pinned?: boolean | null
          last_message_at?: string | null
          name?: string
          pinned_at?: string | null
          pinned_by?: string | null
          topic?: string | null
          topic_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messaging_channels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_channels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_channels_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_channels_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_channels_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_channels_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messaging_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_message_tags: {
        Row: {
          id: string
          message_id: string
          tag: string
          tagged_at: string
          tagged_by: string
        }
        Insert: {
          id?: string
          message_id: string
          tag: string
          tagged_at?: string
          tagged_by: string
        }
        Update: {
          id?: string
          message_id?: string
          tag?: string
          tagged_at?: string
          tagged_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_message_tags_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messaging_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_message_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_message_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_message_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_message_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_messages: {
        Row: {
          action_entity_id: string | null
          action_suggested: boolean | null
          action_taken: boolean | null
          action_type: string | null
          attachments: Json | null
          channel_id: string
          content: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          linked_entity_id: string | null
          linked_entity_type: string | null
          mentioned_user_ids: string[] | null
          message_type: string
          metadata: Json | null
          parent_message_id: string | null
          sender_id: string
          sender_name: string | null
          system_action: string | null
          thread_count: number | null
          topic: string | null
        }
        Insert: {
          action_entity_id?: string | null
          action_suggested?: boolean | null
          action_taken?: boolean | null
          action_type?: string | null
          attachments?: Json | null
          channel_id: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          mentioned_user_ids?: string[] | null
          message_type: string
          metadata?: Json | null
          parent_message_id?: string | null
          sender_id: string
          sender_name?: string | null
          system_action?: string | null
          thread_count?: number | null
          topic?: string | null
        }
        Update: {
          action_entity_id?: string | null
          action_suggested?: boolean | null
          action_taken?: boolean | null
          action_type?: string | null
          attachments?: Json | null
          channel_id?: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          mentioned_user_ids?: string[] | null
          message_type?: string
          metadata?: Json | null
          parent_message_id?: string | null
          sender_id?: string
          sender_name?: string | null
          system_action?: string | null
          thread_count?: number | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messaging_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "messaging_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messaging_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_outbox: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          for_date: string
          id: string
          kind: string
          lease_expires_at: string | null
          payload: Json
          processed_at: string | null
          processing_started_at: string | null
          site_id: string
          task_instance_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          for_date: string
          id?: string
          kind: string
          lease_expires_at?: string | null
          payload?: Json
          processed_at?: string | null
          processing_started_at?: string | null
          site_id: string
          task_instance_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          for_date?: string
          id?: string
          kind?: string
          lease_expires_at?: string | null
          payload?: Json
          processed_at?: string | null
          processing_started_at?: string | null
          site_id?: string
          task_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_outbox_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_outbox_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "notifications_outbox_task_instance_id_fkey"
            columns: ["task_instance_id"]
            isOneToOne: false
            referencedRelation: "task_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      "npm run dev": {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      packaging_library: {
        Row: {
          capacity_size: string | null
          category: string
          color_finish: string | null
          company_id: string
          compostable: boolean | null
          created_at: string
          dimensions: string | null
          eco_friendly: boolean | null
          hot_food_suitable: boolean | null
          id: string
          item_name: string
          leak_proof: boolean | null
          material: string
          microwave_safe: boolean | null
          notes: string | null
          pack_cost: number | null
          pack_size: number | null
          recyclable: boolean | null
          reorder_level: number | null
          supplier: string | null
          unit_cost: number | null
          updated_at: string
          usage_context: string | null
        }
        Insert: {
          capacity_size?: string | null
          category: string
          color_finish?: string | null
          company_id: string
          compostable?: boolean | null
          created_at?: string
          dimensions?: string | null
          eco_friendly?: boolean | null
          hot_food_suitable?: boolean | null
          id?: string
          item_name: string
          leak_proof?: boolean | null
          material: string
          microwave_safe?: boolean | null
          notes?: string | null
          pack_cost?: number | null
          pack_size?: number | null
          recyclable?: boolean | null
          reorder_level?: number | null
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
          usage_context?: string | null
        }
        Update: {
          capacity_size?: string | null
          category?: string
          color_finish?: string | null
          company_id?: string
          compostable?: boolean | null
          created_at?: string
          dimensions?: string | null
          eco_friendly?: boolean | null
          hot_food_suitable?: boolean | null
          id?: string
          item_name?: string
          leak_proof?: boolean | null
          material?: string
          microwave_safe?: boolean | null
          notes?: string | null
          pack_cost?: number | null
          pack_size?: number | null
          recyclable?: boolean | null
          reorder_level?: number | null
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
          usage_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packaging_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pat_appliances: {
        Row: {
          brand: string | null
          company_id: string
          created_at: string | null
          has_current_pat_label: boolean
          id: string
          name: string
          notes: string | null
          purchase_date: string | null
          site_id: string
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          company_id: string
          created_at?: string | null
          has_current_pat_label?: boolean
          id?: string
          name: string
          notes?: string | null
          purchase_date?: string | null
          site_id: string
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          company_id?: string
          created_at?: string | null
          has_current_pat_label?: boolean
          id?: string
          name?: string
          notes?: string | null
          purchase_date?: string | null
          site_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pat_appliances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pat_appliances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pat_appliances_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "pat_appliances_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      pest_visits: {
        Row: {
          id: string
          notes: string | null
          provider: string | null
          report_url: string | null
          site_id: string
          visit_date: string
        }
        Insert: {
          id?: string
          notes?: string | null
          provider?: string | null
          report_url?: string | null
          site_id: string
          visit_date: string
        }
        Update: {
          id?: string
          notes?: string | null
          provider?: string | null
          report_url?: string | null
          site_id?: string
          visit_date?: string
        }
        Relationships: []
      }
      pin_attempts: {
        Row: {
          actor_staff_id: string
          attempted_at: string
          device_auth_user_id: string
          id: number
          ok: boolean
          site_id: string
        }
        Insert: {
          actor_staff_id: string
          attempted_at?: string
          device_auth_user_id: string
          id?: number
          ok: boolean
          site_id: string
        }
        Update: {
          actor_staff_id?: string
          attempted_at?: string
          device_auth_user_id?: string
          id?: number
          ok?: boolean
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pin_attempts_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pin_attempts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pin_attempts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      policies: {
        Row: {
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          effective_date: string | null
          file_url: string | null
          id: string
          review_date: string | null
          site_id: string | null
          status: string | null
          title: string | null
          type: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          effective_date?: string | null
          file_url?: string | null
          id?: string
          review_date?: string | null
          site_id?: string | null
          status?: string | null
          title?: string | null
          type: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          effective_date?: string | null
          file_url?: string | null
          id?: string
          review_date?: string | null
          site_id?: string | null
          status?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      ppe_library: {
        Row: {
          category: string | null
          cleaning_replacement_interval: string | null
          company_id: string
          created_at: string
          id: string
          item_name: string
          linked_risks: string[] | null
          notes: string | null
          reorder_level: number | null
          size_options: string[] | null
          standard_compliance: string | null
          supplier: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          cleaning_replacement_interval?: string | null
          company_id: string
          created_at?: string
          id?: string
          item_name: string
          linked_risks?: string[] | null
          notes?: string | null
          reorder_level?: number | null
          size_options?: string[] | null
          standard_compliance?: string | null
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          cleaning_replacement_interval?: string | null
          company_id?: string
          created_at?: string
          id?: string
          item_name?: string
          linked_risks?: string[] | null
          notes?: string | null
          reorder_level?: number | null
          size_options?: string[] | null
          standard_compliance?: string | null
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ppe_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppe_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ppm_categories_redundant: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      ppm_schedules: {
        Row: {
          asset_id: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          frequency: string
          id: string
          next_due_date: string
          site_id: string | null
          status: string | null
          task_type: string
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          frequency: string
          id?: string
          next_due_date: string
          site_id?: string | null
          status?: string | null
          task_type: string
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string
          id?: string
          next_due_date?: string
          site_id?: string | null
          status?: string | null
          task_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ppm_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_schedules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "ppm_schedules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ppm_service_events: {
        Row: {
          asset_id: string | null
          company_id: string | null
          contractor_id: string | null
          created_at: string | null
          created_by: string | null
          file_url: string | null
          id: string
          notes: string | null
          ppm_id: string | null
          service_date: string
          site_id: string | null
          status: string | null
        }
        Insert: {
          asset_id?: string | null
          company_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          ppm_id?: string | null
          service_date?: string
          site_id?: string | null
          status?: string | null
        }
        Update: {
          asset_id?: string | null
          company_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          ppm_id?: string | null
          service_date?: string
          site_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ppm_service_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_service_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_service_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "ppm_service_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["auth_user_id"]
          },
          {
            foreignKeyName: "ppm_service_events_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "ppm_service_events_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ppm_task_attachments: {
        Row: {
          file_type: string | null
          file_url: string
          id: string
          task_id: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          file_type?: string | null
          file_url: string
          id?: string
          task_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          file_type?: string | null
          file_url?: string
          id?: string
          task_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ppm_task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ppm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ppm_tasks: {
        Row: {
          asset_id: string | null
          category_id: string | null
          certificate_url: string | null
          company_id: string | null
          due_date: string | null
          frequency_months: number
          group_id: string | null
          id: string
          last_completed: string | null
          next_due: string | null
          site_id: string
          task_name: string | null
        }
        Insert: {
          asset_id?: string | null
          category_id?: string | null
          certificate_url?: string | null
          company_id?: string | null
          due_date?: string | null
          frequency_months: number
          group_id?: string | null
          id?: string
          last_completed?: string | null
          next_due?: string | null
          site_id: string
          task_name?: string | null
        }
        Update: {
          asset_id?: string | null
          category_id?: string | null
          certificate_url?: string | null
          company_id?: string | null
          due_date?: string | null
          frequency_months?: number
          group_id?: string | null
          id?: string
          last_completed?: string | null
          next_due?: string | null
          site_id?: string
          task_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ppm_tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ppm_categories_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_tasks_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_tasks_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          answers_count: number
          app_role: Database["public"]["Enums"]["app_role"]
          auth_user_id: string | null
          avatar_url: string | null
          boh_foh: string | null
          company_id: string | null
          cossh_expiry_date: string | null
          cossh_trained: boolean | null
          created_at: string | null
          email: string | null
          fire_marshal_expiry_date: string | null
          fire_marshal_trained: boolean | null
          first_aid_expiry_date: string | null
          first_aid_trained: boolean | null
          food_safety_expiry_date: string | null
          food_safety_level: number | null
          full_name: string | null
          h_and_s_expiry_date: string | null
          h_and_s_level: number | null
          home_site: string | null
          id: string
          is_platform_admin: boolean | null
          is_primary_gm: boolean | null
          last_login: string | null
          phone_number: string | null
          pin_code: string | null
          points: number
          position_title: string | null
          questions_count: number
          site_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          answers_count?: number
          app_role?: Database["public"]["Enums"]["app_role"]
          auth_user_id?: string | null
          avatar_url?: string | null
          boh_foh?: string | null
          company_id?: string | null
          cossh_expiry_date?: string | null
          cossh_trained?: boolean | null
          created_at?: string | null
          email?: string | null
          fire_marshal_expiry_date?: string | null
          fire_marshal_trained?: boolean | null
          first_aid_expiry_date?: string | null
          first_aid_trained?: boolean | null
          food_safety_expiry_date?: string | null
          food_safety_level?: number | null
          full_name?: string | null
          h_and_s_expiry_date?: string | null
          h_and_s_level?: number | null
          home_site?: string | null
          id?: string
          is_platform_admin?: boolean | null
          is_primary_gm?: boolean | null
          last_login?: string | null
          phone_number?: string | null
          pin_code?: string | null
          points?: number
          position_title?: string | null
          questions_count?: number
          site_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          answers_count?: number
          app_role?: Database["public"]["Enums"]["app_role"]
          auth_user_id?: string | null
          avatar_url?: string | null
          boh_foh?: string | null
          company_id?: string | null
          cossh_expiry_date?: string | null
          cossh_trained?: boolean | null
          created_at?: string | null
          email?: string | null
          fire_marshal_expiry_date?: string | null
          fire_marshal_trained?: boolean | null
          first_aid_expiry_date?: string | null
          first_aid_trained?: boolean | null
          food_safety_expiry_date?: string | null
          food_safety_level?: number | null
          full_name?: string | null
          h_and_s_expiry_date?: string | null
          h_and_s_level?: number | null
          home_site?: string | null
          id?: string
          is_platform_admin?: boolean | null
          is_primary_gm?: boolean | null
          last_login?: string | null
          phone_number?: string | null
          pin_code?: string | null
          points?: number
          position_title?: string | null
          questions_count?: number
          site_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_home_site_fkey"
            columns: ["home_site"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "profiles_home_site_fkey"
            columns: ["home_site"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_info: Json | null
          endpoint: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_info?: Json | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_info?: Json | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessments: {
        Row: {
          assessment_data: Json | null
          assessment_date: string | null
          assessor_name: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          hazards_controlled: number | null
          highest_risk_level: string | null
          id: string
          linked_chemicals: string[] | null
          linked_ppe: string[] | null
          linked_sops: string[] | null
          next_review_date: string | null
          ref_code: string
          review_date: string | null
          site_id: string | null
          status: string | null
          template_type: string
          title: string
          total_hazards: number | null
          updated_at: string | null
        }
        Insert: {
          assessment_data?: Json | null
          assessment_date?: string | null
          assessor_name?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          hazards_controlled?: number | null
          highest_risk_level?: string | null
          id?: string
          linked_chemicals?: string[] | null
          linked_ppe?: string[] | null
          linked_sops?: string[] | null
          next_review_date?: string | null
          ref_code: string
          review_date?: string | null
          site_id?: string | null
          status?: string | null
          template_type: string
          title: string
          total_hazards?: number | null
          updated_at?: string | null
        }
        Update: {
          assessment_data?: Json | null
          assessment_date?: string | null
          assessor_name?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          hazards_controlled?: number | null
          highest_risk_level?: string | null
          id?: string
          linked_chemicals?: string[] | null
          linked_ppe?: string[] | null
          linked_sops?: string[] | null
          next_review_date?: string | null
          ref_code?: string
          review_date?: string | null
          site_id?: string | null
          status?: string | null
          template_type?: string
          title?: string
          total_hazards?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "risk_assessments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      serving_equipment_library: {
        Row: {
          brand: string | null
          category: string
          color_coding: string | null
          color_finish: string | null
          company_id: string
          created_at: string
          dishwasher_safe: boolean | null
          id: string
          item_name: string
          material: string
          notes: string | null
          oven_safe: boolean | null
          shape: string | null
          size_dimensions: string | null
          storage_location: string | null
          supplier: string | null
          unit_cost: number | null
          updated_at: string
          use_case: string | null
        }
        Insert: {
          brand?: string | null
          category: string
          color_coding?: string | null
          color_finish?: string | null
          company_id: string
          created_at?: string
          dishwasher_safe?: boolean | null
          id?: string
          item_name: string
          material: string
          notes?: string | null
          oven_safe?: boolean | null
          shape?: string | null
          size_dimensions?: string | null
          storage_location?: string | null
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
          use_case?: string | null
        }
        Update: {
          brand?: string | null
          category?: string
          color_coding?: string | null
          color_finish?: string | null
          company_id?: string
          created_at?: string
          dishwasher_safe?: boolean | null
          id?: string
          item_name?: string
          material?: string
          notes?: string | null
          oven_safe?: boolean | null
          shape?: string | null
          size_dimensions?: string | null
          storage_location?: string | null
          supplier?: string | null
          unit_cost?: number | null
          updated_at?: string
          use_case?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serving_equipment_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serving_equipment_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      site_applied_templates: {
        Row: {
          applied_at: string
          checklist_template_id: string
          site_id: string
        }
        Insert: {
          applied_at?: string
          checklist_template_id: string
          site_id: string
        }
        Update: {
          applied_at?: string
          checklist_template_id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_applied_templates_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_areas: {
        Row: {
          code: string
          id: string
          name: string
          site_id: string
        }
        Insert: {
          code: string
          id?: string
          name: string
          site_id: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_areas_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_areas_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      site_checklists: {
        Row: {
          active: boolean | null
          anniversary_date: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          custom_instructions: string | null
          date_of_month: number | null
          daypart_times: Json | null
          days_of_week: number[] | null
          equipment_config: Json | null
          frequency: string
          id: string
          name: string
          site_id: string
          template_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          anniversary_date?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          custom_instructions?: string | null
          date_of_month?: number | null
          daypart_times?: Json | null
          days_of_week?: number[] | null
          equipment_config?: Json | null
          frequency: string
          id?: string
          name: string
          site_id: string
          template_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          anniversary_date?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          custom_instructions?: string | null
          date_of_month?: number | null
          daypart_times?: Json | null
          days_of_week?: number[] | null
          equipment_config?: Json | null
          frequency?: string
          id?: string
          name?: string
          site_id?: string
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_checklists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_checklists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_checklists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_checklists_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "site_checklists_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_closures: {
        Row: {
          closure_end: string | null
          closure_start: string | null
          created_at: string | null
          id: string
          is_active: boolean
          notes: string | null
          site_id: string | null
        }
        Insert: {
          closure_end?: string | null
          closure_start?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          site_id?: string | null
        }
        Update: {
          closure_end?: string | null
          closure_start?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_closures_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "site_closures_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_compliance_score: {
        Row: {
          breakdown: Json
          created_at: string
          id: string
          missed_daily_checklists: number
          open_critical_incidents: number
          overdue_corrective_actions: number
          score: number
          score_date: string
          site_id: string
          temperature_breaches_last_7d: number
          tenant_id: string
        }
        Insert: {
          breakdown?: Json
          created_at?: string
          id?: string
          missed_daily_checklists?: number
          open_critical_incidents?: number
          overdue_corrective_actions?: number
          score: number
          score_date: string
          site_id: string
          temperature_breaches_last_7d?: number
          tenant_id: string
        }
        Update: {
          breakdown?: Json
          created_at?: string
          id?: string
          missed_daily_checklists?: number
          open_critical_incidents?: number
          overdue_corrective_actions?: number
          score?: number
          score_date?: string
          site_id?: string
          temperature_breaches_last_7d?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_compliance_score_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "site_compliance_score_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_compliance_score_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_compliance_score_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      site_day_parts: {
        Row: {
          company_id: string
          end_time: string
          id: string
          name: string
          site_id: string
          soft_deadline_offset_minutes: number
          sort_order: number
          start_time: string
        }
        Insert: {
          company_id: string
          end_time: string
          id?: string
          name: string
          site_id: string
          soft_deadline_offset_minutes?: number
          sort_order: number
          start_time: string
        }
        Update: {
          company_id?: string
          end_time?: string
          id?: string
          name?: string
          site_id?: string
          soft_deadline_offset_minutes?: number
          sort_order?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_day_parts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_day_parts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_day_parts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_day_parts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      site_escalation_rules: {
        Row: {
          due_soon_minutes: number
          overdue_minutes: number
          site_id: string
        }
        Insert: {
          due_soon_minutes?: number
          overdue_minutes?: number
          site_id: string
        }
        Update: {
          due_soon_minutes?: number
          overdue_minutes?: number
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_escalation_rules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_escalation_rules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      site_members: {
        Row: {
          is_fire_marshal: boolean | null
          is_first_aider: boolean | null
          site_id: string
          user_id: string
        }
        Insert: {
          is_fire_marshal?: boolean | null
          is_first_aider?: boolean | null
          site_id: string
          user_id: string
        }
        Update: {
          is_fire_marshal?: boolean | null
          is_first_aider?: boolean | null
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      site_memberships: {
        Row: {
          auth_user_id: string
          id: string
          site_id: string
        }
        Insert: {
          auth_user_id: string
          id?: string
          site_id: string
        }
        Update: {
          auth_user_id?: string
          id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_memberships_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_memberships_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      site_profiles: {
        Row: {
          alcohol: boolean | null
          coffee: boolean | null
          company_id: string | null
          cuisine: string | null
          delivery: boolean | null
          id: string
          service_model: string | null
          site_id: string | null
        }
        Insert: {
          alcohol?: boolean | null
          coffee?: boolean | null
          company_id?: string | null
          cuisine?: string | null
          delivery?: boolean | null
          id?: string
          service_model?: string | null
          site_id?: string | null
        }
        Update: {
          alcohol?: boolean | null
          coffee?: boolean | null
          company_id?: string | null
          cuisine?: string | null
          delivery?: boolean | null
          id?: string
          service_model?: string | null
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      sites: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          area_id: string | null
          city: string | null
          company_id: string | null
          created_at: string | null
          gm_user_id: string | null
          id: string
          name: string
          operating_schedule: Json | null
          postcode: string | null
          region: string | null
          region_id: string | null
          risk_level: string | null
          site_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          area_id?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          gm_user_id?: string | null
          id?: string
          name: string
          operating_schedule?: Json | null
          postcode?: string | null
          region?: string | null
          region_id?: string | null
          risk_level?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          area_id?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          gm_user_id?: string | null
          id?: string
          name?: string
          operating_schedule?: Json | null
          postcode?: string | null
          region?: string | null
          region_id?: string | null
          risk_level?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sites_gm_user"
            columns: ["gm_user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sites_gm_user"
            columns: ["gm_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sites_gm_user"
            columns: ["gm_user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sites_gm_user"
            columns: ["gm_user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_company_id_fkey1"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_company_id_fkey1"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites_redundant: {
        Row: {
          address: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          code: string | null
          company_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          days_open: Json | null
          floor_area: number | null
          has_coffee: boolean | null
          has_kitchen: boolean | null
          id: string
          name: string
          opening_date: string | null
          opening_time_from: string | null
          opening_time_to: string | null
          postcode: string | null
          region: string | null
          site_code: string | null
          site_type: string | null
          status: string | null
          tz: string
          updated_at: string | null
          yearly_closures: Json | null
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          days_open?: Json | null
          floor_area?: number | null
          has_coffee?: boolean | null
          has_kitchen?: boolean | null
          id?: string
          name: string
          opening_date?: string | null
          opening_time_from?: string | null
          opening_time_to?: string | null
          postcode?: string | null
          region?: string | null
          site_code?: string | null
          site_type?: string | null
          status?: string | null
          tz?: string
          updated_at?: string | null
          yearly_closures?: Json | null
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          days_open?: Json | null
          floor_area?: number | null
          has_coffee?: boolean | null
          has_kitchen?: boolean | null
          id?: string
          name?: string
          opening_date?: string | null
          opening_time_from?: string | null
          opening_time_to?: string | null
          postcode?: string | null
          region?: string | null
          site_code?: string | null
          site_type?: string | null
          status?: string | null
          tz?: string
          updated_at?: string | null
          yearly_closures?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_entries: {
        Row: {
          author: string
          category: string
          change_notes: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          parent_id: string | null
          ref_code: string
          sop_data: Json
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          version: string
          version_number: number | null
        }
        Insert: {
          author: string
          category: string
          change_notes?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          parent_id?: string | null
          ref_code: string
          sop_data?: Json
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: string
          version_number?: number | null
        }
        Update: {
          author?: string
          category?: string
          change_notes?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          parent_id?: string | null
          ref_code?: string
          sop_data?: Json
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sop_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_entries_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sop_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          active: boolean
          auth_user_id: string | null
          company_department_id: string | null
          company_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: string | null
          site_id: string | null
          start_date: string | null
        }
        Insert: {
          active?: boolean
          auth_user_id?: string | null
          company_department_id?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          role?: string | null
          site_id?: string | null
          start_date?: string | null
        }
        Update: {
          active?: boolean
          auth_user_id?: string | null
          company_department_id?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
          site_id?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_company_department_id_fkey"
            columns: ["company_department_id"]
            isOneToOne: false
            referencedRelation: "company_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      staff_attendance: {
        Row: {
          clock_in_time: string
          clock_out_time: string | null
          company_id: string
          created_at: string
          id: string
          shift_notes: string | null
          shift_status: string
          site_id: string
          total_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clock_in_time?: string
          clock_out_time?: string | null
          company_id: string
          created_at?: string
          id?: string
          shift_notes?: string | null
          shift_status?: string
          site_id: string
          total_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clock_in_time?: string
          clock_out_time?: string | null
          company_id?: string
          created_at?: string
          id?: string
          shift_notes?: string | null
          shift_status?: string
          site_id?: string
          total_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "staff_attendance_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_pins: {
        Row: {
          last_rotated_at: string
          pin_hash: string
          staff_id: string
        }
        Insert: {
          last_rotated_at?: string
          pin_hash: string
          staff_id: string
        }
        Update: {
          last_rotated_at?: string
          pin_hash?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_pins_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_sickness_records: {
        Row: {
          company_id: string
          created_at: string
          exclusion_period_end: string | null
          exclusion_period_start: string
          food_handling_restricted: boolean | null
          id: string
          illness_onset_date: string
          illness_onset_time: string | null
          manager_notified: boolean | null
          medical_clearance_received: boolean | null
          medical_clearance_required: boolean | null
          notes: string | null
          reported_by: string
          reported_date: string
          return_to_work_date: string | null
          site_id: string | null
          staff_member_id: string | null
          staff_member_name: string
          status: string
          symptomatic_in_food_areas: boolean | null
          symptoms: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          exclusion_period_end?: string | null
          exclusion_period_start: string
          food_handling_restricted?: boolean | null
          id?: string
          illness_onset_date: string
          illness_onset_time?: string | null
          manager_notified?: boolean | null
          medical_clearance_received?: boolean | null
          medical_clearance_required?: boolean | null
          notes?: string | null
          reported_by: string
          reported_date: string
          return_to_work_date?: string | null
          site_id?: string | null
          staff_member_id?: string | null
          staff_member_name: string
          status?: string
          symptomatic_in_food_areas?: boolean | null
          symptoms: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          exclusion_period_end?: string | null
          exclusion_period_start?: string
          food_handling_restricted?: boolean | null
          id?: string
          illness_onset_date?: string
          illness_onset_time?: string | null
          manager_notified?: boolean | null
          medical_clearance_received?: boolean | null
          medical_clearance_required?: boolean | null
          notes?: string | null
          reported_by?: string
          reported_date?: string
          return_to_work_date?: string | null
          site_id?: string | null
          staff_member_id?: string | null
          staff_member_name?: string
          status?: string
          symptomatic_in_food_areas?: boolean | null
          symptoms?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_sickness_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_sickness_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_sickness_records_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_sickness_records_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_sickness_records_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_sickness_records_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_sickness_records_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "staff_sickness_records_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_sickness_records_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_sickness_records_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_sickness_records_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_sickness_records_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_addons: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          display_name: string
          features: Json | null
          hardware_cost: number | null
          id: string
          is_active: boolean | null
          monthly_management_cost: number | null
          name: string
          price: number
          price_type: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          features?: Json | null
          hardware_cost?: number | null
          id?: string
          is_active?: boolean | null
          monthly_management_cost?: number | null
          name: string
          price: number
          price_type?: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          features?: Json | null
          hardware_cost?: number | null
          id?: string
          is_active?: boolean | null
          monthly_management_cost?: number | null
          name?: string
          price?: number
          price_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          display_name: string
          features: Json | null
          flat_rate_price: number | null
          id: string
          max_sites: number | null
          min_sites: number | null
          name: string
          price_per_site_monthly: number
          pricing_model: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          features?: Json | null
          flat_rate_price?: number | null
          id?: string
          max_sites?: number | null
          min_sites?: number | null
          name: string
          price_per_site_monthly: number
          pricing_model?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          features?: Json | null
          flat_rate_price?: number | null
          id?: string
          max_sites?: number | null
          min_sites?: number | null
          name?: string
          price_per_site_monthly?: number
          pricing_model?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      task_categories: {
        Row: {
          code: string
          id: string
          label: string
          parent_id: string | null
        }
        Insert: {
          code: string
          id?: string
          label: string
          parent_id?: string | null
        }
        Update: {
          code?: string
          id?: string
          label?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completion_records: {
        Row: {
          company_id: string
          completed_at: string
          completed_by: string | null
          completion_data: Json | null
          created_at: string
          duration_seconds: number | null
          evidence_attachments: Json | null
          flag_reason: string | null
          flagged: boolean | null
          id: string
          site_id: string | null
          task_id: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string
          completed_by?: string | null
          completion_data?: Json | null
          created_at?: string
          duration_seconds?: number | null
          evidence_attachments?: Json | null
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          site_id?: string | null
          task_id: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string
          completed_by?: string | null
          completion_data?: Json | null
          created_at?: string
          duration_seconds?: number | null
          evidence_attachments?: Json | null
          flag_reason?: string | null
          flagged?: boolean | null
          id?: string
          site_id?: string | null
          task_id?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completion_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completion_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completion_records_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completion_records_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completion_records_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completion_records_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completion_records_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "task_completion_records_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completion_records_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "checklist_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completion_records_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "deduplicated_checklist_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completion_records_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_escalations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          instance_id: string
          level: Database["public"]["Enums"]["escalation_level"]
          notified_at: string | null
          site_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          instance_id: string
          level: Database["public"]["Enums"]["escalation_level"]
          notified_at?: string | null
          site_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          instance_id?: string
          level?: Database["public"]["Enums"]["escalation_level"]
          notified_at?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_escalations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_escalations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_escalations_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "task_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_escalations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_escalations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      task_gen_runs: {
        Row: {
          bad_daypart_fk: number
          for_date: string
          id: string
          null_day_part: number
          null_due_at: number
          null_for_date: number
          null_start_at: number
          ran_at: string
          total_rows: number
        }
        Insert: {
          bad_daypart_fk: number
          for_date: string
          id?: string
          null_day_part: number
          null_due_at: number
          null_for_date: number
          null_start_at: number
          ran_at?: string
          total_rows: number
        }
        Update: {
          bad_daypart_fk?: number
          for_date?: string
          id?: string
          null_day_part?: number
          null_due_at?: number
          null_for_date?: number
          null_start_at?: number
          ran_at?: string
          total_rows?: number
        }
        Relationships: []
      }
      task_instances: {
        Row: {
          company_id: string
          completed_at: string | null
          completed_by: string | null
          day_part_id: string
          due_at: string
          for_date: string
          id: string
          note: string | null
          outcome: string | null
          run_date: string | null
          schedule_id: string | null
          site_id: string
          start_at: string
          status: string
          task_template_id: string | null
          template_id: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          day_part_id: string
          due_at: string
          for_date: string
          id?: string
          note?: string | null
          outcome?: string | null
          run_date?: string | null
          schedule_id?: string | null
          site_id: string
          start_at: string
          status?: string
          task_template_id?: string | null
          template_id: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          day_part_id?: string
          due_at?: string
          for_date?: string
          id?: string
          note?: string | null
          outcome?: string | null
          run_date?: string | null
          schedule_id?: string | null
          site_id?: string
          start_at?: string
          status?: string
          task_template_id?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_instances_day_part_id_fkey"
            columns: ["day_part_id"]
            isOneToOne: false
            referencedRelation: "site_day_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_instances_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "task_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_instances_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_instances_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      task_library: {
        Row: {
          attachments: Json | null
          category: string | null
          created_at: string | null
          daypart: string | null
          description: string | null
          form_schema: Json | null
          frequency: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          category?: string | null
          created_at?: string | null
          daypart?: string | null
          description?: string | null
          form_schema?: Json | null
          frequency?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          category?: string | null
          created_at?: string | null
          daypart?: string | null
          description?: string | null
          form_schema?: Json | null
          frequency?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      task_logs: {
        Row: {
          checklist_id: string
          id: string
          logged_at: string
          note: string | null
          site_id: string
          status: Database["public"]["Enums"]["task_status"]
          task_id: string
          user_id: string
        }
        Insert: {
          checklist_id: string
          id?: string
          logged_at?: string
          note?: string | null
          site_id: string
          status: Database["public"]["Enums"]["task_status"]
          task_id: string
          user_id: string
        }
        Update: {
          checklist_id?: string
          id?: string
          logged_at?: string
          note?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      task_schedules: {
        Row: {
          company_id: string
          day_part_id: string
          freq: Database["public"]["Enums"]["schedule_freq"]
          id: string
          is_active: boolean
          site_id: string
          template_id: string
          weekdays: number[]
        }
        Insert: {
          company_id: string
          day_part_id: string
          freq?: Database["public"]["Enums"]["schedule_freq"]
          id?: string
          is_active?: boolean
          site_id: string
          template_id: string
          weekdays?: number[]
        }
        Update: {
          company_id?: string
          day_part_id?: string
          freq?: Database["public"]["Enums"]["schedule_freq"]
          id?: string
          is_active?: boolean
          site_id?: string
          template_id?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "task_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_schedules_day_part_id_fkey"
            columns: ["day_part_id"]
            isOneToOne: false
            referencedRelation: "site_day_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_schedules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_schedules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      task_template_categories: {
        Row: {
          category_id: string
          template_id: string
        }
        Insert: {
          category_id: string
          template_id: string
        }
        Update: {
          category_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_template_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      task_template_departments: {
        Row: {
          department_code: string
          template_id: string
        }
        Insert: {
          department_code: string
          template_id: string
        }
        Update: {
          department_code?: string
          template_id?: string
        }
        Relationships: []
      }
      task_template_overrides: {
        Row: {
          active: boolean | null
          days_of_week: number[] | null
          due_time: string | null
          site_id: string
          start_time: string | null
          template_id: string
        }
        Insert: {
          active?: boolean | null
          days_of_week?: number[] | null
          due_time?: string | null
          site_id: string
          start_time?: string | null
          template_id: string
        }
        Update: {
          active?: boolean | null
          days_of_week?: number[] | null
          due_time?: string | null
          site_id?: string
          start_time?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_template_overrides_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_template_overrides_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      task_template_seed: {
        Row: {
          prompt: string
          section: string
          sort_order: number
        }
        Insert: {
          prompt: string
          section: string
          sort_order: number
        }
        Update: {
          prompt?: string
          section?: string
          sort_order?: number
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          active: boolean | null
          asset_id: string | null
          asset_type: string | null
          assigned_to_role: string | null
          assigned_to_user_id: string | null
          audience: string | null
          audit_category: string | null
          category: string
          company_id: string | null
          compliance_standard: string | null
          contractor_type: string | null
          created_at: string
          dayparts: string[] | null
          days_of_week: number[] | null
          description: string | null
          due_time: string | null
          evidence_types: string[] | null
          frequency: string
          id: string
          instructions: string | null
          is_active: boolean | null
          is_critical: boolean | null
          is_template_library: boolean | null
          linked_risk_id: string | null
          linked_sop_id: string | null
          name: string
          notes: string | null
          recurrence_pattern: Json | null
          repeatable_field_name: string | null
          requires_risk_assessment: boolean | null
          requires_sop: boolean | null
          site_id: string | null
          slug: string
          start_time: string | null
          tags: string[] | null
          time_of_day: string | null
          triggers_contractor_on_failure: boolean | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          active?: boolean | null
          asset_id?: string | null
          asset_type?: string | null
          assigned_to_role?: string | null
          assigned_to_user_id?: string | null
          audience?: string | null
          audit_category?: string | null
          category: string
          company_id?: string | null
          compliance_standard?: string | null
          contractor_type?: string | null
          created_at?: string
          dayparts?: string[] | null
          days_of_week?: number[] | null
          description?: string | null
          due_time?: string | null
          evidence_types?: string[] | null
          frequency: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_critical?: boolean | null
          is_template_library?: boolean | null
          linked_risk_id?: string | null
          linked_sop_id?: string | null
          name: string
          notes?: string | null
          recurrence_pattern?: Json | null
          repeatable_field_name?: string | null
          requires_risk_assessment?: boolean | null
          requires_sop?: boolean | null
          site_id?: string | null
          slug: string
          start_time?: string | null
          tags?: string[] | null
          time_of_day?: string | null
          triggers_contractor_on_failure?: boolean | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          active?: boolean | null
          asset_id?: string | null
          asset_type?: string | null
          assigned_to_role?: string | null
          assigned_to_user_id?: string | null
          audience?: string | null
          audit_category?: string | null
          category?: string
          company_id?: string | null
          compliance_standard?: string | null
          contractor_type?: string | null
          created_at?: string
          dayparts?: string[] | null
          days_of_week?: number[] | null
          description?: string | null
          due_time?: string | null
          evidence_types?: string[] | null
          frequency?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_critical?: boolean | null
          is_template_library?: boolean | null
          linked_risk_id?: string | null
          linked_sop_id?: string | null
          name?: string
          notes?: string | null
          recurrence_pattern?: Json | null
          repeatable_field_name?: string | null
          requires_risk_assessment?: boolean | null
          requires_sop?: boolean | null
          site_id?: string | null
          slug?: string
          start_time?: string | null
          tags?: string[] | null
          time_of_day?: string | null
          triggers_contractor_on_failure?: boolean | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_uptime_report"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "task_templates_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "task_templates_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_linked_risk_id_fkey"
            columns: ["linked_risk_id"]
            isOneToOne: false
            referencedRelation: "risk_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_linked_sop_id_fkey"
            columns: ["linked_sop_id"]
            isOneToOne: false
            referencedRelation: "sop_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "task_templates_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates_archive: {
        Row: {
          active: boolean | null
          asset_id: string | null
          asset_type: string | null
          assigned_to_role: string | null
          assigned_to_user_id: string | null
          audience: string | null
          audit_category: string | null
          category: string
          company_id: string | null
          compliance_standard: string | null
          contractor_type: string | null
          created_at: string
          dayparts: string[] | null
          days_of_week: number[] | null
          description: string | null
          due_time: string | null
          evidence_types: string[] | null
          frequency: string
          id: string
          instructions: string | null
          is_active: boolean | null
          is_critical: boolean | null
          is_template_library: boolean | null
          linked_risk_id: string | null
          linked_sop_id: string | null
          name: string
          notes: string | null
          recurrence_pattern: Json | null
          repeatable_field_name: string | null
          requires_risk_assessment: boolean | null
          requires_sop: boolean | null
          site_id: string | null
          slug: string
          start_time: string | null
          tags: string[] | null
          time_of_day: string | null
          triggers_contractor_on_failure: boolean | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          active?: boolean | null
          asset_id?: string | null
          asset_type?: string | null
          assigned_to_role?: string | null
          assigned_to_user_id?: string | null
          audience?: string | null
          audit_category?: string | null
          category: string
          company_id?: string | null
          compliance_standard?: string | null
          contractor_type?: string | null
          created_at?: string
          dayparts?: string[] | null
          days_of_week?: number[] | null
          description?: string | null
          due_time?: string | null
          evidence_types?: string[] | null
          frequency: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_critical?: boolean | null
          is_template_library?: boolean | null
          linked_risk_id?: string | null
          linked_sop_id?: string | null
          name: string
          notes?: string | null
          recurrence_pattern?: Json | null
          repeatable_field_name?: string | null
          requires_risk_assessment?: boolean | null
          requires_sop?: boolean | null
          site_id?: string | null
          slug: string
          start_time?: string | null
          tags?: string[] | null
          time_of_day?: string | null
          triggers_contractor_on_failure?: boolean | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          active?: boolean | null
          asset_id?: string | null
          asset_type?: string | null
          assigned_to_role?: string | null
          assigned_to_user_id?: string | null
          audience?: string | null
          audit_category?: string | null
          category?: string
          company_id?: string | null
          compliance_standard?: string | null
          contractor_type?: string | null
          created_at?: string
          dayparts?: string[] | null
          days_of_week?: number[] | null
          description?: string | null
          due_time?: string | null
          evidence_types?: string[] | null
          frequency?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_critical?: boolean | null
          is_template_library?: boolean | null
          linked_risk_id?: string | null
          linked_sop_id?: string | null
          name?: string
          notes?: string | null
          recurrence_pattern?: Json | null
          repeatable_field_name?: string | null
          requires_risk_assessment?: boolean | null
          requires_sop?: boolean | null
          site_id?: string | null
          slug?: string
          start_time?: string | null
          tags?: string[] | null
          time_of_day?: string | null
          triggers_contractor_on_failure?: boolean | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actor_staff_id: string | null
          archived: boolean | null
          archived_at: string | null
          archived_by: string | null
          assigned_to: string | null
          category: string | null
          company_department_id: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          created_from_message_id: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          metadata: Json | null
          not_applicable_reason: string | null
          notes: string | null
          priority: string | null
          site_id: string | null
          staff_id: string | null
          status: string | null
          template_id: string | null
          template_notes: string | null
          title: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          actor_staff_id?: string | null
          archived?: boolean | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string | null
          category?: string | null
          company_department_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_from_message_id?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          metadata?: Json | null
          not_applicable_reason?: string | null
          notes?: string | null
          priority?: string | null
          site_id?: string | null
          staff_id?: string | null
          status?: string | null
          template_id?: string | null
          template_notes?: string | null
          title: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          actor_staff_id?: string | null
          archived?: boolean | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string | null
          category?: string | null
          company_department_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          created_from_message_id?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          metadata?: Json | null
          not_applicable_reason?: string | null
          notes?: string | null
          priority?: string | null
          site_id?: string | null
          staff_id?: string | null
          status?: string | null
          template_id?: string | null
          template_notes?: string | null
          title?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_department_id_fkey"
            columns: ["company_department_id"]
            isOneToOne: false
            referencedRelation: "company_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_from_message_id_fkey"
            columns: ["created_from_message_id"]
            isOneToOne: false
            referencedRelation: "messaging_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      temp_readings: {
        Row: {
          asset_id: string
          auth_user_id: string
          id: string
          method: string
          note: string | null
          taken_at: string
          temp_c: number
        }
        Insert: {
          asset_id: string
          auth_user_id: string
          id?: string
          method?: string
          note?: string | null
          taken_at?: string
          temp_c: number
        }
        Update: {
          asset_id?: string
          auth_user_id?: string
          id?: string
          method?: string
          note?: string | null
          taken_at?: string
          temp_c?: number
        }
        Relationships: []
      }
      temperature_breach_actions: {
        Row: {
          action_type: string
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          site_id: string
          status: string
          temperature_log_id: string
          updated_at: string
        }
        Insert: {
          action_type: string
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          site_id: string
          status?: string
          temperature_log_id: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          site_id?: string
          status?: string
          temperature_log_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "temperature_breach_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_breach_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_breach_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_breach_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_breach_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_breach_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_breach_actions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "temperature_breach_actions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_breach_actions_temperature_log_id_fkey"
            columns: ["temperature_log_id"]
            isOneToOne: false
            referencedRelation: "temperature_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      temperature_ingest_keys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          label: string
          last_used_at: string | null
          rotated_at: string | null
          secret: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          last_used_at?: string | null
          rotated_at?: string | null
          secret: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          last_used_at?: string | null
          rotated_at?: string | null
          secret?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "temperature_ingest_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_ingest_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_ingest_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_ingest_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_ingest_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_ingest_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      temperature_logs: {
        Row: {
          asset_id: string | null
          company_id: string | null
          created_at: string | null
          day_part: string | null
          id: string
          meta: Json | null
          notes: string | null
          reading: number
          recorded_at: string | null
          recorded_by: string | null
          site_id: string | null
          source: string | null
          status: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          company_id?: string | null
          created_at?: string | null
          day_part?: string | null
          id?: string
          meta?: Json | null
          notes?: string | null
          reading: number
          recorded_at?: string | null
          recorded_by?: string | null
          site_id?: string | null
          source?: string | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          company_id?: string | null
          created_at?: string | null
          day_part?: string | null
          id?: string
          meta?: Json | null
          notes?: string | null
          reading?: number
          recorded_at?: string | null
          recorded_by?: string | null
          site_id?: string | null
          source?: string | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temperature_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      template_fields: {
        Row: {
          created_at: string
          field_name: string
          field_order: number
          field_type: string
          help_text: string | null
          id: string
          label: string
          options: Json | null
          placeholder: string | null
          required: boolean | null
          template_id: string
        }
        Insert: {
          created_at?: string
          field_name: string
          field_order?: number
          field_type: string
          help_text?: string | null
          id?: string
          label: string
          options?: Json | null
          placeholder?: string | null
          required?: boolean | null
          template_id: string
        }
        Update: {
          created_at?: string
          field_name?: string
          field_order?: number
          field_type?: string
          help_text?: string | null
          id?: string
          label?: string
          options?: Json | null
          placeholder?: string | null
          required?: boolean | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_repeatable_labels: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_default: boolean | null
          label: string
          label_value: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_default?: boolean | null
          label: string
          label_value?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_default?: boolean | null
          label?: string
          label_value?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_repeatable_labels_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      test_table: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      training_bookings: {
        Row: {
          company_id: string
          course: string
          created_at: string
          created_by: string | null
          id: string
          level: string | null
          notes: string | null
          provider: string | null
          scheduled_date: string | null
          site_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          course: string
          created_at?: string
          created_by?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          provider?: string | null
          scheduled_date?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          course?: string
          created_at?: string
          created_by?: string | null
          id?: string
          level?: string | null
          notes?: string | null
          provider?: string | null
          scheduled_date?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_bookings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_bookings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_bookings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "training_bookings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      training_records: {
        Row: {
          certificate_url: string | null
          completed_date: string | null
          expiry_date: string | null
          id: string
          provider: string | null
          training_type: Database["public"]["Enums"]["training_type"]
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          completed_date?: string | null
          expiry_date?: string | null
          id?: string
          provider?: string | null
          training_type: Database["public"]["Enums"]["training_type"]
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          completed_date?: string | null
          expiry_date?: string | null
          id?: string
          provider?: string | null
          training_type?: Database["public"]["Enums"]["training_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      troubleshooting_questions: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean
          order_index: number
          question_text: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          question_text: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          question_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          channel_id: string
          is_typing: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          is_typing?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          is_typing?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "messaging_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      user_certificates: {
        Row: {
          category: string
          certificate_type: string
          expiry_date: string
          file_path: string
          id: string
          uploaded_at: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          certificate_type: string
          expiry_date: string
          file_path: string
          id?: string
          uploaded_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          certificate_type?: string
          expiry_date?: string
          file_path?: string
          id?: string
          uploaded_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          answers_count: number
          app_role: string | null
          auth_user_id: string
          company_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          home_site: string | null
          id: string
          phone: string | null
          points: number
          position: string | null
          questions_count: number
          updated_at: string | null
        }
        Insert: {
          answers_count?: number
          app_role?: string | null
          auth_user_id: string
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          home_site?: string | null
          id?: string
          phone?: string | null
          points?: number
          position?: string | null
          questions_count?: number
          updated_at?: string | null
        }
        Update: {
          answers_count?: number
          app_role?: string | null
          auth_user_id?: string
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          home_site?: string | null
          id?: string
          phone?: string | null
          points?: number
          position?: string | null
          questions_count?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_home_site_fkey"
            columns: ["home_site"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "user_profiles_home_site_fkey"
            columns: ["home_site"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      user_site_access: {
        Row: {
          auth_user_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          profile_id: string | null
          role: string | null
          site_id: string
        }
        Insert: {
          auth_user_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          profile_id?: string | null
          role?: string | null
          site_id: string
        }
        Update: {
          auth_user_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          profile_id?: string | null
          role?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_site_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_site_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_site_access_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_site_access_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_site_access_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_site_access_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_site_access_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "user_site_access_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_logs: {
        Row: {
          id: string
          logged_at: string | null
          product: string
          quantity: number | null
          reason: string | null
          site_id: string
        }
        Insert: {
          id?: string
          logged_at?: string | null
          product: string
          quantity?: number | null
          reason?: string | null
          site_id: string
        }
        Update: {
          id?: string
          logged_at?: string | null
          product?: string
          quantity?: number | null
          reason?: string | null
          site_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_shifts: {
        Row: {
          app_role: Database["public"]["Enums"]["app_role"] | null
          clock_in_time: string | null
          company_id: string | null
          email: string | null
          full_name: string | null
          hours_on_shift: number | null
          id: string | null
          shift_notes: string | null
          site_id: string | null
          site_name: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "staff_attendance_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_company_eho_scores: {
        Row: {
          asset_compliance_score: number | null
          asset_count: number | null
          created_at: string | null
          eho_details: Json | null
          eho_score: number | null
          id: string | null
          name: string | null
          ra_count: number | null
          ra_coverage_score: number | null
          site_count: number | null
          sop_count: number | null
          sop_coverage_score: number | null
          task_completion_score: number | null
          task_count: number | null
          user_count: number | null
        }
        Relationships: []
      }
      admin_platform_stats: {
        Row: {
          active_assets: number | null
          active_risk_assessments: number | null
          active_templates: number | null
          active_users_this_week: number | null
          active_users_today: number | null
          callouts_this_week: number | null
          completed_tasks: number | null
          completions_this_week: number | null
          completions_today: number | null
          custom_templates: number | null
          library_templates: number | null
          messages_this_week: number | null
          messages_today: number | null
          missed_tasks: number | null
          new_companies_this_month: number | null
          new_companies_this_week: number | null
          open_callouts: number | null
          overdue_risk_assessments: number | null
          overdue_service_assets: number | null
          pending_tasks: number | null
          platform_admins: number | null
          sops_created_this_month: number | null
          tasks_completed_today: number | null
          tasks_created_today: number | null
          total_assets: number | null
          total_callouts: number | null
          total_channels: number | null
          total_companies: number | null
          total_completion_records: number | null
          total_messages: number | null
          total_risk_assessments: number | null
          total_sites: number | null
          total_sops: number | null
          total_tasks: number | null
          total_users: number | null
        }
        Relationships: []
      }
      asset_uptime_report: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          breakdown_count: number | null
          contractor_id: string | null
          last_resolved_on: string | null
          last_service_date: string | null
          ppm_penalty_avg: number | null
          reliability_index: number | null
          site_id: string | null
          total_downtime_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_contractor_id_fkey1"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_contractor_id_fkey1"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "assets_site_id_fkey1"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_site_id_fkey1"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          clock_in_at: string | null
          clock_in_date: string | null
          clock_out_at: string | null
          company_id: string | null
          created_at: string | null
          id: string | null
          location: Json | null
          notes: string | null
          site_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          clock_in_at?: string | null
          clock_in_date?: never
          clock_out_at?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          location?: never
          notes?: string | null
          site_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          clock_in_at?: string | null
          clock_in_date?: never
          clock_out_at?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          location?: never
          notes?: string | null
          site_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "staff_attendance_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      breakdowns: {
        Row: {
          asset_id: string | null
          company_id: string | null
          contractor_id: string | null
          cost: number | null
          created_at: string | null
          fault_summary: string | null
          id: string | null
          notes: string | null
          reported_by: string | null
          reported_on: string | null
          resolved_on: string | null
          site_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          company_id?: string | null
          contractor_id?: string | null
          cost?: number | null
          created_at?: string | null
          fault_summary?: string | null
          id?: string | null
          notes?: string | null
          reported_by?: string | null
          reported_on?: string | null
          resolved_on?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          company_id?: string | null
          contractor_id?: string | null
          cost?: number | null
          created_at?: string | null
          fault_summary?: string | null
          id?: string | null
          notes?: string | null
          reported_by?: string | null
          reported_on?: string | null
          resolved_on?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_breakdowns_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_uptime_report"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_breakdowns_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_breakdowns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "asset_breakdowns_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_breakdowns_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "asset_breakdowns_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      deduplicated_checklist_tasks: {
        Row: {
          assigned_to_role: string | null
          assigned_to_user_id: string | null
          company_id: string | null
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          created_at: string | null
          custom_instructions: string | null
          custom_name: string | null
          daypart: string | null
          due_date: string | null
          due_time: string | null
          escalated: boolean | null
          escalated_to: string | null
          escalation_reason: string | null
          expires_at: string | null
          flag_reason: string | null
          flagged: boolean | null
          generated_at: string | null
          id: string | null
          priority: string | null
          site_checklist_id: string | null
          site_id: string | null
          status: string | null
          task_data: Json | null
          template_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "checklist_tasks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ho_eho_visits: {
        Row: {
          inspector_name: string | null
          notes: string | null
          outcome: string | null
          report_url: string | null
          score: number | null
          site_name: string | null
          visit_date: string | null
        }
        Relationships: []
      }
      incident_reports: {
        Row: {
          action_taken: string | null
          company_id: string | null
          created_at: string | null
          date: string | null
          description: string | null
          id: string | null
          report_url: string | null
          site_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          company_id?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string | null
          report_url?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          company_id?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string | null
          report_url?: string | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      ppm_full_schedule: {
        Row: {
          asset_category: string | null
          asset_id: string | null
          asset_name: string | null
          asset_notes: string | null
          callout_fee: number | null
          contractor_category: string | null
          contractor_email: string | null
          contractor_id: string | null
          contractor_name: string | null
          contractor_ooh: string | null
          contractor_phone: string | null
          contractor_postcode: string | null
          contractor_region: string | null
          frequency_months: number | null
          hourly_rate: number | null
          install_date: string | null
          last_service_date: string | null
          next_service_date: string | null
          ppm_status: string | null
          purchase_date: string | null
          serial_number: string | null
          site_address: string | null
          site_id: string | null
          site_name: string | null
          site_postcode: string | null
          site_region: string | null
          warranty_expiry: string | null
        }
        Relationships: []
      }
      ppm_schedule: {
        Row: {
          asset_id: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          frequency: string | null
          id: string | null
          next_due_date: string | null
          site_id: string | null
          status: string | null
          task_type: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          id?: string | null
          next_due_date?: string | null
          site_id?: string | null
          status?: string | null
          task_type?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          id?: string | null
          next_due_date?: string | null
          site_id?: string | null
          status?: string | null
          task_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ppm_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_schedules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "ppm_schedules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_settings: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string | null
          key: string | null
          updated_at: string | null
          value: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          key?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          key?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      site_compliance_score_latest: {
        Row: {
          breakdown: Json | null
          created_at: string | null
          id: string | null
          missed_daily_checklists: number | null
          open_critical_incidents: number | null
          overdue_corrective_actions: number | null
          score: number | null
          score_date: string | null
          site_id: string | null
          temperature_breaches_last_7d: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_compliance_score_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "site_compliance_score_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_compliance_score_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_compliance_score_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      site_last_eho_visit: {
        Row: {
          outcome: string | null
          report_url: string | null
          score: number | null
          site_name: string | null
          visit_date: string | null
        }
        Relationships: []
      }
      tenant_compliance_overview: {
        Row: {
          average_score: number | null
          first_score_date: string | null
          highest_score: number | null
          latest_score_date: string | null
          lowest_score: number | null
          open_critical_incidents_today: number | null
          overdue_corrective_actions_today: number | null
          site_count: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_compliance_score_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_compliance_score_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      todays_attendance: {
        Row: {
          app_role: Database["public"]["Enums"]["app_role"] | null
          clock_in_time: string | null
          clock_out_time: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          shift_notes: string | null
          shift_status: string | null
          site_id: string | null
          site_name: string | null
          total_hours: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "staff_attendance_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_current_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      v_current_profile: {
        Row: {
          answers_count: number | null
          app_role: Database["public"]["Enums"]["app_role"] | null
          auth_user_id: string | null
          boh_foh: string | null
          company_id: string | null
          cossh_expiry_date: string | null
          cossh_trained: boolean | null
          created_at: string | null
          email: string | null
          fire_marshal_expiry_date: string | null
          fire_marshal_trained: boolean | null
          first_aid_expiry_date: string | null
          first_aid_trained: boolean | null
          food_safety_expiry_date: string | null
          food_safety_level: number | null
          full_name: string | null
          h_and_s_expiry_date: string | null
          h_and_s_level: number | null
          home_site: string | null
          id: string | null
          is_primary_gm: boolean | null
          last_login: string | null
          phone_number: string | null
          pin_code: string | null
          points: number | null
          position_title: string | null
          questions_count: number | null
          site_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          answers_count?: number | null
          app_role?: Database["public"]["Enums"]["app_role"] | null
          auth_user_id?: string | null
          boh_foh?: string | null
          company_id?: string | null
          cossh_expiry_date?: string | null
          cossh_trained?: boolean | null
          created_at?: string | null
          email?: string | null
          fire_marshal_expiry_date?: string | null
          fire_marshal_trained?: boolean | null
          first_aid_expiry_date?: string | null
          first_aid_trained?: boolean | null
          food_safety_expiry_date?: string | null
          food_safety_level?: number | null
          full_name?: string | null
          h_and_s_expiry_date?: string | null
          h_and_s_level?: number | null
          home_site?: string | null
          id?: string | null
          is_primary_gm?: boolean | null
          last_login?: string | null
          phone_number?: string | null
          pin_code?: string | null
          points?: number | null
          position_title?: string | null
          questions_count?: number | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          answers_count?: number | null
          app_role?: Database["public"]["Enums"]["app_role"] | null
          auth_user_id?: string | null
          boh_foh?: string | null
          company_id?: string | null
          cossh_expiry_date?: string | null
          cossh_trained?: boolean | null
          created_at?: string | null
          email?: string | null
          fire_marshal_expiry_date?: string | null
          fire_marshal_trained?: boolean | null
          first_aid_expiry_date?: string | null
          first_aid_trained?: boolean | null
          food_safety_expiry_date?: string | null
          food_safety_level?: number | null
          full_name?: string | null
          h_and_s_expiry_date?: string | null
          h_and_s_level?: number | null
          home_site?: string | null
          id?: string | null
          is_primary_gm?: boolean | null
          last_login?: string | null
          phone_number?: string | null
          pin_code?: string | null
          points?: number | null
          position_title?: string | null
          questions_count?: number | null
          site_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_home_site_fkey"
            columns: ["home_site"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "profiles_home_site_fkey"
            columns: ["home_site"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      v_task_instances_today_counts: {
        Row: {
          cnt: number | null
          company_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_temp_compliance: {
        Row: {
          ok_rate: number | null
          site_id: string | null
        }
        Relationships: []
      }
      v_user_scope: {
        Row: {
          company_id: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          company_id?: string | null
          full_name?: string | null
          id?: string | null
        }
        Update: {
          company_id?: string | null
          full_name?: string | null
          id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profiles_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_user_sites: {
        Row: {
          auth_user_id: string | null
          company_id: string | null
          site_id: string | null
        }
        Insert: {
          auth_user_id?: string | null
          company_id?: string | null
          site_id?: string | null
        }
        Update: {
          auth_user_id?: string | null
          company_id?: string | null
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_site_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "admin_company_eho_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_site_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_site_access_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ppm_full_schedule"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "user_site_access_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _due_from_frequency: { Args: { freq: string }; Returns: string }
      _next_due_from: { Args: { _from: string; freq: string }; Returns: string }
      _set_search_path: { Args: never; Returns: undefined }
      add_user_to_channel: {
        Args: {
          p_channel_id: string
          p_member_role?: string
          p_user_id: string
        }
        Returns: string
      }
      apply_templates_to_site: {
        Args: { p_site: string; p_template_ids: string[] }
        Returns: undefined
      }
      archive_asset: { Args: { asset_to_archive: string }; Returns: undefined }
      assign_default_contractors: {
        Args: { p_category: string; p_site_id: string }
        Returns: {
          ppm_contractor_id: string
          reactive_contractor_id: string
          warranty_contractor_id: string
        }[]
      }
      auto_archive_old_completed_tasks: { Args: never; Returns: undefined }
      auto_clock_out_old_shifts: { Args: never; Returns: number }
      auto_map_equipment: { Args: { p_client_id: string }; Returns: undefined }
      backfill_tasks: {
        Args: { p_end: string; p_start: string }
        Returns: undefined
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      calc_next_service_date: {
        Args: { p_base: string; p_freq: number }
        Returns: string
      }
      can_view_site: {
        Args: { p_company_id: string; p_site_id: string }
        Returns: boolean
      }
      check_user_company_match: {
        Args: { comp_id: string; user_uuid: string }
        Returns: boolean
      }
      cleanup_old_task_records: {
        Args: never
        Returns: {
          deleted_completion_records: number
          deleted_tasks: number
        }[]
      }
      cleanup_old_typing_indicators: { Args: never; Returns: undefined }
      close_callout: {
        Args: {
          p_callout_id: string
          p_documents?: Json
          p_repair_summary: string
        }
        Returns: boolean
      }
      complete_task: { Args: { task_uuid: string }; Returns: Json }
      complete_task_instance: {
        Args: { p_instance_id: string; p_note?: string; p_outcome: string }
        Returns: undefined
      }
      compute_site_compliance_score: {
        Args: { target_date?: string }
        Returns: undefined
      }
      create_asset_with_ppm:
        | {
            Args: {
              p_category: string
              p_company_id: string
              p_date_of_purchase: string
              p_install_date: string
              p_item_name: string
              p_model: string
              p_next_service_date: string
              p_notes: string
              p_ppm_contractor_id: string
              p_ppm_frequency_months: number
              p_reactive_contractor_id: string
              p_serial_number: string
              p_site_id: string
              p_warranty_contractor_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_add_to_ppm: boolean
              p_category_id: string
              p_company_id: string
              p_contractor_id: string
              p_date_of_purchase: string
              p_document_url: string
              p_item_name: string
              p_model: string
              p_ppm_services_per_year: number
              p_serial_number: string
              p_site_id: string
              p_type: string
              p_warranty_callout_info: string
              p_warranty_length_years: number
            }
            Returns: string
          }
      create_callout: {
        Args: {
          p_asset_id: string
          p_attachments?: Json
          p_callout_type: string
          p_fault_description?: string
          p_notes?: string
          p_priority?: string
          p_troubleshooting_complete?: boolean
        }
        Returns: string
      }
      create_company_and_site: {
        Args: { _company: Json; _site: Json }
        Returns: string
      }
      create_entity_channel: {
        Args: {
          p_channel_type: string
          p_company_id: string
          p_created_by: string
          p_entity_id: string
          p_name: string
        }
        Returns: string
      }
      create_late_task_notification: {
        Args: {
          p_assigned_user_id: string
          p_company_id: string
          p_due_time: string
          p_site_id: string
          p_task_id: string
          p_task_name: string
        }
        Returns: number
      }
      create_message_notification: {
        Args: {
          p_company_id: string
          p_conversation_id: string
          p_message_id: string
          p_message_preview: string
          p_recipient_id: string
          p_sender_id: string
        }
        Returns: string
      }
      create_task_ready_notification: {
        Args: {
          p_company_id: string
          p_due_time: string
          p_site_id: string
          p_task_id: string
          p_task_name: string
          p_user_id: string
        }
        Returns: string
      }
      create_task_with_pin: {
        Args: {
          p_actor_staff_id: string
          p_company_id: string
          p_pin: string
          p_site_id: string
          p_title: string
        }
        Returns: string
      }
      create_training_certificate_renewal_tasks: {
        Args: never
        Returns: number
      }
      current_company: { Args: never; Returns: string }
      current_company_id: { Args: never; Returns: string }
      current_site: { Args: never; Returns: string }
      current_tenant: { Args: never; Returns: string }
      current_user_company_id: { Args: never; Returns: string }
      current_user_id: { Args: never; Returns: string }
      generate_daily_tasks: {
        Args: { p_run_date?: string }
        Returns: undefined
      }
      generate_daily_tasks_from_active_tasks: {
        Args: never
        Returns: {
          daily_created: number
          errors: string[]
          monthly_created: number
          weekly_created: number
        }[]
      }
      generate_daily_tasks_only: {
        Args: never
        Returns: {
          daily_created: number
          errors: string[]
        }[]
      }
      generate_ingest_secret: { Args: never; Returns: string }
      get_active_shift: {
        Args: { p_user_id: string }
        Returns: {
          clock_in_time: string
          company_id: string
          hours_on_shift: number
          id: string
          shift_notes: string
          site_id: string
          user_id: string
        }[]
      }
      get_active_staff_on_site: {
        Args: { p_site_id: string }
        Returns: {
          clock_in_at: string
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_asset_callouts: {
        Args: { p_asset_id: string }
        Returns: {
          attachments: Json
          callout_type: string
          closed_at: string
          contractor_name: string
          created_at: string
          created_by_name: string
          documents: Json
          fault_description: string
          id: string
          log_timeline: Json
          notes: string
          priority: string
          reopened_at: string
          repair_summary: string
          status: string
          troubleshooting_complete: boolean
        }[]
      }
      get_assets_with_contractors: {
        Args: { p_company_id: string }
        Returns: {
          asset_id: string
          asset_name: string
          category: string
          contractor_category: string
          contractor_name: string
          contractor_region: string
          site_name: string
          site_region: string
        }[]
      }
      get_calendar_events: {
        Args: { p_client_id: string }
        Returns: {
          description: string
          equipment_name: string
          event_date: string
          title: string
        }[]
      }
      get_company_eho_readiness: {
        Args: { p_company_id: string }
        Returns: {
          asset_compliance_score: number
          company_id: string
          details: Json
          overall_score: number
          ra_coverage_score: number
          sop_coverage_score: number
          task_completion_score: number
          training_score: number
        }[]
      }
      get_company_for_current_user: { Args: never; Returns: string }
      get_compliance_summary: {
        Args: { p_end_date: string; p_site_id: string; p_start_date: string }
        Returns: {
          average_completion_time_seconds: number
          category: string
          completed_tasks: number
          completion_rate: number
          flagged_completions: number
          missed_tasks: number
          total_tasks: number
        }[]
      }
      get_contractors_by_type: {
        Args: { category: string; contractor_type: string; site_id: string }
        Returns: {
          callout_fee: number
          category: string
          company_id: string
          email: string
          hourly_rate: number
          id: string
          name: string
          phone: string
          region: string
          type: string
        }[]
      }
      get_contractors_for_asset:
        | {
            Args: { asset_id: string }
            Returns: {
              callout_fee: number
              category: string
              email: string
              hourly_rate: number
              id: string
              name: string
              ooh_phone: string
              phone: string
              region: string
              website: string
            }[]
          }
        | {
            Args: { p_category: string; p_company_id: string }
            Returns: {
              category: string
              email: string
              id: string
              name: string
              phone: string
            }[]
          }
      get_contractors_for_asset_by_type: {
        Args: { asset_id: string; contractor_type: string }
        Returns: {
          callout_fee: number
          category: string
          email: string
          hourly_rate: number
          id: string
          name: string
          phone: string
          region: string
          type: string
        }[]
      }
      get_contractors_for_site_and_category: {
        Args: { p_category: string; p_site_id: string }
        Returns: {
          callout_fee: number
          category: string
          email: string
          hourly_rate: number
          id: string
          name: string
          ooh_phone: string
          phone: string
          region: string
          website: string
        }[]
      }
      get_eho_allergen_information: {
        Args: { p_site_id: string }
        Returns: {
          allergen_name: string
          last_updated: string
          present_in_items: string[]
          procedures: string
        }[]
      }
      get_eho_cleaning_records: {
        Args: { p_end_date: string; p_site_id: string; p_start_date: string }
        Returns: {
          completed_at: string
          completed_by_name: string
          completion_data: Json
          completion_id: string
          daypart: string
          due_date: string
          template_name: string
        }[]
      }
      get_eho_incident_reports: {
        Args: { p_end_date: string; p_site_id: string; p_start_date: string }
        Returns: {
          description: string
          follow_up_actions: string
          incident_id: string
          incident_type: string
          occurred_at: string
          reported_by_name: string
          riddor_category: string
          severity: string
          status: string
        }[]
      }
      get_eho_maintenance_logs: {
        Args: { p_end_date: string; p_site_id: string; p_start_date: string }
        Returns: {
          asset_name: string
          completed_at: string
          completed_by_name: string
          description: string
          maintenance_id: string
          maintenance_type: string
          next_due_date: string
        }[]
      }
      get_eho_opening_closing_checklists: {
        Args: { p_end_date: string; p_site_id: string; p_start_date: string }
        Returns: {
          checklist_type: string
          completed_at: string
          completed_by_name: string
          completion_data: Json
          completion_id: string
          daypart: string
        }[]
      }
      get_eho_pest_control_records: {
        Args: { p_end_date: string; p_site_id: string; p_start_date: string }
        Returns: {
          actions_taken: string
          assessment_result: string
          completed_at: string
          completed_by_name: string
          completion_data: Json
          completion_id: string
          findings: string
        }[]
      }
      get_eho_report_data: {
        Args: {
          p_end_date: string
          p_site_id: string
          p_start_date: string
          p_template_categories?: string[]
        }
        Returns: {
          completed_at: string
          completed_by_name: string
          completed_by_role: string
          completion_data: Json
          completion_id: string
          daypart: string
          due_date: string
          due_time: string
          duration_seconds: number
          evidence_attachments: string[]
          flag_reason: string
          flagged: boolean
          task_id: string
          template_category: string
          template_id: string
          template_name: string
          template_slug: string
        }[]
      }
      get_eho_staff_health_declarations: {
        Args: { p_end_date: string; p_site_id: string; p_start_date: string }
        Returns: {
          declaration_date: string
          declaration_id: string
          fit_for_work: boolean
          health_status: string
          staff_name: string
          symptoms: string
        }[]
      }
      get_eho_supplier_delivery_records: {
        Args: { p_end_date: string; p_site_id: string; p_start_date: string }
        Returns: {
          condition_check: string
          delivery_date: string
          delivery_id: string
          items_received: string
          received_by_name: string
          supplier_name: string
          temperature_check: string
        }[]
      }
      get_eho_temperature_records: {
        Args: { p_end_date: string; p_site_id: string; p_start_date: string }
        Returns: {
          asset_name: string
          asset_type: string
          evaluation: Json
          reading: number
          recorded_at: string
          recorded_by_name: string
          status: string
          unit: string
        }[]
      }
      get_eho_training_records: {
        Args: { p_end_date: string; p_site_id: string; p_start_date: string }
        Returns: {
          certificate_number: string
          completed_at: string
          expiry_date: string
          provider: string
          staff_id: string
          staff_name: string
          training_type: string
        }[]
      }
      get_evidence_files: {
        Args: { p_completion_ids: string[] }
        Returns: {
          completion_id: string
          created_at: string
          evidence_path: string
          evidence_type: string
          file_size_bytes: number
        }[]
      }
      get_latest_sop_version: {
        Args: { p_company_id: string; p_ref_code: string }
        Returns: {
          author: string
          category: string
          created_at: string
          created_by: string
          id: string
          ref_code: string
          status: string
          title: string
          updated_at: string
          updated_by: string
          version: string
          version_number: number
        }[]
      }
      get_managers_on_shift: {
        Args: { p_company_id?: string; p_site_id?: string }
        Returns: {
          clock_in_at: string
          email: string
          full_name: string
          site_id: string
          user_id: string
        }[]
      }
      get_overdue_tasks: {
        Args: { site: string }
        Returns: {
          due_date: string
          task_name: string
        }[]
      }
      get_region_from_postcode: { Args: { postcode: string }; Returns: string }
      get_sop_versions: {
        Args: { p_company_id: string; p_ref_code: string }
        Returns: {
          author: string
          category: string
          change_notes: string
          created_at: string
          created_by: string
          id: string
          ref_code: string
          status: string
          title: string
          updated_at: string
          updated_by: string
          updated_by_name: string
          version: string
          version_number: number
        }[]
      }
      get_staff_on_shift_at_site: {
        Args: { p_site_id: string }
        Returns: {
          app_role: string
          clock_in_time: string
          email: string
          full_name: string
          hours_on_shift: number
          user_id: string
        }[]
      }
      get_temp_compliance: {
        Args: { site_id: string }
        Returns: {
          asset: string
          ok_rate: number
        }[]
      }
      get_upcoming_tasks: {
        Args: { site: string }
        Returns: {
          due_date: string
          task_name: string
        }[]
      }
      get_user_company_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      get_user_unread_count: { Args: { p_user_id: string }; Returns: number }
      has_site_access: { Args: { target_site: string }; Returns: boolean }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      import_contractors_csv: {
        Args: {
          callout_fee: number
          company_uuid: string
          email: string
          hourly_rate: number
          name: string
          notes: string
          ooh: string
          phone: string
        }
        Returns: undefined
      }
      increment_points:
        | { Args: { _amount: number; _auth_user_id: string }; Returns: number }
        | {
            Args: { delta?: number }
            Returns: {
              answers_count: number
              app_role: Database["public"]["Enums"]["app_role"]
              auth_user_id: string | null
              avatar_url: string | null
              boh_foh: string | null
              company_id: string | null
              cossh_expiry_date: string | null
              cossh_trained: boolean | null
              created_at: string | null
              email: string | null
              fire_marshal_expiry_date: string | null
              fire_marshal_trained: boolean | null
              first_aid_expiry_date: string | null
              first_aid_trained: boolean | null
              food_safety_expiry_date: string | null
              food_safety_level: number | null
              full_name: string | null
              h_and_s_expiry_date: string | null
              h_and_s_level: number | null
              home_site: string | null
              id: string
              is_platform_admin: boolean | null
              is_primary_gm: boolean | null
              last_login: string | null
              phone_number: string | null
              pin_code: string | null
              points: number
              position_title: string | null
              questions_count: number
              site_id: string | null
              status: string | null
              updated_at: string
            }[]
            SetofOptions: {
              from: "*"
              to: "profiles"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      insert_contractor: {
        Args: {
          p_address?: string
          p_category: string
          p_company_id: string
          p_contact_name: string
          p_email: string
          p_emergency_phone?: string
          p_name: string
          p_notes?: string
          p_phone: string
        }
        Returns: {
          address: string
          category: string
          company_id: string
          contact_name: string
          created_at: string
          email: string
          emergency_phone: string
          id: string
          name: string
          notes: string
          phone: string
          updated_at: string
        }[]
      }
      insert_contractor_simple: {
        Args: {
          p_address?: string
          p_callout_fee?: number
          p_category: string
          p_company_id: string
          p_contact_name?: string
          p_contract_expiry?: string
          p_contract_file?: string
          p_contract_start?: string
          p_email?: string
          p_hourly_rate?: number
          p_is_active?: boolean
          p_name: string
          p_notes?: string
          p_ooh_phone?: string
          p_phone?: string
          p_postcode?: string
          p_region?: string
          p_site_id?: string
          p_status?: string
          p_type?: string
          p_website?: string
        }
        Returns: {
          address: string
          callout_fee: number
          category: string
          company_id: string
          contact_name: string
          contract_expiry: string
          contract_file: string
          contract_start: string
          created_at: string
          email: string
          hourly_rate: number
          id: string
          is_active: boolean
          name: string
          notes: string
          ooh_phone: string
          phone: string
          postcode: string
          region: string
          site_id: string
          status: string
          type: string
          updated_at: string
          website: string
        }[]
      }
      insert_contractor_with_sites: {
        Args: {
          p_address?: string
          p_category: string
          p_company_id: string
          p_contact_name?: string
          p_contract_expiry?: string
          p_contract_file?: string
          p_contract_start?: string
          p_contractor_name: string
          p_email?: string
          p_emergency_phone?: string
          p_notes?: string
          p_phone?: string
          p_site_ids?: string[]
        }
        Returns: string
      }
      instantiate_tasks_for_company: {
        Args: { _company_id: string }
        Returns: number
      }
      is_conversation_participant: {
        Args: { conv_id: string; user_uuid: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_service_role: { Args: never; Returns: boolean }
      is_site_member: { Args: { s: string }; Returns: boolean }
      is_user_admin_or_manager: { Args: never; Returns: boolean }
      is_user_clocked_in: {
        Args: { p_site_id?: string; p_user_id: string }
        Returns: boolean
      }
      is_user_clocked_in_today: {
        Args: { p_date?: string; p_site_id?: string; p_user_id: string }
        Returns: boolean
      }
      jwt_custom_claims: { Args: never; Returns: Json }
      log_breakdown: {
        Args: {
          asset: string
          description: string
          severity?: string
          user_id: string
        }
        Returns: string
      }
      manual_refresh_gm_index: { Args: never; Returns: undefined }
      mark_notifications_processed: {
        Args: { p_ids: string[] }
        Returns: {
          id: string
        }[]
      }
      matches_current_tenant: { Args: { target: string }; Returns: boolean }
      outbox_ack: {
        Args: { p_ids: string[] }
        Returns: {
          id: string
        }[]
      }
      outbox_claim: {
        Args: { p_lease_seconds?: number; p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          error: string | null
          for_date: string
          id: string
          kind: string
          lease_expires_at: string | null
          payload: Json
          processed_at: string | null
          processing_started_at: string | null
          site_id: string
          task_instance_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notifications_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      outbox_fail: {
        Args: { p_error: string; p_id: string }
        Returns: undefined
      }
      outbox_housekeeping: { Args: never; Returns: undefined }
      outbox_release: {
        Args: { p_ids: string[] }
        Returns: {
          id: string
        }[]
      }
      pin_attempts_purge: { Args: never; Returns: undefined }
      region_from_postcode: { Args: { pc: string }; Returns: string }
      reopen_callout: { Args: { p_callout_id: string }; Returns: boolean }
      rotate_staff_pin: {
        Args: { p_plain_pin: string; p_staff_id: string }
        Returns: undefined
      }
      scan_task_escalations: {
        Args: { p_now?: string; p_site_id: string }
        Returns: number
      }
      set_task_status: {
        Args: { _reason?: string; _status: string; _task_id: string }
        Returns: {
          awarded_points: number
          completed_at: string
          new_user_points: number
          status: string
          task_id: string
          title: string
        }[]
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      update_contractor: {
        Args: {
          p_address?: string
          p_category: string
          p_company_id: string
          p_contact_name: string
          p_email: string
          p_emergency_phone?: string
          p_id: string
          p_name: string
          p_notes?: string
          p_phone: string
        }
        Returns: {
          address: string
          category: string
          company_id: string
          contact_name: string
          created_at: string
          email: string
          emergency_phone: string
          id: string
          name: string
          notes: string
          phone: string
          updated_at: string
        }[]
      }
      update_contractor_simple: {
        Args: {
          p_address?: string
          p_callout_fee?: number
          p_category: string
          p_company_id: string
          p_contact_name?: string
          p_contract_expiry?: string
          p_contract_file?: string
          p_contract_start?: string
          p_email?: string
          p_hourly_rate?: number
          p_id: string
          p_is_active?: boolean
          p_name: string
          p_notes?: string
          p_ooh_phone?: string
          p_phone?: string
          p_postcode?: string
          p_region?: string
          p_site_id?: string
          p_status?: string
          p_type?: string
          p_website?: string
        }
        Returns: {
          address: string
          callout_fee: number
          category: string
          company_id: string
          contact_name: string
          contract_expiry: string
          contract_file: string
          contract_start: string
          created_at: string
          email: string
          hourly_rate: number
          id: string
          is_active: boolean
          name: string
          notes: string
          ooh_phone: string
          phone: string
          postcode: string
          region: string
          site_id: string
          status: string
          type: string
          updated_at: string
          website: string
        }[]
      }
      update_contractor_with_sites: {
        Args: {
          p_address?: string
          p_category: string
          p_contact_name?: string
          p_contract_expiry?: string
          p_contract_file?: string
          p_contract_start?: string
          p_contractor_id: string
          p_contractor_name: string
          p_email?: string
          p_emergency_phone?: string
          p_notes?: string
          p_phone?: string
          p_site_ids?: string[]
        }
        Returns: undefined
      }
      update_gm_link: {
        Args: { p_gm_id: string; p_site_id: string }
        Returns: undefined
      }
      upsert_company: {
        Args: { p_country: string; p_name: string; p_owner_id: string }
        Returns: string
      }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      user_belongs_to_company: {
        Args: { comp_id: string; user_uuid: string }
        Returns: boolean
      }
      user_belongs_to_site: {
        Args: { site_uuid: string; user_uuid: string }
        Returns: boolean
      }
      user_has_site: { Args: { p_site: string }; Returns: boolean }
      verify_attendance_logs_setup: {
        Args: never
        Returns: {
          check_name: string
          message: string
          status: string
        }[]
      }
    }
    Enums: {
      app_role: "Admin" | "Manager" | "Staff" | "Owner" | "General Manager"
      asset_type:
        | "fridge"
        | "freezer"
        | "blast_freezer"
        | "display_fridge"
        | "call_point"
        | "extinguisher"
        | "alarm_panel"
        | "smoke_detector"
        | "equipment"
        | "furniture"
        | "appliance"
        | "safety"
        | "refrigeration"
        | "cooking"
        | "dishwashing"
        | "coffee"
        | "other"
      company_role: "owner" | "admin" | "manager" | "staff" | "device"
      contact_role:
        | "pest_control"
        | "fire_safety"
        | "equipment_engineer"
        | "emergency_service"
        | "staff_contact"
      eho_outcome: "Pass" | "Improvement Required" | "Fail"
      escalation_level: "due_soon" | "overdue"
      freq: "daily" | "weekly" | "monthly" | "scheduled"
      licence_type: "alcohol" | "music" | "insurance" | "other"
      region_uk:
        | "london"
        | "southeast"
        | "southwest"
        | "midlands"
        | "northwest"
        | "northeast"
        | "scotland"
        | "wales"
        | "northern_ireland"
        | "channel_islands"
      schedule_freq: "daily" | "weekly"
      task_status: "complete" | "incomplete" | "not_applicable" | "missed"
      template_category:
        | "daily_opening"
        | "daily_closing"
        | "weekly"
        | "monthly"
        | "pest_control"
        | "allergen"
        | "cleaning"
        | "temperature"
        | "fire_safety"
        | "ppm_equipment"
        | "licensing"
        | "warehouse"
        | "kitchen"
      training_type:
        | "level2_hygiene"
        | "allergen"
        | "fire_safety"
        | "first_aid"
        | "other"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      app_role: ["Admin", "Manager", "Staff", "Owner", "General Manager"],
      asset_type: [
        "fridge",
        "freezer",
        "blast_freezer",
        "display_fridge",
        "call_point",
        "extinguisher",
        "alarm_panel",
        "smoke_detector",
        "equipment",
        "furniture",
        "appliance",
        "safety",
        "refrigeration",
        "cooking",
        "dishwashing",
        "coffee",
        "other",
      ],
      company_role: ["owner", "admin", "manager", "staff", "device"],
      contact_role: [
        "pest_control",
        "fire_safety",
        "equipment_engineer",
        "emergency_service",
        "staff_contact",
      ],
      eho_outcome: ["Pass", "Improvement Required", "Fail"],
      escalation_level: ["due_soon", "overdue"],
      freq: ["daily", "weekly", "monthly", "scheduled"],
      licence_type: ["alcohol", "music", "insurance", "other"],
      region_uk: [
        "london",
        "southeast",
        "southwest",
        "midlands",
        "northwest",
        "northeast",
        "scotland",
        "wales",
        "northern_ireland",
        "channel_islands",
      ],
      schedule_freq: ["daily", "weekly"],
      task_status: ["complete", "incomplete", "not_applicable", "missed"],
      template_category: [
        "daily_opening",
        "daily_closing",
        "weekly",
        "monthly",
        "pest_control",
        "allergen",
        "cleaning",
        "temperature",
        "fire_safety",
        "ppm_equipment",
        "licensing",
        "warehouse",
        "kitchen",
      ],
      training_type: [
        "level2_hygiene",
        "allergen",
        "fire_safety",
        "first_aid",
        "other",
      ],
    },
  },
} as const

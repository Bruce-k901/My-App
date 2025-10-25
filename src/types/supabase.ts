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
            referencedRelation: "profiles"
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
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archived_assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "archived_assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
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
          email: string | null
          full_name: string | null
          id: string
          original_id: string | null
          position: string | null
          role: string | null
          site_id: string | null
        }
        Insert: {
          app_role?: string | null
          archived_at?: string | null
          auth_user_id?: string | null
          boh_foh?: string | null
          company_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          original_id?: string | null
          position?: string | null
          role?: string | null
          site_id?: string | null
        }
        Update: {
          app_role?: string | null
          archived_at?: string | null
          auth_user_id?: string | null
          boh_foh?: string | null
          company_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          original_id?: string | null
          position?: string | null
          role?: string | null
          site_id?: string | null
        }
        Relationships: [
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
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_category_map_redundant: {
        Row: {
          asset_name: string
          category_name: string
        }
        Insert: {
          asset_name: string
          category_name: string
        }
        Update: {
          asset_name?: string
          category_name?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          category: string | null
          company_id: string | null
          contractor_id: string | null
          created_at: string | null
          id: string
          install_date: string | null
          model: string | null
          name: string
          next_service: string | null
          notes: string | null
          serial_number: string | null
          site_id: string | null
          status: string | null
          warranty_end: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          id?: string
          install_date?: string | null
          model?: string | null
          name: string
          next_service?: string | null
          notes?: string | null
          serial_number?: string | null
          site_id?: string | null
          status?: string | null
          warranty_end?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          id?: string
          install_date?: string | null
          model?: string | null
          name?: string
          next_service?: string | null
          notes?: string | null
          serial_number?: string | null
          site_id?: string | null
          status?: string | null
          warranty_end?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_company_id_fkey1"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
      assets_redundant: {
        Row: {
          add_to_ppm: boolean | null
          area_id: string | null
          asset_code: string | null
          category_id: string | null
          code: string
          company_id: string
          contractor_id: string | null
          contractor_ppm_id: string | null
          contractor_reactive_id: string | null
          date_of_purchase: string | null
          deactivated_on: string | null
          document_url: string | null
          id: string
          installed_on: string | null
          is_active: boolean
          label: string | null
          manufacturer: string | null
          model: string | null
          next_service_due: string | null
          ppm_services_per_year: number | null
          serial_number: string | null
          site_id: string
          type: Database["public"]["Enums"]["asset_type"]
          under_warranty: boolean | null
          updated_at: string | null
          warranty_callout_info: string | null
          warranty_length_years: number | null
        }
        Insert: {
          add_to_ppm?: boolean | null
          area_id?: string | null
          asset_code?: string | null
          category_id?: string | null
          code?: string
          company_id: string
          contractor_id?: string | null
          contractor_ppm_id?: string | null
          contractor_reactive_id?: string | null
          date_of_purchase?: string | null
          deactivated_on?: string | null
          document_url?: string | null
          id?: string
          installed_on?: string | null
          is_active?: boolean
          label?: string | null
          manufacturer?: string | null
          model?: string | null
          next_service_due?: string | null
          ppm_services_per_year?: number | null
          serial_number?: string | null
          site_id: string
          type: Database["public"]["Enums"]["asset_type"]
          under_warranty?: boolean | null
          updated_at?: string | null
          warranty_callout_info?: string | null
          warranty_length_years?: number | null
        }
        Update: {
          add_to_ppm?: boolean | null
          area_id?: string | null
          asset_code?: string | null
          category_id?: string | null
          code?: string
          company_id?: string
          contractor_id?: string | null
          contractor_ppm_id?: string | null
          contractor_reactive_id?: string | null
          date_of_purchase?: string | null
          deactivated_on?: string | null
          document_url?: string | null
          id?: string
          installed_on?: string | null
          is_active?: boolean
          label?: string | null
          manufacturer?: string | null
          model?: string | null
          next_service_due?: string | null
          ppm_services_per_year?: number | null
          serial_number?: string | null
          site_id?: string
          type?: Database["public"]["Enums"]["asset_type"]
          under_warranty?: boolean | null
          updated_at?: string | null
          warranty_callout_info?: string | null
          warranty_length_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "site_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ppm_categories_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_export"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "zz_old_maintenance_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_contractor_ppm_id_fkey"
            columns: ["contractor_ppm_id"]
            isOneToOne: false
            referencedRelation: "contractors_export"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_contractor_ppm_id_fkey"
            columns: ["contractor_ppm_id"]
            isOneToOne: false
            referencedRelation: "contractors_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_contractor_ppm_id_fkey"
            columns: ["contractor_ppm_id"]
            isOneToOne: false
            referencedRelation: "zz_old_maintenance_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_contractor_reactive_id_fkey"
            columns: ["contractor_reactive_id"]
            isOneToOne: false
            referencedRelation: "contractors_export"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_contractor_reactive_id_fkey"
            columns: ["contractor_reactive_id"]
            isOneToOne: false
            referencedRelation: "contractors_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_contractor_reactive_id_fkey"
            columns: ["contractor_reactive_id"]
            isOneToOne: false
            referencedRelation: "zz_old_maintenance_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      breakdowns: {
        Row: {
          asset_id: string | null
          attended_at: string | null
          created_at: string | null
          description: string
          engineer_notes: string | null
          evidence: string | null
          id: string
          reported_at: string | null
          reported_by: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          attended_at?: string | null
          created_at?: string | null
          description: string
          engineer_notes?: string | null
          evidence?: string | null
          id?: string
          reported_at?: string | null
          reported_by?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          attended_at?: string | null
          created_at?: string | null
          description?: string
          engineer_notes?: string | null
          evidence?: string | null
          id?: string
          reported_at?: string | null
          reported_by?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "breakdowns_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_redundant"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          category: Database["public"]["Enums"]["template_category"]
          created_at: string | null
          default_selected: boolean
          description: string | null
          frequency: Database["public"]["Enums"]["freq"]
          id: string
          library_id: string | null
          name: string
        }
        Insert: {
          category: Database["public"]["Enums"]["template_category"]
          created_at?: string | null
          default_selected?: boolean
          description?: string | null
          frequency: Database["public"]["Enums"]["freq"]
          id?: string
          library_id?: string | null
          name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["template_category"]
          created_at?: string | null
          default_selected?: boolean
          description?: string | null
          frequency?: Database["public"]["Enums"]["freq"]
          id?: string
          library_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "task_library"
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
          status: string | null
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
          status?: string | null
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
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
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
            referencedRelation: "companies"
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
            foreignKeyName: "contractor_sites_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_export"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_sites_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_sites_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "zz_old_maintenance_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "contractor_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
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
          callout_fee: number | null
          category: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          name: string
          notes: string | null
          ooh: string | null
          ooh_phone: string | null
          phone: string | null
          postcode: string | null
          region: string | null
          website: string | null
        }
        Insert: {
          callout_fee?: number | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          notes?: string | null
          ooh?: string | null
          ooh_phone?: string | null
          phone?: string | null
          postcode?: string | null
          region?: string | null
          website?: string | null
        }
        Update: {
          callout_fee?: number | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          notes?: string | null
          ooh?: string | null
          ooh_phone?: string | null
          phone?: string | null
          postcode?: string | null
          region?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractors_company_id_fkey1"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors_backup: {
        Row: {
          address: string | null
          callout_fee: number | null
          category: string | null
          company_id: string
          contact_name: string | null
          contract_expiry: string | null
          contract_file: string | null
          contract_start: string | null
          contractor_name: string
          created_at: string | null
          email: string | null
          emergency_phone: string | null
          hourly_rate: number | null
          id: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          callout_fee?: number | null
          category?: string | null
          company_id: string
          contact_name?: string | null
          contract_expiry?: string | null
          contract_file?: string | null
          contract_start?: string | null
          contractor_name: string
          created_at?: string | null
          email?: string | null
          emergency_phone?: string | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          callout_fee?: number | null
          category?: string | null
          company_id?: string
          contact_name?: string | null
          contract_expiry?: string | null
          contract_file?: string | null
          contract_start?: string | null
          contractor_name?: string
          created_at?: string | null
          email?: string | null
          emergency_phone?: string | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_contractors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors_redundant: {
        Row: {
          callout_fee: number | null
          category: string | null
          category_id: string | null
          company_id: string
          created_at: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          name: string
          notes: string | null
          ooh: string | null
          phone: string | null
          postcode: string | null
          region: string | null
          regions_covered: Database["public"]["Enums"]["region_uk"][] | null
          updated_at: string | null
        }
        Insert: {
          callout_fee?: number | null
          category?: string | null
          category_id?: string | null
          company_id: string
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          notes?: string | null
          ooh?: string | null
          phone?: string | null
          postcode?: string | null
          region?: string | null
          regions_covered?: Database["public"]["Enums"]["region_uk"][] | null
          updated_at?: string | null
        }
        Update: {
          callout_fee?: number | null
          category?: string | null
          category_id?: string | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          notes?: string | null
          ooh?: string | null
          phone?: string | null
          postcode?: string | null
          region?: string | null
          regions_covered?: Database["public"]["Enums"]["region_uk"][] | null
          updated_at?: string | null
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
            foreignKeyName: "contractors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contractors_company"
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
          created_at: string | null
          id: string
          last_review_date: string | null
          msds_url: string | null
          next_review_date: string | null
          responsible_person: string | null
          site_id: string | null
          status: string | null
        }
        Insert: {
          chemical_name: string
          created_at?: string | null
          id?: string
          last_review_date?: string | null
          msds_url?: string | null
          next_review_date?: string | null
          responsible_person?: string | null
          site_id?: string | null
          status?: string | null
        }
        Update: {
          chemical_name?: string
          created_at?: string | null
          id?: string
          last_review_date?: string | null
          msds_url?: string | null
          next_review_date?: string | null
          responsible_person?: string | null
          site_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coshh_register_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "coshh_register_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
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
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "dayparts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
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
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "device_accounts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
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
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["contact_role"]
          site_id: string
        }
        Insert: {
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["contact_role"]
          site_id: string
        }
        Update: {
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["contact_role"]
          site_id?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "fire_tests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_redundant"
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
        }
        Relationships: []
      }
      incidents: {
        Row: {
          action_taken: string | null
          description: string
          id: string
          incident_date: string
          report_url: string | null
          site_id: string
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          description: string
          id?: string
          incident_date?: string
          report_url?: string | null
          site_id: string
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          description?: string
          id?: string
          incident_date?: string
          report_url?: string | null
          site_id?: string
          user_id?: string | null
        }
        Relationships: [
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
            referencedRelation: "v_user_scope"
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
      maintenance_contractor_sites: {
        Row: {
          contractor_id: string
          site_id: string
        }
        Insert: {
          contractor_id: string
          site_id: string
        }
        Update: {
          contractor_id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_contractor_sites_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_backup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contractor_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "maintenance_contractor_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "maintenance_contractor_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contractor_sites_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      maintenance_contractors: {
        Row: {
          callout_fee: number | null
          category_id: string | null
          category_name: string | null
          company_id: string | null
          contractor_name: string
          created_at: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          notes: string | null
          ooh: string | null
          phone: string | null
          postcode: string | null
          region: string | null
          regions_covered: string[] | null
          updated_at: string | null
        }
        Insert: {
          callout_fee?: number | null
          category_id?: string | null
          category_name?: string | null
          company_id?: string | null
          contractor_name: string
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          ooh?: string | null
          phone?: string | null
          postcode?: string | null
          region?: string | null
          regions_covered?: string[] | null
          updated_at?: string | null
        }
        Update: {
          callout_fee?: number | null
          category_id?: string | null
          category_name?: string | null
          company_id?: string | null
          contractor_name?: string
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          ooh?: string | null
          phone?: string | null
          postcode?: string | null
          region?: string | null
          regions_covered?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_contractors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "contractor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contractors_company_id_fkey1"
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
          id: string
          next_due: string | null
          notes: string | null
          performed_at: string | null
          performed_by: string | null
          site_id: string | null
          status: string | null
        }
        Insert: {
          asset_id?: string | null
          company_id?: string | null
          id?: string
          next_due?: string | null
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          site_id?: string | null
          status?: string | null
        }
        Update: {
          asset_id?: string | null
          company_id?: string | null
          id?: string
          next_due?: string | null
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          site_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_redundant"
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
            referencedRelation: "profiles"
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
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "maintenance_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
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
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          recipient_role: string | null
          seen: boolean | null
          severity: string | null
          site_id: string | null
          title: string
          type: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          recipient_role?: string | null
          seen?: boolean | null
          severity?: string | null
          site_id?: string | null
          title: string
          type: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          recipient_role?: string | null
          seen?: boolean | null
          severity?: string | null
          site_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "notifications_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "notifications_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
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
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "notifications_outbox_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
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
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "pin_attempts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
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
          uploaded_by?: string | null
        }
        Relationships: [
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
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "policies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
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
      ppm_schedule_redundant: {
        Row: {
          asset_id: string | null
          company_id: string | null
          contractor_id: string | null
          created_at: string | null
          frequency_months: number | null
          id: string
          last_service_date: string | null
          next_service_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          company_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          frequency_months?: number | null
          id?: string
          last_service_date?: string | null
          next_service_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          company_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          frequency_months?: number | null
          id?: string
          last_service_date?: string | null
          next_service_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ppm_schedule_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_schedule_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_schedule_contractor_fk"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "maintenance_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_schedule_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_export"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_schedule_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_schedule_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "zz_old_maintenance_contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      ppm_schedules: {
        Row: {
          asset_id: string | null
          created_at: string | null
          description: string | null
          frequency: string
          id: string
          next_due_date: string
          task_type: string
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          description?: string | null
          frequency: string
          id?: string
          next_due_date: string
          task_type: string
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          description?: string | null
          frequency?: string
          id?: string
          next_due_date?: string
          task_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ppm_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_redundant"
            referencedColumns: ["id"]
          },
        ]
      }
      ppm_service_events: {
        Row: {
          asset_id: string | null
          contractor_id: string | null
          created_at: string | null
          created_by: string | null
          file_url: string | null
          id: string
          notes: string | null
          ppm_id: string | null
          service_date: string
        }
        Insert: {
          asset_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          ppm_id?: string | null
          service_date?: string
        }
        Update: {
          asset_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          ppm_id?: string | null
          service_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ppm_service_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_service_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_export"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_service_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_service_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "zz_old_maintenance_contractors"
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
            foreignKeyName: "ppm_service_events_ppm_id_fkey"
            columns: ["ppm_id"]
            isOneToOne: false
            referencedRelation: "ppm_schedule_redundant"
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
            referencedRelation: "ho_calendar_ppm"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "ppm_task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ppm_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppm_task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "site_daily_tasks"
            referencedColumns: ["task_id"]
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
            foreignKeyName: "ppm_tasks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_redundant"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "companies"
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
          boh_foh: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          home_site: string | null
          id: string
          is_primary_gm: boolean | null
          last_login: string | null
          phone_number: string | null
          pin_code: string | null
          points: number
          position_title: string | null
          questions_count: number
          site_id: string | null
          updated_at: string
        }
        Insert: {
          answers_count?: number
          app_role?: Database["public"]["Enums"]["app_role"]
          auth_user_id?: string | null
          boh_foh?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          home_site?: string | null
          id?: string
          is_primary_gm?: boolean | null
          last_login?: string | null
          phone_number?: string | null
          pin_code?: string | null
          points?: number
          position_title?: string | null
          questions_count?: number
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          answers_count?: number
          app_role?: Database["public"]["Enums"]["app_role"]
          auth_user_id?: string | null
          boh_foh?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          home_site?: string | null
          id?: string
          is_primary_gm?: boolean | null
          last_login?: string | null
          phone_number?: string | null
          pin_code?: string | null
          points?: number
          position_title?: string | null
          questions_count?: number
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
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
      profiles_archive: {
        Row: {
          answers_count: number | null
          app_role: Database["public"]["Enums"]["app_role"] | null
          archived_at: string | null
          auth_user_id: string | null
          boh_foh: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          home_site: string | null
          id: string | null
          last_login: string | null
          phone_number: string | null
          pin_code: string | null
          points: number | null
          position_title: string | null
          questions_count: number | null
          role: string | null
          site_id: string | null
          updated_at: string | null
        }
        Insert: {
          answers_count?: number | null
          app_role?: Database["public"]["Enums"]["app_role"] | null
          archived_at?: string | null
          auth_user_id?: string | null
          boh_foh?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          home_site?: string | null
          id?: string | null
          last_login?: string | null
          phone_number?: string | null
          pin_code?: string | null
          points?: number | null
          position_title?: string | null
          questions_count?: number | null
          role?: string | null
          site_id?: string | null
          updated_at?: string | null
        }
        Update: {
          answers_count?: number | null
          app_role?: Database["public"]["Enums"]["app_role"] | null
          archived_at?: string | null
          auth_user_id?: string | null
          boh_foh?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          home_site?: string | null
          id?: string | null
          last_login?: string | null
          phone_number?: string | null
          pin_code?: string | null
          points?: number | null
          position_title?: string | null
          questions_count?: number | null
          role?: string | null
          site_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles_backup: {
        Row: {
          answers_count: number | null
          app_role: Database["public"]["Enums"]["app_role"] | null
          auth_user_id: string | null
          boh_foh: string | null
          company_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          home_site: string | null
          id: string | null
          last_login: string | null
          phone_number: string | null
          pin_code: string | null
          points: number | null
          position_title: string | null
          questions_count: number | null
          role: string | null
          site_id: string | null
          updated_at: string | null
        }
        Insert: {
          answers_count?: number | null
          app_role?: Database["public"]["Enums"]["app_role"] | null
          auth_user_id?: string | null
          boh_foh?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          home_site?: string | null
          id?: string | null
          last_login?: string | null
          phone_number?: string | null
          pin_code?: string | null
          points?: number | null
          position_title?: string | null
          questions_count?: number | null
          role?: string | null
          site_id?: string | null
          updated_at?: string | null
        }
        Update: {
          answers_count?: number | null
          app_role?: Database["public"]["Enums"]["app_role"] | null
          auth_user_id?: string | null
          boh_foh?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          home_site?: string | null
          id?: string | null
          last_login?: string | null
          phone_number?: string | null
          pin_code?: string | null
          points?: number | null
          position_title?: string | null
          questions_count?: number | null
          role?: string | null
          site_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
          assessor: string | null
          category: string | null
          created_at: string | null
          effective_date: string | null
          file_url: string | null
          id: string
          review_date: string | null
          site_id: string | null
          status: string | null
        }
        Insert: {
          assessor?: string | null
          category?: string | null
          created_at?: string | null
          effective_date?: string | null
          file_url?: string | null
          id?: string
          review_date?: string | null
          site_id?: string | null
          status?: string | null
        }
        Update: {
          assessor?: string | null
          category?: string | null
          created_at?: string | null
          effective_date?: string | null
          file_url?: string | null
          id?: string
          review_date?: string | null
          site_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "risk_assessments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "risk_assessments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
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
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "site_areas_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
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
          checklist_template_id: string | null
          day_part: string | null
          frequency: string | null
          id: string
          name: string | null
          site_id: string | null
        }
        Insert: {
          active?: boolean | null
          checklist_template_id?: string | null
          day_part?: string | null
          frequency?: string | null
          id?: string
          name?: string | null
          site_id?: string | null
        }
        Update: {
          active?: boolean | null
          checklist_template_id?: string | null
          day_part?: string | null
          frequency?: string | null
          id?: string
          name?: string | null
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_checklists_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_checklists_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "site_checklists_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "site_checklists_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_checklists_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
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
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_day_parts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "site_day_parts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
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
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "site_escalation_rules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
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
            referencedRelation: "profiles"
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
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "site_memberships_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
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
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "site_profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
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
          city: string | null
          company_id: string | null
          created_at: string | null
          gm_user_id: string | null
          id: string
          name: string
          operating_schedule: Json | null
          postcode: string | null
          region: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          gm_user_id?: string | null
          id?: string
          name: string
          operating_schedule?: Json | null
          postcode?: string | null
          region?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          gm_user_id?: string | null
          id?: string
          name?: string
          operating_schedule?: Json | null
          postcode?: string | null
          region?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
            referencedRelation: "v_user_scope"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_company_id_fkey1"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "companies"
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
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "staff_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
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
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "task_escalations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
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
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "task_instances_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
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
          {
            foreignKeyName: "task_instances_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
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
            referencedRelation: "profiles"
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
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "task_schedules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
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
          {
            foreignKeyName: "task_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "task_template_categories_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
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
        Relationships: [
          {
            foreignKeyName: "task_template_departments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "task_template_overrides_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
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
          {
            foreignKeyName: "task_template_overrides_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
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
          active: boolean
          audience: string | null
          category: string | null
          company_id: string | null
          created_at: string | null
          days_of_week: number[]
          description: string | null
          due_time: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          start_time: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          active?: boolean
          audience?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          days_of_week?: number[]
          description?: string | null
          due_time?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          start_time?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          active?: boolean
          audience?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          days_of_week?: number[]
          description?: string | null
          due_time?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          start_time?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actor_staff_id: string | null
          category: string | null
          company_department_id: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          not_applicable_reason: string | null
          site_id: string | null
          staff_id: string | null
          status: string | null
          template_id: string | null
          title: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          actor_staff_id?: string | null
          category?: string | null
          company_department_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          not_applicable_reason?: string | null
          site_id?: string | null
          staff_id?: string | null
          status?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          actor_staff_id?: string | null
          category?: string | null
          company_department_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          not_applicable_reason?: string | null
          site_id?: string | null
          staff_id?: string | null
          status?: string | null
          template_id?: string | null
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
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "tasks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "tasks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "tasks_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
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
        Relationships: [
          {
            foreignKeyName: "temp_readings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_redundant"
            referencedColumns: ["id"]
          },
        ]
      }
      temperature_logs: {
        Row: {
          asset_id: string | null
          company_id: string | null
          day_part: string | null
          id: string
          notes: string | null
          reading: number
          recorded_at: string | null
          recorded_by: string | null
          site_id: string | null
          status: string | null
          unit: string | null
        }
        Insert: {
          asset_id?: string | null
          company_id?: string | null
          day_part?: string | null
          id?: string
          notes?: string | null
          reading: number
          recorded_at?: string | null
          recorded_by?: string | null
          site_id?: string | null
          status?: string | null
          unit?: string | null
        }
        Update: {
          asset_id?: string | null
          company_id?: string | null
          day_part?: string | null
          id?: string
          notes?: string | null
          reading?: number
          recorded_at?: string | null
          recorded_by?: string | null
          site_id?: string | null
          status?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temperature_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets_redundant"
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
            referencedRelation: "profiles"
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
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "temperature_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
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
            referencedRelation: "profiles"
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
            referencedRelation: "profiles"
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
      asset_compliance: {
        Row: {
          completed_tasks: number | null
          overdue_tasks: number | null
          site_name: string | null
          task_name: string | null
          upcoming_tasks: number | null
        }
        Relationships: []
      }
      category_compliance: {
        Row: {
          category_name: string | null
          completed_tasks: number | null
          compliance_percent: number | null
          overdue_tasks: number | null
          total_tasks: number | null
          upcoming_tasks: number | null
        }
        Relationships: []
      }
      contractors_export: {
        Row: {
          callout_fee: number | null
          created_at: string | null
          email: string | null
          hourly_rate: number | null
          id: string | null
          name: string | null
          notes: string | null
          ooh: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          callout_fee?: number | null
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string | null
          name?: string | null
          notes?: string | null
          ooh?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          callout_fee?: number | null
          created_at?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string | null
          name?: string | null
          notes?: string | null
          ooh?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      defunct_assets: {
        Row: {
          asset_label: string | null
          deactivated_on: string | null
          installed_on: string | null
          manufacturer: string | null
          model: string | null
          serial_number: string | null
          site_name: string | null
        }
        Relationships: []
      }
      defunct_breakdowns: {
        Row: {
          asset_label: string | null
          description: string | null
          engineer_notes: string | null
          reported_at: string | null
          resolved_at: string | null
          severity: string | null
          site_name: string | null
        }
        Relationships: []
      }
      ho_calendar_breakdowns: {
        Row: {
          asset_label: string | null
          breakdown_id: string | null
          description: string | null
          reported_at: string | null
          severity: string | null
          site_name: string | null
          status: string | null
        }
        Relationships: []
      }
      ho_calendar_ppm: {
        Row: {
          certificate_url: string | null
          due_date: string | null
          group_id: string | null
          site_name: string | null
          task_id: string | null
          task_name: string | null
        }
        Relationships: []
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
      ho_site_compliance: {
        Row: {
          completed_tasks: number | null
          compliance_percent: number | null
          overdue_tasks: number | null
          site_id: string | null
          site_name: string | null
          upcoming_tasks: number | null
        }
        Relationships: []
      }
      ho_top_overdue_sites: {
        Row: {
          overdue_tasks: number | null
          site_name: string | null
        }
        Relationships: []
      }
      open_breakdowns: {
        Row: {
          asset_label: string | null
          breakdown_id: string | null
          description: string | null
          evidence: string | null
          reported_at: string | null
          severity: string | null
          site_name: string | null
        }
        Relationships: []
      }
      overdue_ppm_tasks: {
        Row: {
          certificate_url: string | null
          due_date: string | null
          group_id: string | null
          site_name: string | null
          task_name: string | null
        }
        Relationships: []
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
          warranty_end: string | null
        }
        Relationships: []
      }
      site_asset_groups: {
        Row: {
          asset_count: number | null
          category_id: string | null
          earliest_due: string | null
          latest_due: string | null
          site_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ppm_categories_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "ho_site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "site_compliance"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites_redundant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_temp_compliance"
            referencedColumns: ["site_id"]
          },
        ]
      }
      site_breakdowns: {
        Row: {
          asset_label: string | null
          attended_at: string | null
          breakdown_id: string | null
          description: string | null
          engineer_notes: string | null
          evidence: string | null
          reported_at: string | null
          resolved_at: string | null
          severity: string | null
          site_name: string | null
          status: string | null
        }
        Relationships: []
      }
      site_compliance: {
        Row: {
          completed_tasks: number | null
          compliance_percent: number | null
          overdue_tasks: number | null
          site_id: string | null
          site_name: string | null
          upcoming_tasks: number | null
        }
        Relationships: []
      }
      site_daily_tasks: {
        Row: {
          due_date: string | null
          group_id: string | null
          is_overdue: boolean | null
          site_name: string | null
          status: string | null
          task_id: string | null
          task_name: string | null
        }
        Relationships: []
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
      upcoming_ppm_tasks: {
        Row: {
          certificate_url: string | null
          due_date: string | null
          group_id: string | null
          site_name: string | null
          task_name: string | null
        }
        Relationships: []
      }
      v_company_tasks: {
        Row: {
          category_codes: string[] | null
          category_labels: string[] | null
          company_department_id: string | null
          company_id: string | null
          created_at: string | null
          department_label: string | null
          description: string | null
          due_date: string | null
          status: string | null
          task_id: string | null
          title: string | null
          weight: number | null
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
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_missing_company_ownership: {
        Row: {
          id: string | null
          name: string | null
          template_id: string | null
          what: string | null
        }
        Relationships: []
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
            referencedRelation: "companies"
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
      zz_old_maintenance_contractors: {
        Row: {
          callout_fee: number | null
          category_name: string | null
          company_id: string | null
          email: string | null
          hourly_rate: number | null
          id: string | null
          name: string | null
          notes: string | null
          ooh: string | null
          phone: string | null
          postcode: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_contractors_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _due_from_frequency: {
        Args: { freq: string }
        Returns: string
      }
      _next_due_from: {
        Args: { _from: string; freq: string }
        Returns: string
      }
      _set_search_path: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      apply_templates_to_site: {
        Args: { p_site: string; p_template_ids: string[] }
        Returns: undefined
      }
      archive_asset: {
        Args: { asset_to_archive: string }
        Returns: undefined
      }
      auto_map_equipment: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      backfill_tasks: {
        Args: { p_end: string; p_start: string }
        Returns: undefined
      }
      can_view_site: {
        Args: { p_company_id: string; p_site_id: string }
        Returns: boolean
      }
      complete_task: {
        Args: { task_uuid: string }
        Returns: Json
      }
      complete_task_instance: {
        Args: { p_instance_id: string; p_note?: string; p_outcome: string }
        Returns: undefined
      }
      create_asset_with_ppm: {
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
      create_company_and_site: {
        Args: { _company: Json; _site: Json }
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
      current_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      export_contractors_csv: {
        Args: { company_uuid: string }
        Returns: {
          callout_fee: number | null
          category: string | null
          category_id: string | null
          company_id: string
          created_at: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          name: string
          notes: string | null
          ooh: string | null
          phone: string | null
          postcode: string | null
          region: string | null
          regions_covered: Database["public"]["Enums"]["region_uk"][] | null
          updated_at: string | null
        }[]
      }
      generate_daily_tasks: {
        Args: { p_run_date?: string }
        Returns: undefined
      }
      generate_daily_tasks_london: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_if_new_local_day: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_today_and_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          cnt: number
          company_id: string
        }[]
      }
      generate_today_and_log: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_today_diag: {
        Args: { p_for_date?: string }
        Returns: {
          bad_daypart_fk: number
          null_day_part: number
          null_due_at: number
          null_for_date: number
          null_start_at: number
          total_rows: number
          uses_site_day_parts: boolean
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
      get_company_for_current_user: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_contractors_for_asset: {
        Args: { p_category: string; p_company_id: string }
        Returns: {
          category: string
          email: string
          id: string
          name: string
          phone: string
        }[]
      }
      get_overdue_tasks: {
        Args: { site: string }
        Returns: {
          due_date: string
          task_name: string
        }[]
      }
      get_region_from_postcode: {
        Args: { postcode: string }
        Returns: string
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
      increment_points: {
        Args: { _amount: number; _auth_user_id: string } | { delta?: number }
        Returns: number
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
      is_site_member: {
        Args: { s: string }
        Returns: boolean
      }
      list_tasks: {
        Args: {
          _category_codes?: string[]
          _company_id: string
          _department_codes?: string[]
          _statuses?: string[]
        }
        Returns: {
          category_codes: string[] | null
          category_labels: string[] | null
          company_department_id: string | null
          company_id: string | null
          created_at: string | null
          department_label: string | null
          description: string | null
          due_date: string | null
          status: string | null
          task_id: string | null
          title: string | null
          weight: number | null
        }[]
      }
      log_breakdown: {
        Args: {
          asset: string
          description: string
          severity?: string
          user_id: string
        }
        Returns: string
      }
      manual_refresh_gm_index: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      mark_notifications_processed: {
        Args: { p_ids: string[] }
        Returns: {
          id: string
        }[]
      }
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
      }
      outbox_fail: {
        Args: { p_error: string; p_id: string }
        Returns: undefined
      }
      outbox_housekeeping: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      outbox_release: {
        Args: { p_ids: string[] }
        Returns: {
          id: string
        }[]
      }
      pin_attempts_purge: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      region_from_postcode: {
        Args: { pc: string }
        Returns: string
      }
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
      task_status: "complete" | "incomplete" | "not_applicable"
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
      task_status: ["complete", "incomplete", "not_applicable"],
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
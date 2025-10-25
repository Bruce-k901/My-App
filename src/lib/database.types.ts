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
      assets: {
        Row: {
          id: string
          company_id: string
          site_id: string | null
          name: string
          brand: string | null
          model: string | null
          serial_number: string | null
          category: string
          install_date: string | null
          purchase_date: string | null
          warranty_end: string | null
          ppm_contractor_id: string | null
          reactive_contractor_id: string | null
          warranty_contractor_id: string | null
          ppm_frequency_months: number | null
          last_service_date: string | null
          next_service_date: string | null
          ppm_status: string | null
          notes: string | null
          status: string
          archived: boolean
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          site_id?: string | null
          name: string
          brand?: string | null
          model?: string | null
          serial_number?: string | null
          category: string
          install_date?: string | null
          purchase_date?: string | null
          warranty_end?: string | null
          ppm_contractor_id?: string | null
          reactive_contractor_id?: string | null
          warranty_contractor_id?: string | null
          ppm_frequency_months?: number | null
          last_service_date?: string | null
          next_service_date?: string | null
          ppm_status?: string | null
          notes?: string | null
          status?: string
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          site_id?: string | null
          name?: string
          brand?: string | null
          model?: string | null
          serial_number?: string | null
          category?: string
          install_date?: string | null
          purchase_date?: string | null
          warranty_end?: string | null
          ppm_contractor_id?: string | null
          reactive_contractor_id?: string | null
          warranty_contractor_id?: string | null
          ppm_frequency_months?: number | null
          last_service_date?: string | null
          next_service_date?: string | null
          ppm_status?: string | null
          notes?: string | null
          status?: string
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_site_id_fkey"
            columns: ["site_id"]
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_ppm_contractor_id_fkey"
            columns: ["ppm_contractor_id"]
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_reactive_contractor_id_fkey"
            columns: ["reactive_contractor_id"]
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_warranty_contractor_id_fkey"
            columns: ["warranty_contractor_id"]
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          }
        ]
      }
      companies: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contractors: {
        Row: {
          id: string
          company_id: string
          name: string
          region: string
          category: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          region: string
          category: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          region?: string
          category?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractors_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      sites: {
        Row: {
          id: string
          company_id: string
          name: string
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_assets_with_contractors: {
        Args: {
          company_id: string
        }
        Returns: {
          id: string
          name: string
          brand: string | null
          model: string | null
          serial_number: string | null
          category: string
          site_id: string | null
          site_name: string | null
          ppm_contractor_id: string | null
          ppm_contractor_name: string | null
          reactive_contractor_id: string | null
          reactive_contractor_name: string | null
          warranty_contractor_id: string | null
          warranty_contractor_name: string | null
          install_date: string | null
          warranty_end: string | null
          last_service_date: string | null
          next_service_date: string | null
          ppm_frequency_months: number | null
          ppm_status: string | null
          status: string
          archived: boolean
          notes: string | null
        }[]
      }
      create_asset_with_ppm: {
        Args: {
          asset_data: Json
        }
        Returns: string
      }
      archive_asset: {
        Args: {
          asset_id: string
        }
        Returns: boolean
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never


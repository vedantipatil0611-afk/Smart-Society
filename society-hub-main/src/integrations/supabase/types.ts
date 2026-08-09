export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      complaint_comments: {
        Row: {
          comment: string;
          complaint_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          comment: string;
          complaint_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          comment?: string;
          complaint_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "complaint_comments_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      complaints: {
        Row: {
          assigned_staff_id: string | null;
          category: string;
          created_at: string;
          description: string;
          id: string;
          images: string[];
          priority: string;
          resident_id: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          assigned_staff_id?: string | null;
          category?: string;
          created_at?: string;
          description: string;
          id?: string;
          images?: string[];
          priority?: string;
          resident_id: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          assigned_staff_id?: string | null;
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          images?: string[];
          priority?: string;
          resident_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_rsvps: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          banner_url: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          event_date: string;
          id: string;
          location: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          banner_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          event_date: string;
          id?: string;
          location?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          banner_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          event_date?: string;
          id?: string;
          location?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      facilities: {
        Row: {
          active: boolean;
          capacity: number | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          active?: boolean;
          capacity?: number | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          active?: boolean;
          capacity?: number | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      facility_bookings: {
        Row: {
          created_at: string;
          end_time: string;
          facility_id: string;
          id: string;
          notes: string | null;
          resident_id: string;
          start_time: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          end_time: string;
          facility_id: string;
          id?: string;
          notes?: string | null;
          resident_id: string;
          start_time: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          end_time?: string;
          facility_id?: string;
          id?: string;
          notes?: string | null;
          resident_id?: string;
          start_time?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "facility_bookings_facility_id_fkey";
            columns: ["facility_id"];
            isOneToOne: false;
            referencedRelation: "facilities";
            referencedColumns: ["id"];
          },
        ];
      };
      family_members: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          phone: string | null;
          relation: string | null;
          resident_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          phone?: string | null;
          relation?: string | null;
          resident_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          phone?: string | null;
          relation?: string | null;
          resident_id?: string;
        };
        Relationships: [];
      };
      maintenance_bills: {
        Row: {
          amount: number;
          created_at: string;
          due_date: string | null;
          flat_number: string | null;
          id: string;
          month: number;
          notes: string | null;
          paid_at: string | null;
          payment_method: string | null;
          receipt_no: string | null;
          receipt_url: string | null;
          resident_id: string | null;
          status: string;
          updated_at: string;
          wing: string | null;
          year: number;
        };
        Insert: {
          amount: number;
          created_at?: string;
          due_date?: string | null;
          flat_number?: string | null;
          id?: string;
          month: number;
          notes?: string | null;
          paid_at?: string | null;
          payment_method?: string | null;
          receipt_no?: string | null;
          receipt_url?: string | null;
          resident_id?: string | null;
          status?: string;
          updated_at?: string;
          wing?: string | null;
          year: number;
        };
        Update: {
          amount?: number;
          created_at?: string;
          due_date?: string | null;
          flat_number?: string | null;
          id?: string;
          month?: number;
          notes?: string | null;
          paid_at?: string | null;
          payment_method?: string | null;
          receipt_no?: string | null;
          receipt_url?: string | null;
          resident_id?: string | null;
          status?: string;
          updated_at?: string;
          wing?: string | null;
          year?: number;
        };
        Relationships: [];
      };
      notices: {
        Row: {
          attachment_url: string | null;
          category: string;
          content: string;
          created_at: string;
          created_by: string | null;
          expiry_date: string | null;
          id: string;
          pinned: boolean;
          title: string;
          updated_at: string;
        };
        Insert: {
          attachment_url?: string | null;
          category?: string;
          content: string;
          created_at?: string;
          created_by?: string | null;
          expiry_date?: string | null;
          id?: string;
          pinned?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: {
          attachment_url?: string | null;
          category?: string;
          content?: string;
          created_at?: string;
          created_by?: string | null;
          expiry_date?: string | null;
          id?: string;
          pinned?: boolean;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          link: string | null;
          message: string | null;
          read: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          link?: string | null;
          message?: string | null;
          read?: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          link?: string | null;
          message?: string | null;
          read?: boolean;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      parking_slots: {
        Row: {
          created_at: string;
          flat_number: string | null;
          id: string;
          notes: string | null;
          owner_id: string | null;
          owner_name: string | null;
          slot_number: string;
          status: string;
          updated_at: string;
          vehicle_number: string | null;
          vehicle_type: string;
          wing: string | null;
        };
        Insert: {
          created_at?: string;
          flat_number?: string | null;
          id?: string;
          notes?: string | null;
          owner_id?: string | null;
          owner_name?: string | null;
          slot_number: string;
          status?: string;
          updated_at?: string;
          vehicle_number?: string | null;
          vehicle_type?: string;
          wing?: string | null;
        };
        Update: {
          created_at?: string;
          flat_number?: string | null;
          id?: string;
          notes?: string | null;
          owner_id?: string | null;
          owner_name?: string | null;
          slot_number?: string;
          status?: string;
          updated_at?: string;
          vehicle_number?: string | null;
          vehicle_type?: string;
          wing?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          emergency_contact: string | null;
          family_members: string | null;
          flat_number: string | null;
          full_name: string | null;
          id: string;
          occupation: string | null;
          phone: string | null;
          updated_at: string;
          vehicle_number: string | null;
          wing: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          emergency_contact?: string | null;
          family_members?: string | null;
          flat_number?: string | null;
          full_name?: string | null;
          id: string;
          occupation?: string | null;
          phone?: string | null;
          updated_at?: string;
          vehicle_number?: string | null;
          wing?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          emergency_contact?: string | null;
          family_members?: string | null;
          flat_number?: string | null;
          full_name?: string | null;
          id?: string;
          occupation?: string | null;
          phone?: string | null;
          updated_at?: string;
          vehicle_number?: string | null;
          wing?: string | null;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          active: boolean;
          address: string | null;
          created_at: string;
          id: string;
          name: string;
          phone: string | null;
          photo_url: string | null;
          role: string;
          salary: number | null;
          shift: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          address?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          phone?: string | null;
          photo_url?: string | null;
          role: string;
          salary?: number | null;
          shift?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          address?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          phone?: string | null;
          photo_url?: string | null;
          role?: string;
          salary?: number | null;
          shift?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      visitors: {
        Row: {
          created_at: string;
          created_by: string | null;
          entry_time: string | null;
          exit_time: string | null;
          expected_time: string | null;
          flat_number: string | null;
          host_resident_id: string | null;
          id: string;
          photo_url: string | null;
          purpose: string | null;
          status: string;
          updated_at: string;
          vehicle_number: string | null;
          visitor_name: string;
          visitor_phone: string | null;
          visitor_type: string;
          wing: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          entry_time?: string | null;
          exit_time?: string | null;
          expected_time?: string | null;
          flat_number?: string | null;
          host_resident_id?: string | null;
          id?: string;
          photo_url?: string | null;
          purpose?: string | null;
          status?: string;
          updated_at?: string;
          vehicle_number?: string | null;
          visitor_name: string;
          visitor_phone?: string | null;
          visitor_type?: string;
          wing?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          entry_time?: string | null;
          exit_time?: string | null;
          expected_time?: string | null;
          flat_number?: string | null;
          host_resident_id?: string | null;
          id?: string;
          photo_url?: string | null;
          purpose?: string | null;
          status?: string;
          updated_at?: string;
          vehicle_number?: string | null;
          visitor_name?: string;
          visitor_phone?: string | null;
          visitor_type?: string;
          wing?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "resident" | "security" | "super_admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "resident", "security", "super_admin"],
    },
  },
} as const;

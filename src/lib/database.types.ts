/**
 * Database types for the Supabase schema in
 * supabase/migrations/0001_initial_schema.sql
 *
 * Hand-authored in the same shape `supabase gen types typescript` emits. Once
 * the Supabase CLI is set up you can regenerate this with:
 *   supabase gen types typescript --project-id <id> --schema public > src/lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'member' | 'doctor' | 'admin' | 'pharmacy';
export type IntakeStatus =
  | 'submitted'
  | 'in_review'
  | 'needs_info'
  | 'approved'
  | 'declined';
export type PrescriptionStatus = 'pending' | 'signed' | 'declined';
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'compounding'
  | 'shipped'
  | 'delivered'
  | 'canceled'
  | 'refunded';
export type SubscriptionStatus =
  | 'active'
  | 'paused'
  | 'pending_review'
  | 'canceled';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type FulfillmentStatus =
  | 'draft'
  | 'submitted'
  | 'accepted'
  | 'shipped'
  | 'delivered'
  | 'canceled';
export type AccountStatus = 'active' | 'suspended' | 'deactivated';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          date_of_birth: string | null;
          stripe_customer_id: string | null;
          npi: string | null;
          account_status: AccountStatus;
          two_factor_enabled: boolean;
          notification_prefs: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          stripe_customer_id?: string | null;
          npi?: string | null;
          account_status?: AccountStatus;
          two_factor_enabled?: boolean;
          notification_prefs?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          stripe_customer_id?: string | null;
          npi?: string | null;
          account_status?: AccountStatus;
          two_factor_enabled?: boolean;
          notification_prefs?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          full_name: string;
          line1: string;
          line2: string | null;
          city: string;
          state: string;
          zip: string;
          phone: string | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          full_name: string;
          line1: string;
          line2?: string | null;
          city: string;
          state: string;
          zip: string;
          phone?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          full_name?: string;
          line1?: string;
          line2?: string | null;
          city?: string;
          state?: string;
          zip?: string;
          phone?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      payment_methods: {
        Row: {
          id: string;
          user_id: string;
          stripe_payment_method_id: string | null;
          brand: string;
          last4: string;
          exp_month: string;
          exp_year: string;
          name_on_card: string | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_payment_method_id?: string | null;
          brand: string;
          last4: string;
          exp_month: string;
          exp_year: string;
          name_on_card?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_payment_method_id?: string | null;
          brand?: string;
          last4?: string;
          exp_month?: string;
          exp_year?: string;
          name_on_card?: string | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      intake_submissions: {
        Row: {
          id: string;
          case_id: string;
          user_id: string | null;
          email: string;
          answers: Json;
          status: IntakeStatus;
          assigned_doctor_id: string | null;
          review_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          user_id?: string | null;
          email: string;
          answers: Json;
          status?: IntakeStatus;
          assigned_doctor_id?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          user_id?: string | null;
          email?: string;
          answers?: Json;
          status?: IntakeStatus;
          assigned_doctor_id?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prescriptions: {
        Row: {
          id: string;
          user_id: string;
          intake_id: string | null;
          doctor_id: string | null;
          protocol_name: string;
          items: Json;
          status: PrescriptionStatus;
          notes: string | null;
          signed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          intake_id?: string | null;
          doctor_id?: string | null;
          protocol_name: string;
          items?: Json;
          status?: PrescriptionStatus;
          notes?: string | null;
          signed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          intake_id?: string | null;
          doctor_id?: string | null;
          protocol_name?: string;
          items?: Json;
          status?: PrescriptionStatus;
          notes?: string | null;
          signed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string;
          status: OrderStatus;
          subtotal_cents: number;
          shipping_cents: number;
          total_cents: number;
          stripe_payment_intent_id: string | null;
          shipping_address: Json | null;
          tracking_carrier: string | null;
          tracking_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          user_id: string;
          status?: OrderStatus;
          subtotal_cents?: number;
          shipping_cents?: number;
          total_cents?: number;
          stripe_payment_intent_id?: string | null;
          shipping_address?: Json | null;
          tracking_carrier?: string | null;
          tracking_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string;
          status?: OrderStatus;
          subtotal_cents?: number;
          shipping_cents?: number;
          total_cents?: number;
          stripe_payment_intent_id?: string | null;
          shipping_address?: Json | null;
          tracking_carrier?: string | null;
          tracking_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price_cents: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity?: number;
          unit_price_cents?: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          quantity?: number;
          unit_price_cents?: number;
        };
        Relationships: [];
      };
      order_updates: {
        Row: {
          id: string;
          order_id: string;
          label: string;
          body: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          label: string;
          body?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          label?: string;
          body?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          product_name: string;
          stripe_subscription_id: string | null;
          status: SubscriptionStatus;
          cadence_label: string | null;
          per_cycle_cents: number;
          next_billing_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          product_name: string;
          stripe_subscription_id?: string | null;
          status?: SubscriptionStatus;
          cadence_label?: string | null;
          per_cycle_cents?: number;
          next_billing_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          product_name?: string;
          stripe_subscription_id?: string | null;
          status?: SubscriptionStatus;
          cadence_label?: string | null;
          per_cycle_cents?: number;
          next_billing_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      id_verifications: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          status: VerificationStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          storage_path: string;
          status?: VerificationStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          storage_path?: string;
          status?: VerificationStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          thread_user_id: string;
          sender_id: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_user_id: string;
          sender_id: string;
          body: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_user_id?: string;
          sender_id?: string;
          body?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      fulfillment_orders: {
        Row: {
          id: string;
          order_ref: string;
          user_id: string | null;
          prescription_id: string | null;
          pharmacy_id: string | null;
          status: FulfillmentStatus;
          patient_name: string;
          patient_dob: string | null;
          shipping_address: Json | null;
          prescriber_name: string | null;
          prescriber_npi: string | null;
          items: Json;
          cycle_label: string | null;
          tracking_carrier: string | null;
          tracking_number: string | null;
          notes: string | null;
          submitted_at: string | null;
          shipped_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_ref: string;
          user_id?: string | null;
          prescription_id?: string | null;
          pharmacy_id?: string | null;
          status?: FulfillmentStatus;
          patient_name: string;
          patient_dob?: string | null;
          shipping_address?: Json | null;
          prescriber_name?: string | null;
          prescriber_npi?: string | null;
          items?: Json;
          cycle_label?: string | null;
          tracking_carrier?: string | null;
          tracking_number?: string | null;
          notes?: string | null;
          submitted_at?: string | null;
          shipped_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_ref?: string;
          user_id?: string | null;
          prescription_id?: string | null;
          pharmacy_id?: string | null;
          status?: FulfillmentStatus;
          patient_name?: string;
          patient_dob?: string | null;
          shipping_address?: Json | null;
          prescriber_name?: string | null;
          prescriber_npi?: string | null;
          items?: Json;
          cycle_label?: string | null;
          tracking_carrier?: string | null;
          tracking_number?: string | null;
          notes?: string | null;
          submitted_at?: string | null;
          shipped_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_clinical: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_pharmacy: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      intake_status: IntakeStatus;
      prescription_status: PrescriptionStatus;
      order_status: OrderStatus;
      subscription_status: SubscriptionStatus;
      verification_status: VerificationStatus;
      fulfillment_status: FulfillmentStatus;
      account_status: AccountStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor'
export type CrosslistingStatus = 'pending' | 'active' | 'sold' | 'failed' | 'delisted'

export interface Database {
  public: {
    Tables: {
      listings: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          price: number
          condition: ListingCondition
          category: string | null
          brand: string | null
          size: string | null
          color: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          price: number
          condition: ListingCondition
          category?: string | null
          brand?: string | null
          size?: string | null
          color?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          price?: number
          condition?: ListingCondition
          category?: string | null
          brand?: string | null
          size?: string | null
          color?: string | null
          tags?: string[] | null
          updated_at?: string
        }
      }
      listing_images: {
        Row: {
          id: string
          listing_id: string
          storage_path: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          storage_path: string
          display_order?: number
          created_at?: string
        }
        Update: {
          display_order?: number
        }
      }
      platforms: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
        }
        Update: {
          name?: string
          logo_url?: string | null
        }
      }
      platform_accounts: {
        Row: {
          id: string
          user_id: string
          platform_id: string
          username: string | null
          connected_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform_id: string
          username?: string | null
          connected_at?: string
        }
        Update: {
          username?: string | null
        }
      }
      crosslistings: {
        Row: {
          id: string
          listing_id: string
          platform_id: string
          platform_listing_id: string | null
          platform_listing_url: string | null
          status: CrosslistingStatus
          listed_at: string | null
          sold_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          platform_id: string
          platform_listing_id?: string | null
          platform_listing_url?: string | null
          status?: CrosslistingStatus
          listed_at?: string | null
          sold_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          platform_listing_id?: string | null
          platform_listing_url?: string | null
          status?: CrosslistingStatus
          listed_at?: string | null
          sold_at?: string | null
          updated_at?: string
        }
      }
    }
  }
}

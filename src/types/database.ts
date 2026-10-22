
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "admins_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"areas": {
                  Row: {
                    "description": string,"id": string,"name": string,"school_id": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string,"id"?: string,"name": string,"school_id": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "description"?: string,"id"?: string,"name"?: string,"school_id"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "areas_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversation_members": {
                  Row: {
                    "conversation_id": string,"joined_at": string,"last_emailed_at": string | null,"last_read_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id": string,"joined_at"?: string,"last_emailed_at"?: string | null,"last_read_at"?: string,"user_id": string
                  }
                  Update: {
                    "conversation_id"?: string,"joined_at"?: string,"last_emailed_at"?: string | null,"last_read_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversation_members_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversation_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "created_at": string,"group_id": string | null,"id": string,"kind": string,"last_message_at": string | null,"last_message_preview": string | null,"last_message_sender_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"group_id"?: string | null,"id"?: string,"kind": string,"last_message_at"?: string | null,"last_message_preview"?: string | null,"last_message_sender_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"group_id"?: string | null,"id"?: string,"kind"?: string,"last_message_at"?: string | null,"last_message_preview"?: string | null,"last_message_sender_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_group_id_fkey"
      columns: ["group_id"]
isOneToOne: true
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_last_message_sender_id_fkey"
      columns: ["last_message_sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "group_id": string,"joined_at": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"joined_at"?: string,"role"?: string,"user_id": string
                  }
                  Update: {
                    "group_id"?: string,"joined_at"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"group_requests": {
                  Row: {
                    "created_at": string,"created_by": string,"group_id": string,"id": string,"kind": string,"message": string | null,"responded_at": string | null,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"group_id": string,"id"?: string,"kind": string,"message"?: string | null,"responded_at"?: string | null,"status"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"group_id"?: string,"id"?: string,"kind"?: string,"message"?: string | null,"responded_at"?: string | null,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_requests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_requests_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"owner_id": string,"school_id": string,"status": string,"target_size": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"owner_id": string,"school_id": string,"status"?: string,"target_size"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"owner_id"?: string,"school_id"?: string,"status"?: string,"target_size"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "groups_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"intros": {
                  Row: {
                    "conversation_id": string | null,"created_at": string,"id": string,"message": string,"recipient_id": string,"responded_at": string | null,"sender_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id"?: string | null,"created_at"?: string,"id"?: string,"message": string,"recipient_id": string,"responded_at"?: string | null,"sender_id": string,"status"?: string
                  }
                  Update: {
                    "conversation_id"?: string | null,"created_at"?: string,"id"?: string,"message"?: string,"recipient_id"?: string,"responded_at"?: string | null,"sender_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "intros_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "intros_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "intros_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"match_scores": {
                  Row: {
                    "breakdown": NonNullable<Json>,"candidate_id": string,"computed_at": string,"notified_at": string | null,"reasons": NonNullable<Json>,"score": number,"shared_artists": NonNullable<Json>,"viewer_id": string,"watchouts": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "breakdown"?: NonNullable<Json>,"candidate_id": string,"computed_at"?: string,"notified_at"?: string | null,"reasons"?: NonNullable<Json>,"score": number,"shared_artists"?: NonNullable<Json>,"viewer_id": string,"watchouts"?: NonNullable<Json>
                  }
                  Update: {
                    "breakdown"?: NonNullable<Json>,"candidate_id"?: string,"computed_at"?: string,"notified_at"?: string | null,"reasons"?: NonNullable<Json>,"score"?: number,"shared_artists"?: NonNullable<Json>,"viewer_id"?: string,"watchouts"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_scores_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_scores_viewer_id_fkey"
      columns: ["viewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"client_id": string | null,"conversation_id": string,"created_at": string,"id": string,"kind": string,"sender_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"client_id"?: string | null,"conversation_id": string,"created_at"?: string,"id"?: string,"kind"?: string,"sender_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"client_id"?: string | null,"conversation_id"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"sender_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"moderation_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": string,"meta": NonNullable<Json>,"report_id": string | null,"target_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"meta"?: NonNullable<Json>,"report_id"?: string | null,"target_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"meta"?: NonNullable<Json>,"report_id"?: string | null,"target_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "moderation_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "moderation_log_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "moderation_log_target_id_fkey"
      columns: ["target_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"music_profiles": {
                  Row: {
                    "synced_at": string,"top_artists": NonNullable<Json>,"top_genres": (string)[],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "synced_at"?: string,"top_artists"?: NonNullable<Json>,"top_genres"?: (string)[],"user_id": string
                  }
                  Update: {
                    "synced_at"?: string,"top_artists"?: NonNullable<Json>,"top_genres"?: (string)[],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "music_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"body": string,"created_at": string,"emailed_at": string | null,"entity_id": string | null,"href": string | null,"id": string,"read_at": string | null,"title": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"body"?: string,"created_at"?: string,"emailed_at"?: string | null,"entity_id"?: string | null,"href"?: string | null,"id"?: string,"read_at"?: string | null,"title": string,"type": string,"user_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"body"?: string,"created_at"?: string,"emailed_at"?: string | null,"entity_id"?: string | null,"href"?: string | null,"id"?: string,"read_at"?: string | null,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"photos": {
                  Row: {
                    "created_at": string,"height": number | null,"id": string,"placeholder": string | null,"position": number,"storage_path": string,"user_id": string,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"height"?: number | null,"id"?: string,"placeholder"?: string | null,"position": number,"storage_path": string,"user_id": string,"width"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"height"?: number | null,"id"?: string,"placeholder"?: string | null,"position"?: number,"storage_path"?: string,"user_id"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "photos_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"preferences": {
                  Row: {
                    "areas": (string)[],"budget_max": number,"budget_min": number,"cleanliness": number,"dealbreakers": (string)[],"drinking": string,"gender_pref": (string)[],"guests": number,"housing_type": string,"lease_length": string,"move_in_date": string | null,"noise": number,"pets": string,"sleep_schedule": number,"smoking": string,"study": string,"updated_at": string,"user_id": string,"weights": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "areas"?: (string)[],"budget_max"?: number,"budget_min"?: number,"cleanliness"?: number,"dealbreakers"?: (string)[],"drinking"?: string,"gender_pref"?: (string)[],"guests"?: number,"housing_type"?: string,"lease_length"?: string,"move_in_date"?: string | null,"noise"?: number,"pets"?: string,"sleep_schedule"?: number,"smoking"?: string,"study"?: string,"updated_at"?: string,"user_id": string,"weights"?: NonNullable<Json>
                  }
                  Update: {
                    "areas"?: (string)[],"budget_max"?: number,"budget_min"?: number,"cleanliness"?: number,"dealbreakers"?: (string)[],"drinking"?: string,"gender_pref"?: (string)[],"guests"?: number,"housing_type"?: string,"lease_length"?: string,"move_in_date"?: string | null,"noise"?: number,"pets"?: string,"sleep_schedule"?: number,"smoking"?: string,"study"?: string,"updated_at"?: string,"user_id"?: string,"weights"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "preferences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"ban_reason": string | null,"banned_at": string | null,"bio": string,"class_year": string | null,"created_at": string,"first_name": string,"gender": string | null,"id": string,"is_hidden": boolean,"is_seed": boolean,"last_active_at": string,"last_initial": string,"major": string | null,"onboarding_completed_at": string | null,"onboarding_step": number,"pronouns": string | null,"school_id": string,"student_verified_at": string | null,"updated_at": string,"verified_only": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"ban_reason"?: string | null,"banned_at"?: string | null,"bio"?: string,"class_year"?: string | null,"created_at"?: string,"first_name"?: string,"gender"?: string | null,"id": string,"is_hidden"?: boolean,"is_seed"?: boolean,"last_active_at"?: string,"last_initial"?: string,"major"?: string | null,"onboarding_completed_at"?: string | null,"onboarding_step"?: number,"pronouns"?: string | null,"school_id": string,"student_verified_at"?: string | null,"updated_at"?: string,"verified_only"?: boolean
                  }
                  Update: {
                    "avatar_path"?: string | null,"ban_reason"?: string | null,"banned_at"?: string | null,"bio"?: string,"class_year"?: string | null,"created_at"?: string,"first_name"?: string,"gender"?: string | null,"id"?: string,"is_hidden"?: boolean,"is_seed"?: boolean,"last_active_at"?: string,"last_initial"?: string,"major"?: string | null,"onboarding_completed_at"?: string | null,"onboarding_step"?: number,"pronouns"?: string | null,"school_id"?: string,"student_verified_at"?: string | null,"updated_at"?: string,"verified_only"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reports": {
                  Row: {
                    "context": NonNullable<Json>,"created_at": string,"details": string | null,"id": string,"reason": string,"reported_id": string,"reporter_id": string | null,"resolution_note": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"source": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "context"?: NonNullable<Json>,"created_at"?: string,"details"?: string | null,"id"?: string,"reason": string,"reported_id": string,"reporter_id"?: string | null,"resolution_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source"?: string,"status"?: string
                  }
                  Update: {
                    "context"?: NonNullable<Json>,"created_at"?: string,"details"?: string | null,"id"?: string,"reason"?: string,"reported_id"?: string,"reporter_id"?: string | null,"resolution_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reported_id_fkey"
      columns: ["reported_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"saves": {
                  Row: {
                    "created_at": string,"target_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"target_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"target_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saves_target_id_fkey"
      columns: ["target_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saves_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"schools": {
                  Row: {
                    "active": boolean,"created_at": string,"email_domains": (string)[],"id": string,"name": string,"short_name": string,"timezone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"email_domains": (string)[],"id": string,"name": string,"short_name": string,"timezone"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"email_domains"?: (string)[],"id"?: string,"name"?: string,"short_name"?: string,"timezone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"spotify_accounts": {
                  Row: {
                    "access_token_enc": string,"connected_at": string,"display_name": string | null,"expires_at": string,"last_synced_at": string | null,"refresh_token_enc": string,"scopes": string,"spotify_user_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_token_enc": string,"connected_at"?: string,"display_name"?: string | null,"expires_at": string,"last_synced_at"?: string | null,"refresh_token_enc": string,"scopes"?: string,"spotify_user_id": string,"user_id": string
                  }
                  Update: {
                    "access_token_enc"?: string,"connected_at"?: string,"display_name"?: string | null,"expires_at"?: string,"last_synced_at"?: string | null,"refresh_token_enc"?: string,"scopes"?: string,"spotify_user_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "spotify_accounts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_settings": {
                  Row: {
                    "created_at": string,"email": string,"last_digest_at": string | null,"last_name": string,"notify_email_groups": boolean,"notify_email_intros": boolean,"notify_email_matches": boolean,"notify_email_messages": boolean,"notify_inapp_groups": boolean,"notify_inapp_intros": boolean,"notify_inapp_matches": boolean,"notify_inapp_messages": boolean,"theme": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"last_digest_at"?: string | null,"last_name"?: string,"notify_email_groups"?: boolean,"notify_email_intros"?: boolean,"notify_email_matches"?: boolean,"notify_email_messages"?: boolean,"notify_inapp_groups"?: boolean,"notify_inapp_intros"?: boolean,"notify_inapp_matches"?: boolean,"notify_inapp_messages"?: boolean,"theme"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"last_digest_at"?: string | null,"last_name"?: string,"notify_email_groups"?: boolean,"notify_email_intros"?: boolean,"notify_email_matches"?: boolean,"notify_email_messages"?: boolean,"notify_inapp_groups"?: boolean,"notify_inapp_intros"?: boolean,"notify_inapp_matches"?: boolean,"notify_inapp_messages"?: boolean,"theme"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_settings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_intro":
{ Args: { "p_intro_id": string }; Returns: string
                           },
"can_contact":
{ Args: { "recipient": string,"sender": string }; Returns: boolean
                           },
"can_view_profile":
{ Args: { "target": string,"viewer": string }; Returns: boolean
                           },
"cancel_group_request":
{ Args: { "p_request_id": string }; Returns: undefined
                           },
"complete_onboarding":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"create_group":
{ Args: { "p_name": string,"p_target_size": number }; Returns: string
                           },
"decline_intro":
{ Args: { "p_intro_id": string }; Returns: undefined
                           },
"first_name_of":
{ Args: { "uid": string }; Returns: string
                           },
"get_match_feed":
{ Args: { "p_areas"?: (string)[],"p_budget_max"?: number,"p_budget_min"?: number,"p_genders"?: (string)[],"p_limit"?: number,"p_move_in_from"?: string,"p_move_in_to"?: string,"p_offset"?: number,"p_saved_only"?: boolean,"p_search"?: string,"p_sort"?: string,"p_years"?: (string)[] }; Returns: {
              "areas": (string)[],"avatar_path": string,"avatar_placeholder": string,"bio": string,"budget_max": number,"budget_min": number,"candidate_id": string,"class_year": string,"first_name": string,"housing_type": string,"intro_status": string,"is_saved": boolean,"joined_at": string,"last_initial": string,"lease_length": string,"major": string,"move_in_date": string,"photo_count": number,"pronouns": string,"reasons": Json,"score": number,"shared_artists": Json,"total_count": number,"verified": boolean,"watchouts": Json
            }[]
                           },
"get_public_preferences":
{ Args: { "p_user": string }; Returns: {
              "areas": (string)[],"budget_max": number,"budget_min": number,"cleanliness": number,"drinking": string,"guests": number,"housing_type": string,"lease_length": string,"move_in_date": string,"noise": number,"pets": string,"sleep_schedule": number,"smoking": string,"study": string
            }[]
                           },
"group_candidates":
{ Args: { "p_group_id": string,"p_limit"?: number,"p_offset"?: number }; Returns: {
              "avatar_path": string,"avatar_placeholder": string,"budget_max": number,"budget_min": number,"candidate_id": string,"class_year": string,"first_name": string,"group_score": number,"last_initial": string,"major": string,"member_scores": Json,"min_score": number,"move_in_date": string,"pending_kind": string
            }[]
                           },
"groups_for_me":
{ Args: { "p_limit"?: number }; Returns: {
              "group_id": string,"group_score": number,"member_count": number,"members": Json,"min_score": number,"name": string,"pending": boolean,"target_size": number
            }[]
                           },
"invite_to_group":
{ Args: { "p_group_id": string,"p_message"?: string,"p_user": string }; Returns: string
                           },
"is_admin":
{ Args: { "uid"?: string }; Returns: boolean
                           },
"is_blocked":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"is_conversation_member":
{ Args: { "cid": string,"uid"?: string }; Returns: boolean
                           },
"is_group_member":
{ Args: { "gid": string,"uid"?: string }; Returns: boolean
                           },
"is_student_verified":
{ Args: { "uid": string }; Returns: boolean
                           },
"leave_group":
{ Args: { "p_group_id": string }; Returns: undefined
                           },
"mark_conversation_read":
{ Args: { "p_conversation_id": string }; Returns: undefined
                           },
"rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"reorder_photos":
{ Args: { "p_ids": (string)[] }; Returns: undefined
                           },
"request_to_join_group":
{ Args: { "p_group_id": string,"p_message"?: string }; Returns: string
                           },
"respond_group_request":
{ Args: { "p_accept": boolean,"p_request_id": string }; Returns: string
                           },
"school_for_email":
{ Args: { "p_email": string }; Returns: string
                           },
"send_intro":
{ Args: { "p_message": string,"p_recipient": string }; Returns: string
                           },
"shares_conversation":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"unread_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "conversation_id": string,"unread": number
            }[]
                           },
"withdraw_intro":
{ Args: { "p_intro_id": string }; Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const

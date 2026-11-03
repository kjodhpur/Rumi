
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
                },"agreement_events": {
                  Row: {
                    "actor_id": string | null,"after": string | null,"agreement_id": string,"before": string | null,"created_at": string,"id": string,"kind": string,"section_key": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"after"?: string | null,"agreement_id": string,"before"?: string | null,"created_at"?: string,"id"?: string,"kind": string,"section_key"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"after"?: string | null,"agreement_id"?: string,"before"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"section_key"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_events_agreement_id_fkey"
      columns: ["agreement_id"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    }
                  ]
                },"agreement_sections": {
                  Row: {
                    "accepted_by": (string)[],"agreement_id": string,"content": string,"key": string,"position": number,"proposed_by": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_by"?: (string)[],"agreement_id": string,"content": string,"key": string,"position": number,"proposed_by"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "accepted_by"?: (string)[],"agreement_id"?: string,"content"?: string,"key"?: string,"position"?: number,"proposed_by"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_sections_agreement_id_fkey"
      columns: ["agreement_id"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_sections_proposed_by_fkey"
      columns: ["proposed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"agreement_signatures": {
                  Row: {
                    "agreement_id": string,"signed_at": string,"typed_name": string,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "agreement_id": string,"signed_at"?: string,"typed_name": string,"user_id": string,"version": number
                  }
                  Update: {
                    "agreement_id"?: string,"signed_at"?: string,"typed_name"?: string,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_signatures_agreement_id_fkey"
      columns: ["agreement_id"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_signatures_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"agreements": {
                  Row: {
                    "created_at": string,"group_id": string,"id": string,"member_ids": (string)[],"signed_at": string | null,"status": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"group_id": string,"id"?: string,"member_ids": (string)[],"signed_at"?: string | null,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"group_id"?: string,"id"?: string,"member_ids"?: (string)[],"signed_at"?: string | null,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreements_group_id_fkey"
      columns: ["group_id"]
isOneToOne: true
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"assignments": {
                  Row: {
                    "building": string,"closed_at": string | null,"created_at": string,"id": string,"moved_in_at": string,"room": string | null,"school_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "building": string,"closed_at"?: string | null,"created_at"?: string,"id"?: string,"moved_in_at": string,"room"?: string | null,"school_id": string,"user_id": string
                  }
                  Update: {
                    "building"?: string,"closed_at"?: string | null,"created_at"?: string,"id"?: string,"moved_in_at"?: string,"room"?: string | null,"school_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"checkins": {
                  Row: {
                    "ask_ra": boolean,"assignment_id": string,"created_at": string,"crisis": boolean,"due_on": string,"id": string,"note": string | null,"score": number | null,"share_with_ra": boolean,"submitted_at": string | null,"tags": (string)[],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ask_ra"?: boolean,"assignment_id": string,"created_at"?: string,"crisis"?: boolean,"due_on": string,"id"?: string,"note"?: string | null,"score"?: number | null,"share_with_ra"?: boolean,"submitted_at"?: string | null,"tags"?: (string)[],"user_id": string
                  }
                  Update: {
                    "ask_ra"?: boolean,"assignment_id"?: string,"created_at"?: string,"crisis"?: boolean,"due_on"?: string,"id"?: string,"note"?: string | null,"score"?: number | null,"share_with_ra"?: boolean,"submitted_at"?: string | null,"tags"?: (string)[],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checkins_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checkins_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"risk_events": {
                  Row: {
                    "assignment_id": string,"created_at": string,"id": string,"level": string,"reasons": (string)[],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignment_id": string,"created_at"?: string,"id"?: string,"level": string,"reasons"?: (string)[],"user_id": string
                  }
                  Update: {
                    "assignment_id"?: string,"created_at"?: string,"id"?: string,"level"?: string,"reasons"?: (string)[],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "risk_events_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "risk_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
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
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"entity": string,"entity_id": string | null,"id": string,"ip": string | null,"meta": NonNullable<Json>,"school_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"entity": string,"entity_id"?: string | null,"id"?: string,"ip"?: string | null,"meta"?: NonNullable<Json>,"school_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"entity"?: string,"entity_id"?: string | null,"id"?: string,"ip"?: string | null,"meta"?: NonNullable<Json>,"school_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_log_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"auto_pair_proposals": {
                  Row: {
                    "created_at": string,"decided_at": string | null,"decided_by": string | null,"group_id": string | null,"id": string,"member_ids": (string)[],"reasons": NonNullable<Json>,"responses": NonNullable<Json>,"run_id": string,"school_id": string,"score": number,"sent_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"group_id"?: string | null,"id"?: string,"member_ids": (string)[],"reasons"?: NonNullable<Json>,"responses"?: NonNullable<Json>,"run_id": string,"school_id": string,"score": number,"sent_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"group_id"?: string | null,"id"?: string,"member_ids"?: (string)[],"reasons"?: NonNullable<Json>,"responses"?: NonNullable<Json>,"run_id"?: string,"school_id"?: string,"score"?: number,"sent_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "auto_pair_proposals_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auto_pair_proposals_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auto_pair_proposals_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "auto_pair_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auto_pair_proposals_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"auto_pair_runs": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"params": NonNullable<Json>,"school_id": string,"stats": NonNullable<Json>,"superseded_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"params"?: NonNullable<Json>,"school_id": string,"stats"?: NonNullable<Json>,"superseded_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"params"?: NonNullable<Json>,"school_id"?: string,"stats"?: NonNullable<Json>,"superseded_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "auto_pair_runs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "auto_pair_runs_school_id_fkey"
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
                },"campaign_sends": {
                  Row: {
                    "campaign_id": string,"sent_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "campaign_id": string,"sent_at"?: string,"user_id": string
                  }
                  Update: {
                    "campaign_id"?: string,"sent_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaign_sends_campaign_id_fkey"
      columns: ["campaign_id"]
isOneToOne: false
      referencedRelation: "campaigns"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaign_sends_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"campaigns": {
                  Row: {
                    "audience_count": number,"created_at": string,"created_by": string | null,"id": string,"kind": string,"school_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audience_count"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: string,"school_id": string
                  }
                  Update: {
                    "audience_count"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: string,"school_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaigns_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaigns_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"consents": {
                  Row: {
                    "granted_at": string,"id": string,"kind": string,"revoked_at": string | null,"school_id": string,"user_id": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "granted_at"?: string,"id"?: string,"kind": string,"revoked_at"?: string | null,"school_id": string,"user_id": string,"version": string
                  }
                  Update: {
                    "granted_at"?: string,"id"?: string,"kind"?: string,"revoked_at"?: string | null,"school_id"?: string,"user_id"?: string,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"escalation_routes": {
                  Row: {
                    "active": boolean,
                    "category": string,
                    "created_at": string,
                    "destination_label": string,
                    "email": string | null,
                    "id": string,
                    "phone": string | null,
                    "school_id": string,
                    "updated_at": string,
                    "url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,
                    "category": string,
                    "created_at"?: string,
                    "destination_label": string,
                    "email"?: string | null,
                    "id"?: string,
                    "phone"?: string | null,
                    "school_id": string,
                    "updated_at"?: string,
                    "url"?: string | null
                  }
                  Update: {
                    "active"?: boolean,
                    "category"?: string,
                    "created_at"?: string,
                    "destination_label"?: string,
                    "email"?: string | null,
                    "id"?: string,
                    "phone"?: string | null,
                    "school_id"?: string,
                    "updated_at"?: string,
                    "url"?: string | null
                  }
                  Relationships: [
                    {
                      foreignKeyName: "escalation_routes_school_id_fkey"
                      columns: ["school_id"]
                      isOneToOne: false
                      referencedRelation: "schools"
                      referencedColumns: ["id"]
                    }
                  ]
                },"escalations": {
                  Row: {
                    "category": string,
                    "created_at": string,
                    "destination_label": string,
                    "forwarded_at": string | null,
                    "forwarded_by": string | null,
                    "id": string,
                    "notes": string | null,
                    "report_id": string,
                    "route_id": string | null,
                    "school_id": string,
                    "status": string,
                    "student_consented": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,
                    "created_at"?: string,
                    "destination_label"?: string,
                    "forwarded_at"?: string | null,
                    "forwarded_by"?: string | null,
                    "id"?: string,
                    "notes"?: string | null,
                    "report_id": string,
                    "route_id"?: string | null,
                    "school_id": string,
                    "status"?: string,
                    "student_consented"?: boolean
                  }
                  Update: {
                    "category"?: string,
                    "created_at"?: string,
                    "destination_label"?: string,
                    "forwarded_at"?: string | null,
                    "forwarded_by"?: string | null,
                    "id"?: string,
                    "notes"?: string | null,
                    "report_id"?: string,
                    "route_id"?: string | null,
                    "school_id"?: string,
                    "status"?: string,
                    "student_consented"?: boolean
                  }
                  Relationships: [
                    {
                      foreignKeyName: "escalations_report_id_fkey"
                      columns: ["report_id"]
                      isOneToOne: false
                      referencedRelation: "reports"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "escalations_route_id_fkey"
                      columns: ["route_id"]
                      isOneToOne: false
                      referencedRelation: "escalation_routes"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "escalations_school_id_fkey"
                      columns: ["school_id"]
                      isOneToOne: false
                      referencedRelation: "schools"
                      referencedColumns: ["id"]
                    }
                  ]
                },"family_shares": {
                  Row: {
                    "id": string,"user_id": string,"token": string,"token_hash": string,"scope": Json,"expires_at": string,"revoked_at": string | null,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"user_id": string,"token": string,"token_hash": string,"scope"?: Json,"expires_at": string,"revoked_at"?: string | null,"created_at"?: string
                  }
                  Update: {
                    "id"?: string,"user_id"?: string,"token"?: string,"token_hash"?: string,"scope"?: Json,"expires_at"?: string,"revoked_at"?: string | null,"created_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "family_shares_user_id_fkey"
                      columns: ["user_id"]
                      isOneToOne: false
                      referencedRelation: "profiles"
                      referencedColumns: ["id"]
                    }
                  ]
                },"connections": {
                  Row: {
                    "confirmed_at": string | null,
                    "created_at": string,
                    "id": string,
                    "source": string,
                    "status": string,
                    "user_a": string,
                    "user_b": string
                  }
                  ComputedFields: never
                  Insert: {
                    "confirmed_at"?: string | null,
                    "created_at"?: string,
                    "id"?: string,
                    "source"?: string,
                    "status"?: string,
                    "user_a": string,
                    "user_b": string
                  }
                  Update: {
                    "confirmed_at"?: string | null,
                    "created_at"?: string,
                    "id"?: string,
                    "source"?: string,
                    "status"?: string,
                    "user_a"?: string,
                    "user_b"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "connections_user_a_fkey"
                      columns: ["user_a"]
                      isOneToOne: false
                      referencedRelation: "profiles"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "connections_user_b_fkey"
                      columns: ["user_b"]
                      isOneToOne: false
                      referencedRelation: "profiles"
                      referencedColumns: ["id"]
                    }
                  ]
                },"social_links": {
                  Row: {
                    "created_at": string,
                    "handle": string,
                    "id": string,
                    "platform": string,
                    "updated_at": string,
                    "user_id": string,
                    "verification_code": string | null,
                    "verified_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,
                    "handle": string,
                    "id"?: string,
                    "platform": string,
                    "updated_at"?: string,
                    "user_id": string,
                    "verification_code"?: string | null,
                    "verified_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,
                    "handle"?: string,
                    "id"?: string,
                    "platform"?: string,
                    "updated_at"?: string,
                    "user_id"?: string,
                    "verification_code"?: string | null,
                    "verified_at"?: string | null
                  }
                  Relationships: [
                    {
                      foreignKeyName: "social_links_user_id_fkey"
                      columns: ["user_id"]
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
                },"integration_mappings": {
                  Row: {
                    "direction": string,"mapping": NonNullable<Json>,"provider": string,"school_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "direction": string,"mapping": NonNullable<Json>,"provider": string,"school_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "direction"?: string,"mapping"?: NonNullable<Json>,"provider"?: string,"school_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "integration_mappings_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "integration_mappings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
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
                },"match_share_tokens": {
                  Row: {
                    "id": string,"user_a": string,"user_b": string,"token": string,"token_hash": string,"user_a_consented": boolean,"user_b_consented": boolean,"expires_at": string,"revoked_at": string | null,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"user_a": string,"user_b": string,"token": string,"token_hash": string,"user_a_consented"?: boolean,"user_b_consented"?: boolean,"expires_at": string,"revoked_at"?: string | null,"created_at"?: string
                  }
                  Update: {
                    "id"?: string,"user_a"?: string,"user_b"?: string,"token"?: string,"token_hash"?: string,"user_a_consented"?: boolean,"user_b_consented"?: boolean,"expires_at"?: string,"revoked_at"?: string | null,"created_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "match_share_tokens_user_a_fkey"
                      columns: ["user_a"]
                      isOneToOne: false
                      referencedRelation: "profiles"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "match_share_tokens_user_b_fkey"
                      columns: ["user_b"]
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
                },"pairings": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"created_at": string,"exported_at": string | null,"group_id": string | null,"id": string,"member_ids": (string)[],"school_id": string,"staff_notes": string | null,"status": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"exported_at"?: string | null,"group_id"?: string | null,"id"?: string,"member_ids"?: (string)[],"school_id": string,"staff_notes"?: string | null,"status"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"exported_at"?: string | null,"group_id"?: string | null,"id"?: string,"member_ids"?: (string)[],"school_id"?: string,"staff_notes"?: string | null,"status"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pairings_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pairings_group_id_fkey"
      columns: ["group_id"]
isOneToOne: true
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pairings_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pairings_updated_by_fkey"
      columns: ["updated_by"]
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
                },"preference_flags": {
                  Row: {
                    "created_at": string,
                    "dismissed_at": string | null,
                    "id": string,
                    "rule_key": string,
                    "user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,
                    "dismissed_at"?: string | null,
                    "id"?: string,
                    "rule_key": string,
                    "user_id": string
                  }
                  Update: {
                    "created_at"?: string,
                    "dismissed_at"?: string | null,
                    "id"?: string,
                    "rule_key"?: string,
                    "user_id"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "preference_flags_user_id_fkey"
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
                    "avatar_path": string | null,"ban_reason": string | null,"banned_at": string | null,"bio": string,"class_year": string | null,"created_at": string,"first_name": string,"gender": string | null,"id": string,"inactivity_warned_at": string | null,"is_hidden": boolean,"is_seed": boolean,"is_staff": boolean,"last_active_at": string,"last_initial": string,"major": string | null,"onboarding_completed_at": string | null,"onboarding_step": number,"pre_arrival": boolean,"pronouns": string | null,"school_id": string,"student_verified_at": string | null,"track": "freshman" | "returning" | "transfer" | "grad" | null,"updated_at": string,"verified_only": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"ban_reason"?: string | null,"banned_at"?: string | null,"bio"?: string,"class_year"?: string | null,"created_at"?: string,"first_name"?: string,"gender"?: string | null,"id": string,"inactivity_warned_at"?: string | null,"is_hidden"?: boolean,"is_seed"?: boolean,"is_staff"?: boolean,"last_active_at"?: string,"last_initial"?: string,"major"?: string | null,"onboarding_completed_at"?: string | null,"onboarding_step"?: number,"pre_arrival"?: boolean,"pronouns"?: string | null,"school_id": string,"student_verified_at"?: string | null,"track"?: "freshman" | "returning" | "transfer" | "grad" | null,"updated_at"?: string,"verified_only"?: boolean
                  }
                  Update: {
                    "avatar_path"?: string | null,"ban_reason"?: string | null,"banned_at"?: string | null,"bio"?: string,"class_year"?: string | null,"created_at"?: string,"first_name"?: string,"gender"?: string | null,"id"?: string,"inactivity_warned_at"?: string | null,"is_hidden"?: boolean,"is_seed"?: boolean,"is_staff"?: boolean,"last_active_at"?: string,"last_initial"?: string,"major"?: string | null,"onboarding_completed_at"?: string | null,"onboarding_step"?: number,"pre_arrival"?: boolean,"pronouns"?: string | null,"school_id"?: string,"student_verified_at"?: string | null,"track"?: "freshman" | "returning" | "transfer" | "grad" | null,"updated_at"?: string,"verified_only"?: boolean
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
                },"profile_media": {
                  Row: {
                    "id": string,"user_id": string,"kind": "video" | "audio","path": string,"duration_s": number,"transcript": string,"status": "active" | "flagged" | "removed","created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"user_id": string,"kind": "video" | "audio","path": string,"duration_s": number,"transcript": string,"status"?: "active" | "flagged" | "removed","created_at"?: string
                  }
                  Update: {
                    "id"?: string,"user_id"?: string,"kind"?: "video" | "audio","path"?: string,"duration_s"?: number,"transcript"?: string,"status"?: "active" | "flagged" | "removed","created_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "profile_media_user_id_fkey"
                      columns: ["user_id"]
                      isOneToOne: true
                      referencedRelation: "profiles"
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
                },"retention_policies": {
                  Row: {
                    "days": number,"entity": string,"school_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "days": number,"entity": string,"school_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "days"?: number,"entity"?: string,"school_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "retention_policies_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "retention_policies_updated_by_fkey"
      columns: ["updated_by"]
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
                },"chores": {
                  Row: {
                    "id": string,"group_id": string,"title": string,"cadence": "daily" | "weekly" | "biweekly" | "monthly","rotation": (string)[],"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"group_id": string,"title": string,"cadence": "daily" | "weekly" | "biweekly" | "monthly","rotation"?: (string)[],"created_at"?: string
                  }
                  Update: {
                    "id"?: string,"group_id"?: string,"title"?: string,"cadence"?: "daily" | "weekly" | "biweekly" | "monthly","rotation"?: (string)[],"created_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "chores_group_id_fkey"
                      columns: ["group_id"]
                      isOneToOne: false
                      referencedRelation: "groups"
                      referencedColumns: ["id"]
                    }
                  ]
                },"chore_instances": {
                  Row: {
                    "id": string,"chore_id": string,"group_id": string,"assignee_id": string,"due_on": string,"completed_at": string | null,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"chore_id": string,"group_id": string,"assignee_id": string,"due_on": string,"completed_at"?: string | null,"created_at"?: string
                  }
                  Update: {
                    "id"?: string,"chore_id"?: string,"group_id"?: string,"assignee_id"?: string,"due_on"?: string,"completed_at"?: string | null,"created_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "chore_instances_chore_id_fkey"
                      columns: ["chore_id"]
                      isOneToOne: false
                      referencedRelation: "chores"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "chore_instances_group_id_fkey"
                      columns: ["group_id"]
                      isOneToOne: false
                      referencedRelation: "groups"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "chore_instances_assignee_id_fkey"
                      columns: ["assignee_id"]
                      isOneToOne: false
                      referencedRelation: "profiles"
                      referencedColumns: ["id"]
                    }
                  ]
                },"expenses": {
                  Row: {
                    "id": string,"group_id": string,"payer_id": string,"amount_cents": number,"currency": string,"description": string,"receipt_path": string | null,"deleted_at": string | null,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"group_id": string,"payer_id": string,"amount_cents": number,"currency"?: string,"description": string,"receipt_path"?: string | null,"deleted_at"?: string | null,"created_at"?: string
                  }
                  Update: {
                    "id"?: string,"group_id"?: string,"payer_id"?: string,"amount_cents"?: number,"currency"?: string,"description"?: string,"receipt_path"?: string | null,"deleted_at"?: string | null,"created_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "expenses_group_id_fkey"
                      columns: ["group_id"]
                      isOneToOne: false
                      referencedRelation: "groups"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "expenses_payer_id_fkey"
                      columns: ["payer_id"]
                      isOneToOne: false
                      referencedRelation: "profiles"
                      referencedColumns: ["id"]
                    }
                  ]
                },"expense_splits": {
                  Row: {
                    "id": string,"expense_id": string,"user_id": string,"share_cents": number,"settled_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"expense_id": string,"user_id": string,"share_cents": number,"settled_at"?: string | null
                  }
                  Update: {
                    "id"?: string,"expense_id"?: string,"user_id"?: string,"share_cents"?: number,"settled_at"?: string | null
                  }
                  Relationships: [
                    {
                      foreignKeyName: "expense_splits_expense_id_fkey"
                      columns: ["expense_id"]
                      isOneToOne: false
                      referencedRelation: "expenses"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "expense_splits_user_id_fkey"
                      columns: ["user_id"]
                      isOneToOne: false
                      referencedRelation: "profiles"
                      referencedColumns: ["id"]
                    }
                  ]
                },"room_events": {
                  Row: {
                    "id": string,"group_id": string,"created_by": string,"kind": "guest" | "quiet" | "away" | "shared","title": string,"starts_at": string,"ends_at": string,"overnight": boolean,"guest_count": number,"notes": string | null,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"group_id": string,"created_by": string,"kind": "guest" | "quiet" | "away" | "shared","title": string,"starts_at": string,"ends_at": string,"overnight"?: boolean,"guest_count"?: number,"notes"?: string | null,"created_at"?: string
                  }
                  Update: {
                    "id"?: string,"group_id"?: string,"created_by"?: string,"kind"?: "guest" | "quiet" | "away" | "shared","title"?: string,"starts_at"?: string,"ends_at"?: string,"overnight"?: boolean,"guest_count"?: number,"notes"?: string | null,"created_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "room_events_group_id_fkey"
                      columns: ["group_id"]
                      isOneToOne: false
                      referencedRelation: "groups"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "room_events_created_by_fkey"
                      columns: ["created_by"]
                      isOneToOne: false
                      referencedRelation: "profiles"
                      referencedColumns: ["id"]
                    }
                  ]
                },"room_calendar_tokens": {
                  Row: {
                    "id": string,"group_id": string,"user_id": string,"token": string,"token_hash": string,"rotated_at": string | null,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"group_id": string,"user_id": string,"token": string,"token_hash": string,"rotated_at"?: string | null,"created_at"?: string
                  }
                  Update: {
                    "id"?: string,"group_id"?: string,"user_id"?: string,"token"?: string,"token_hash"?: string,"rotated_at"?: string | null,"created_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "room_calendar_tokens_group_id_fkey"
                      columns: ["group_id"]
                      isOneToOne: false
                      referencedRelation: "groups"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "room_calendar_tokens_user_id_fkey"
                      columns: ["user_id"]
                      isOneToOne: false
                      referencedRelation: "profiles"
                      referencedColumns: ["id"]
                    }
                  ]
                },"settlements": {
                  Row: {
                    "id": string,"group_id": string,"payer_id": string,"receiver_id": string,"amount_cents": number,"note": string | null,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"group_id": string,"payer_id": string,"receiver_id": string,"amount_cents": number,"note"?: string | null,"created_at"?: string
                  }
                  Update: {
                    "id"?: string,"group_id"?: string,"payer_id"?: string,"receiver_id"?: string,"amount_cents"?: number,"note"?: string | null,"created_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "settlements_group_id_fkey"
                      columns: ["group_id"]
                      isOneToOne: false
                      referencedRelation: "groups"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "settlements_payer_id_fkey"
                      columns: ["payer_id"]
                      isOneToOne: false
                      referencedRelation: "profiles"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "settlements_receiver_id_fkey"
                      columns: ["receiver_id"]
                      isOneToOne: false
                      referencedRelation: "profiles"
                      referencedColumns: ["id"]
                    }
                  ]
                },"schools": {
                  Row: {
                    "active": boolean,"created_at": string,"email_domains": (string)[],"hide_seed_profiles": boolean,"housing_office_name": string | null,"id": string,"is_demo": boolean,"name": string,"pre_arrival_enabled": boolean,"short_name": string,"timezone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"email_domains": (string)[],"hide_seed_profiles"?: boolean,"housing_office_name"?: string | null,"id": string,"is_demo"?: boolean,"name": string,"pre_arrival_enabled"?: boolean,"short_name": string,"timezone"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"email_domains"?: (string)[],"hide_seed_profiles"?: boolean,"housing_office_name"?: string | null,"id"?: string,"is_demo"?: boolean,"name"?: string,"pre_arrival_enabled"?: boolean,"short_name"?: string,"timezone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"admit_allowlist": {
                  Row: {
                    "id": string,"school_id": string,"email_hash": string,"term_id": string | null,"used_at": string | null,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"school_id": string,"email_hash": string,"term_id"?: string | null,"used_at"?: string | null,"created_at"?: string
                  }
                  Update: {
                    "id"?: string,"school_id"?: string,"email_hash"?: string,"term_id"?: string | null,"used_at"?: string | null,"created_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "admit_allowlist_school_id_fkey"
                      columns: ["school_id"]
                      isOneToOne: false
                      referencedRelation: "schools"
                      referencedColumns: ["id"]
                    }
                  ]
                },"tracks": {
                  Row: {
                    "id": string,"school_id": string,"key": "freshman" | "returning" | "transfer" | "grad","label": string,"question_set_id": string | null,"timeline": Json | null,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"school_id": string,"key": "freshman" | "returning" | "transfer" | "grad","label": string,"question_set_id"?: string | null,"timeline"?: Json | null,"created_at"?: string
                  }
                  Update: {
                    "id"?: string,"school_id"?: string,"key"?: "freshman" | "returning" | "transfer" | "grad","label"?: string,"question_set_id"?: string | null,"timeline"?: Json | null,"created_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "tracks_school_id_fkey"
                      columns: ["school_id"]
                      isOneToOne: false
                      referencedRelation: "schools"
                      referencedColumns: ["id"]
                    }
                  ]
                },"school_questions": {
                  Row: {
                    "id": string,"school_id": string | null,"version": number,"kind": "scenario" | "general","factor": string,"stem": string,"choices": Json,"factor_map": Json,"is_active": boolean,"position": number,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"school_id"?: string | null,"version"?: number,"kind": "scenario" | "general","factor": string,"stem": string,"choices": Json,"factor_map": Json,"is_active"?: boolean,"position"?: number,"created_at"?: string
                  }
                  Update: {
                    "id"?: string,"school_id"?: string | null,"version"?: number,"kind"?: "scenario" | "general","factor"?: string,"stem"?: string,"choices"?: Json,"factor_map"?: Json,"is_active"?: boolean,"position"?: number,"created_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "school_questions_school_id_fkey"
                      columns: ["school_id"]
                      isOneToOne: false
                      referencedRelation: "schools"
                      referencedColumns: ["id"]
                    }
                  ]
                },"school_question_answers": {
                  Row: {
                    "id": string,"user_id": string,"question_id": string,"choice_key": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"user_id": string,"question_id": string,"choice_key": string,"updated_at"?: string
                  }
                  Update: {
                    "id"?: string,"user_id"?: string,"question_id"?: string,"choice_key"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "school_question_answers_question_id_fkey"
                      columns: ["question_id"]
                      isOneToOne: false
                      referencedRelation: "school_questions"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "school_question_answers_user_id_fkey"
                      columns: ["user_id"]
                      isOneToOne: false
                      referencedRelation: "profiles"
                      referencedColumns: ["id"]
                    }
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
                },"staff_invites": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"created_at": string,"created_by": string | null,"created_by_platform": boolean,"email": string,"expires_at": string,"id": string,"revoked_at": string | null,"role": string,"school_id": string,"scopes": NonNullable<Json>,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"created_by_platform"?: boolean,"email": string,"expires_at": string,"id"?: string,"revoked_at"?: string | null,"role": string,"school_id": string,"scopes"?: NonNullable<Json>,"token_hash": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"created_by_platform"?: boolean,"email"?: string,"expires_at"?: string,"id"?: string,"revoked_at"?: string | null,"role"?: string,"school_id"?: string,"scopes"?: NonNullable<Json>,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_invites_accepted_by_fkey"
      columns: ["accepted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "staff_invites_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "staff_invites_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"staff_members": {
                  Row: {
                    "created_at": string,"disabled_at": string | null,"id": string,"invited_by": string | null,"role": string,"school_id": string,"scopes": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"disabled_at"?: string | null,"id"?: string,"invited_by"?: string | null,"role": string,"school_id": string,"scopes"?: NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"disabled_at"?: string | null,"id"?: string,"invited_by"?: string | null,"role"?: string,"school_id"?: string,"scopes"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_members_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "staff_members_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "staff_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"swap_pool": {
                  Row: {
                    "id": string,"user_id": string,"assignment_id": string,"school_id": string,"reason": string | null,"opted_in_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"user_id": string,"assignment_id": string,"school_id": string,"reason"?: string | null,"opted_in_at"?: string
                  }
                  Update: {
                    "id"?: string,"user_id"?: string,"assignment_id"?: string,"school_id"?: string,"reason"?: string | null,"opted_in_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "swap_pool_assignment_id_fkey"
                      columns: ["assignment_id"]
                      isOneToOne: false
                      referencedRelation: "assignments"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "swap_pool_school_id_fkey"
                      columns: ["school_id"]
                      isOneToOne: false
                      referencedRelation: "schools"
                      referencedColumns: ["id"]
                    },
                    {
                      foreignKeyName: "swap_pool_user_id_fkey"
                      columns: ["user_id"]
                      isOneToOne: false
                      referencedRelation: "profiles"
                      referencedColumns: ["id"]
                    }
                  ]
                },"swap_proposals": {
                  Row: {
                    "id": string,"school_id": string,"cycle": (string)[],"scores": Json,"status": "staff_pending" | "staff_approved" | "student_accepted" | "declined" | "cancelled" | "completed","staff_notes": string | null,"decided_at": string | null,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"school_id": string,"cycle": (string)[],"scores": Json,"status"?: "staff_pending" | "staff_approved" | "student_accepted" | "declined" | "cancelled" | "completed","staff_notes"?: string | null,"decided_at"?: string | null,"created_at"?: string
                  }
                  Update: {
                    "id"?: string,"school_id"?: string,"cycle"?: (string)[],"scores"?: Json,"status"?: "staff_pending" | "staff_approved" | "student_accepted" | "declined" | "cancelled" | "completed","staff_notes"?: string | null,"decided_at"?: string | null,"created_at"?: string
                  }
                  Relationships: [
                    {
                      foreignKeyName: "swap_proposals_school_id_fkey"
                      columns: ["school_id"]
                      isOneToOne: false
                      referencedRelation: "schools"
                      referencedColumns: ["id"]
                    }
                  ]
                },"terms": {
                  Row: {
                    "active": boolean,"created_at": string,"created_by": string | null,"deadlines": NonNullable<Json>,"ends_on": string,"id": string,"name": string,"school_id": string,"starts_on": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"deadlines"?: NonNullable<Json>,"ends_on": string,"id"?: string,"name": string,"school_id": string,"starts_on": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"deadlines"?: NonNullable<Json>,"ends_on"?: string,"id"?: string,"name"?: string,"school_id"?: string,"starts_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "terms_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "terms_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"user_settings": {
                  Row: {
                    "created_at": string,"email": string,"last_digest_at": string | null,"last_name": string,"notify_email_groups": boolean,"notify_email_intros": boolean,"notify_email_matches": boolean,"notify_email_messages": boolean,"notify_inapp_groups": boolean,"notify_inapp_intros": boolean,"notify_inapp_matches": boolean,"notify_inapp_messages": boolean,"student_id_enc": string | null,"theme": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"last_digest_at"?: string | null,"last_name"?: string,"notify_email_groups"?: boolean,"notify_email_intros"?: boolean,"notify_email_matches"?: boolean,"notify_email_messages"?: boolean,"notify_inapp_groups"?: boolean,"notify_inapp_intros"?: boolean,"notify_inapp_matches"?: boolean,"notify_inapp_messages"?: boolean,"student_id_enc"?: string | null,"theme"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"last_digest_at"?: string | null,"last_name"?: string,"notify_email_groups"?: boolean,"notify_email_intros"?: boolean,"notify_email_matches"?: boolean,"notify_email_messages"?: boolean,"notify_inapp_groups"?: boolean,"notify_inapp_intros"?: boolean,"notify_inapp_matches"?: boolean,"notify_inapp_messages"?: boolean,"student_id_enc"?: string | null,"theme"?: string,"updated_at"?: string,"user_id"?: string
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
            "mutual_connections_details":
{ Args: { "target_id": string }; Returns: {
              "avatar_path": string | null,"first_name": string,"last_initial": string,"user_id": string
            }[]
                           },
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
"group_pair_scores":
{ Args: { "p_group_id": string }; Returns: {
              "a": string,"b": string,"score": number
            }[]
                           },
"groups_for_me":
{ Args: { "p_limit"?: number }; Returns: {
              "group_id": string,"group_score": number,"member_count": number,"members": Json,"min_score": number,"name": string,"pending": boolean,"target_size": number
            }[]
                           },
"has_consent":
{ Args: { "p_kind": string,"p_uid": string }; Returns: boolean
                           },
"has_role":
{ Args: { "p_roles": (string)[],"p_school": string,"p_uid"?: string }; Returns: boolean
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
"mutual_count":
{ Args: { "p_other": string }; Returns: number
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
"prune_match_scores":
{ Args: { "p_keep": (string)[],"p_user": string }; Returns: undefined
                           },
"purge_audit_log":
{ Args: { "p_before": string,"p_school": string }; Returns: number
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
"respond_housing_suggestion":
{ Args: { "p_accept": boolean,"p_id": string }; Returns: string
                           },
"school_for_email":
{ Args: { "p_email": string }; Returns: string
                           },
"school_students":
{ Args: { "p_school": string }; Returns: {
              "avatar_path": string | null,
"ban_reason": string | null,
"banned_at": string | null,
"bio": string,
"class_year": string | null,
"created_at": string,
"first_name": string,
"gender": string | null,
"id": string,
"inactivity_warned_at": string | null,
"is_hidden": boolean,
"is_seed": boolean,
"is_staff": boolean,
"last_active_at": string,
"last_initial": string,
"major": string | null,
"onboarding_completed_at": string | null,
"onboarding_step": number,
"pronouns": string | null,
"school_id": string,
"student_verified_at": string | null,
"updated_at": string,
"verified_only": boolean
            }[]
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: false
        isSetofReturn: true
      } },
"send_intro":
{ Args: { "p_message": string,"p_recipient": string }; Returns: string
                           },
"set_consent":
{ Args: { "p_granted": boolean,"p_kind": string,"p_version": string }; Returns: boolean
                           },
"shares_conversation":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"staff_overview":
{ Args: { "p_school": string,"p_weeks"?: number }; Returns: Json
                           },
"staff_outcomes":
{ Args: { "p_school": string }; Returns: {
              "agreements_signed": number,"checkin_score_sum": number,"checkins_submitted": number,"groups_confirmed": number
            }[]
                           },
"staff_school_reports":
{ Args: { "p_school": string }; Returns: {
              "context": Json,"created_at": string,"details": string | null,"escalation_category": string | null,"escalation_destination": string | null,"escalation_forwarded_at": string | null,"escalation_id": string | null,"escalation_status": string | null,"id": string,"reason": string,"reported_avatar_path": string | null,"reported_banned_at": string | null,"reported_first_name": string,"reported_id": string,"reported_last_initial": string,"reporter_first_name": string | null,"reporter_id": string | null,"reporter_last_initial": string | null,"resolution_note": string | null,"reviewed_at": string | null,"source": string,"status": string
            }[]
                           },
"ra_risk_list":
{ Args: { "p_school": string }; Returns: {
              "ask_ra": boolean,"building": string,"first_name": string,"level": string,"note": string,"reasons": (string)[],"room": string,"score": number,"submitted_at": string,"tags": (string)[],"user_id": string
            }[]
                           },
"staff_pairings":
{ Args: { "p_school": string }; Returns: {
              "agreement_status": string,"approved_at": string,"created_at": string,"group_id": string,"members": Json,"name": string,"pair_scores": Json,"snapshot": (string)[],"staff_notes": string,"status": string,"target_size": number
            }[]
                           },
"staff_scope_includes":
{ Args: { "p_building": string,"p_school": string,"p_uid"?: string }; Returns: boolean
                           },
"staff_unmatched":
{ Args: { "p_school": string }; Returns: {
              "best_score": number,"class_year": string,"first_name": string,"housing_type": string,"id": string,"last_initial": string,"last_nudged_at": string,"move_in_date": string,"onboarded_at": string,"strong_matches": number
            }[]
                           },
"stale_match_users":
{ Args: { "p_limit"?: number }; Returns: {
              "user_id": string
            }[]
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

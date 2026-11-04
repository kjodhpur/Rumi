
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "accommodation_constraints": {
                  Row: {
                    "constraint_key": string,"created_at": string,"expires_on": string | null,"id": string,"legal_hold": boolean,"note_enc": string | null,"school_id": string,"set_by": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "constraint_key": string,"created_at"?: string,"expires_on"?: string | null,"id"?: string,"legal_hold"?: boolean,"note_enc"?: string | null,"school_id": string,"set_by"?: string | null,"user_id": string
                  }
                  Update: {
                    "constraint_key"?: string,"created_at"?: string,"expires_on"?: string | null,"id"?: string,"legal_hold"?: boolean,"note_enc"?: string | null,"school_id"?: string,"set_by"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "accommodation_constraints_school_id_constraint_key_fkey"
      columns: ["school_id","constraint_key"]
isOneToOne: false
      referencedRelation: "accommodation_types"
      referencedColumns: ["school_id","key"]
    },{
      foreignKeyName: "accommodation_constraints_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "accommodation_constraints_set_by_fkey"
      columns: ["set_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "accommodation_constraints_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"accommodation_types": {
                  Row: {
                    "active": boolean,"key": string,"label": string,"school_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"key": string,"label": string,"school_id": string
                  }
                  Update: {
                    "active"?: boolean,"key"?: string,"label"?: string,"school_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "accommodation_types_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"admins": {
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
                },"admit_allowlist": {
                  Row: {
                    "created_at": string,"created_by": string | null,"email_hash": string,"id": string,"school_id": string,"term_id": string | null,"used_at": string | null,"used_by": string | null,"withdrawn_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"email_hash": string,"id"?: string,"school_id": string,"term_id"?: string | null,"used_at"?: string | null,"used_by"?: string | null,"withdrawn_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"email_hash"?: string,"id"?: string,"school_id"?: string,"term_id"?: string | null,"used_at"?: string | null,"used_by"?: string | null,"withdrawn_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "admit_allowlist_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "admit_allowlist_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "admit_allowlist_term_id_fkey"
      columns: ["term_id"]
isOneToOne: false
      referencedRelation: "terms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "admit_allowlist_used_by_fkey"
      columns: ["used_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"agreement_comments": {
                  Row: {
                    "agreement_id": string,"author_id": string | null,"body": string,"created_at": string,"id": string,"section_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agreement_id": string,"author_id"?: string | null,"body": string,"created_at"?: string,"id"?: string,"section_key": string
                  }
                  Update: {
                    "agreement_id"?: string,"author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"section_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_comments_agreement_id_fkey"
      columns: ["agreement_id"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
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
                },"agreement_templates": {
                  Row: {
                    "created_at": string,"school_id": string,"sections": NonNullable<Json>,"updated_by": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"school_id": string,"sections": NonNullable<Json>,"updated_by"?: string | null,"version": number
                  }
                  Update: {
                    "created_at"?: string,"school_id"?: string,"sections"?: NonNullable<Json>,"updated_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_templates_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_templates_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"agreements": {
                  Row: {
                    "created_at": string,"group_id": string,"id": string,"member_ids": (string)[],"signed_at": string | null,"status": string,"template_version": number | null,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"group_id": string,"id"?: string,"member_ids": (string)[],"signed_at"?: string | null,"status"?: string,"template_version"?: number | null,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "created_at"?: string,"group_id"?: string,"id"?: string,"member_ids"?: (string)[],"signed_at"?: string | null,"status"?: string,"template_version"?: number | null,"updated_at"?: string,"version"?: number
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
                },"assignments": {
                  Row: {
                    "bed": string | null,"building": string,"closed_at": string | null,"created_at": string,"external_ref": string | null,"id": string,"import_job_id": string | null,"moved_in_at": string,"room": string | null,"school_id": string,"source": string,"term_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bed"?: string | null,"building": string,"closed_at"?: string | null,"created_at"?: string,"external_ref"?: string | null,"id"?: string,"import_job_id"?: string | null,"moved_in_at": string,"room"?: string | null,"school_id": string,"source"?: string,"term_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "bed"?: string | null,"building"?: string,"closed_at"?: string | null,"created_at"?: string,"external_ref"?: string | null,"id"?: string,"import_job_id"?: string | null,"moved_in_at"?: string,"room"?: string | null,"school_id"?: string,"source"?: string,"term_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_import_job_id_fkey"
      columns: ["import_job_id"]
isOneToOne: false
      referencedRelation: "import_jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_term_id_fkey"
      columns: ["term_id"]
isOneToOne: false
      referencedRelation: "terms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
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
                },"calendar_accounts": {
                  Row: {
                    "access_token_enc": string,"created_at": string,"expires_at": string | null,"last_error": string | null,"last_sync_at": string | null,"provider": string,"refresh_token_enc": string | null,"scope": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_token_enc": string,"created_at"?: string,"expires_at"?: string | null,"last_error"?: string | null,"last_sync_at"?: string | null,"provider": string,"refresh_token_enc"?: string | null,"scope"?: string | null,"user_id": string
                  }
                  Update: {
                    "access_token_enc"?: string,"created_at"?: string,"expires_at"?: string | null,"last_error"?: string | null,"last_sync_at"?: string | null,"provider"?: string,"refresh_token_enc"?: string | null,"scope"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "calendar_accounts_user_id_fkey"
      columns: ["user_id"]
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
                },"checkin_schedules": {
                  Row: {
                    "monthly_after": boolean,"offsets_days": (number)[],"school_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "monthly_after"?: boolean,"offsets_days"?: (number)[],"school_id": string,"updated_at"?: string
                  }
                  Update: {
                    "monthly_after"?: boolean,"offsets_days"?: (number)[],"school_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checkin_schedules_school_id_fkey"
      columns: ["school_id"]
isOneToOne: true
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"checkins": {
                  Row: {
                    "ask_ra": boolean,"assignment_id": string,"created_at": string,"crisis": boolean,"due_on": string,"id": string,"note_enc": string | null,"score": number | null,"share_with_ra": boolean,"submitted_at": string | null,"tags": (string)[],"term_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ask_ra"?: boolean,"assignment_id": string,"created_at"?: string,"crisis"?: boolean,"due_on": string,"id"?: string,"note_enc"?: string | null,"score"?: number | null,"share_with_ra"?: boolean,"submitted_at"?: string | null,"tags"?: (string)[],"term_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "ask_ra"?: boolean,"assignment_id"?: string,"created_at"?: string,"crisis"?: boolean,"due_on"?: string,"id"?: string,"note_enc"?: string | null,"score"?: number | null,"share_with_ra"?: boolean,"submitted_at"?: string | null,"tags"?: (string)[],"term_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "checkins_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checkins_term_id_fkey"
      columns: ["term_id"]
isOneToOne: false
      referencedRelation: "terms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "checkins_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"chore_instances": {
                  Row: {
                    "assignee_id": string,"chore_id": string,"completed_at": string | null,"completed_by": string | null,"created_at": string,"due_on": string,"group_id": string,"id": string,"reminded_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id": string,"chore_id": string,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"due_on": string,"group_id": string,"id"?: string,"reminded_at"?: string | null
                  }
                  Update: {
                    "assignee_id"?: string,"chore_id"?: string,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"due_on"?: string,"group_id"?: string,"id"?: string,"reminded_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "chore_instances_assignee_id_fkey"
      columns: ["assignee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chore_instances_chore_id_fkey"
      columns: ["chore_id"]
isOneToOne: false
      referencedRelation: "chores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chore_instances_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chore_instances_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"chores": {
                  Row: {
                    "cadence": string,"created_at": string,"created_by": string | null,"from_agreement": boolean,"group_id": string,"id": string,"rotation": (string)[],"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cadence": string,"created_at"?: string,"created_by"?: string | null,"from_agreement"?: boolean,"group_id": string,"id"?: string,"rotation"?: (string)[],"title": string
                  }
                  Update: {
                    "cadence"?: string,"created_at"?: string,"created_by"?: string | null,"from_agreement"?: boolean,"group_id"?: string,"id"?: string,"rotation"?: (string)[],"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "chores_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chores_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"class_schedules": {
                  Row: {
                    "blocks": NonNullable<Json>,"ics_url_enc": string | null,"last_error": string | null,"last_sync_at": string | null,"source": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocks"?: NonNullable<Json>,"ics_url_enc"?: string | null,"last_error"?: string | null,"last_sync_at"?: string | null,"source": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "blocks"?: NonNullable<Json>,"ics_url_enc"?: string | null,"last_error"?: string | null,"last_sync_at"?: string | null,"source"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "class_schedules_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"connections": {
                  Row: {
                    "confirmed_at": string | null,"created_at": string,"id": string,"source": string,"status": string,"user_a": string,"user_b": string
                  }
                  ComputedFields: never
                  Insert: {
                    "confirmed_at"?: string | null,"created_at"?: string,"id"?: string,"source"?: string,"status"?: string,"user_a": string,"user_b": string
                  }
                  Update: {
                    "confirmed_at"?: string | null,"created_at"?: string,"id"?: string,"source"?: string,"status"?: string,"user_a"?: string,"user_b"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "connections_user_a_fkey"
      columns: ["user_a"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connections_user_b_fkey"
      columns: ["user_b"]
isOneToOne: false
      referencedRelation: "profiles"
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
                },"escalation_routes": {
                  Row: {
                    "active": boolean,"category": string,"created_at": string,"destination_label": string,"email": string | null,"id": string,"phone": string | null,"school_id": string,"updated_at": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"category": string,"created_at"?: string,"destination_label": string,"email"?: string | null,"id"?: string,"phone"?: string | null,"school_id": string,"updated_at"?: string,"url"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"category"?: string,"created_at"?: string,"destination_label"?: string,"email"?: string | null,"id"?: string,"phone"?: string | null,"school_id"?: string,"updated_at"?: string,"url"?: string | null
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
                    "category": string,"created_at": string,"destination_label": string,"forwarded_at": string | null,"forwarded_by": string | null,"id": string,"notes": string | null,"report_id": string | null,"route_id": string | null,"school_id": string,"status": string,"student_consented": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"created_at"?: string,"destination_label"?: string,"forwarded_at"?: string | null,"forwarded_by"?: string | null,"id"?: string,"notes"?: string | null,"report_id"?: string | null,"route_id"?: string | null,"school_id": string,"status"?: string,"student_consented"?: boolean
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"destination_label"?: string,"forwarded_at"?: string | null,"forwarded_by"?: string | null,"id"?: string,"notes"?: string | null,"report_id"?: string | null,"route_id"?: string | null,"school_id"?: string,"status"?: string,"student_consented"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "escalations_forwarded_by_fkey"
      columns: ["forwarded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "escalations_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "escalations_route_id_fkey"
      columns: ["route_id"]
isOneToOne: false
      referencedRelation: "escalation_routes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "escalations_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"expense_splits": {
                  Row: {
                    "expense_id": string,"share_cents": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "expense_id": string,"share_cents": number,"user_id": string
                  }
                  Update: {
                    "expense_id"?: string,"share_cents"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "expense_splits_expense_id_fkey"
      columns: ["expense_id"]
isOneToOne: false
      referencedRelation: "expenses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expense_splits_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"expenses": {
                  Row: {
                    "amount_cents": number,"created_at": string,"currency": string,"deleted_at": string | null,"deleted_by": string | null,"description": string,"group_id": string,"id": string,"payer_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"currency"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"description": string,"group_id": string,"id"?: string,"payer_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"currency"?: string,"deleted_at"?: string | null,"deleted_by"?: string | null,"description"?: string,"group_id"?: string,"id"?: string,"payer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "expenses_deleted_by_fkey"
      columns: ["deleted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_payer_id_fkey"
      columns: ["payer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"family_shares": {
                  Row: {
                    "created_at": string,"expires_at": string,"id": string,"revoked_at": string | null,"scope": NonNullable<Json>,"token_hash": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"id"?: string,"revoked_at"?: string | null,"scope"?: NonNullable<Json>,"token_hash": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"revoked_at"?: string | null,"scope"?: NonNullable<Json>,"token_hash"?: string,"user_id"?: string
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
                },"group_carry_forwards": {
                  Row: {
                    "answered_at": string,"group_id": string,"keep": boolean,"term_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answered_at"?: string,"group_id": string,"keep": boolean,"term_id": string,"user_id": string
                  }
                  Update: {
                    "answered_at"?: string,"group_id"?: string,"keep"?: boolean,"term_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_carry_forwards_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_carry_forwards_term_id_fkey"
      columns: ["term_id"]
isOneToOne: false
      referencedRelation: "terms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_carry_forwards_user_id_fkey"
      columns: ["user_id"]
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
                },"import_jobs": {
                  Row: {
                    "counts": NonNullable<Json>,"created_at": string,"created_by": string | null,"errors": NonNullable<Json>,"file_name": string | null,"file_path": string | null,"id": string,"kind": string,"provider": string,"school_id": string,"status": string,"undone_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "counts"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"errors"?: NonNullable<Json>,"file_name"?: string | null,"file_path"?: string | null,"id"?: string,"kind": string,"provider"?: string,"school_id": string,"status": string,"undone_at"?: string | null
                  }
                  Update: {
                    "counts"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"errors"?: NonNullable<Json>,"file_name"?: string | null,"file_path"?: string | null,"id"?: string,"kind"?: string,"provider"?: string,"school_id"?: string,"status"?: string,"undone_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_jobs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_jobs_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"imported_answers": {
                  Row: {
                    "confirmed_at": string | null,"created_at": string,"dismissed_at": string | null,"email_hash": string | null,"id": string,"import_job_id": string | null,"mapped_factor": string,"mapped_value": string,"question_code": string,"raw_value": string,"school_id": string,"source": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "confirmed_at"?: string | null,"created_at"?: string,"dismissed_at"?: string | null,"email_hash"?: string | null,"id"?: string,"import_job_id"?: string | null,"mapped_factor": string,"mapped_value": string,"question_code": string,"raw_value": string,"school_id": string,"source"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "confirmed_at"?: string | null,"created_at"?: string,"dismissed_at"?: string | null,"email_hash"?: string | null,"id"?: string,"import_job_id"?: string | null,"mapped_factor"?: string,"mapped_value"?: string,"question_code"?: string,"raw_value"?: string,"school_id"?: string,"source"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "imported_answers_import_job_id_fkey"
      columns: ["import_job_id"]
isOneToOne: false
      referencedRelation: "import_jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "imported_answers_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "imported_answers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"integration_credentials": {
                  Row: {
                    "base_url": string,"created_at": string,"credentials_enc": string,"last_error": string | null,"last_sync_at": string | null,"provider": string,"school_id": string,"sync_enabled": boolean,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "base_url": string,"created_at"?: string,"credentials_enc": string,"last_error"?: string | null,"last_sync_at"?: string | null,"provider": string,"school_id": string,"sync_enabled"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "base_url"?: string,"created_at"?: string,"credentials_enc"?: string,"last_error"?: string | null,"last_sync_at"?: string | null,"provider"?: string,"school_id"?: string,"sync_enabled"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "integration_credentials_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "integration_credentials_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
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
                },"integration_runs": {
                  Row: {
                    "action": string,"calls": number,"created_at": string,"created_by": string | null,"errors": NonNullable<Json>,"finished_at": string | null,"id": string,"provider": string,"records_processed": number,"school_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"calls"?: number,"created_at"?: string,"created_by"?: string | null,"errors"?: NonNullable<Json>,"finished_at"?: string | null,"id"?: string,"provider": string,"records_processed"?: number,"school_id": string,"status": string
                  }
                  Update: {
                    "action"?: string,"calls"?: number,"created_at"?: string,"created_by"?: string | null,"errors"?: NonNullable<Json>,"finished_at"?: string | null,"id"?: string,"provider"?: string,"records_processed"?: number,"school_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "integration_runs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "integration_runs_school_id_fkey"
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
                },"link_attributions": {
                  Row: {
                    "created_at": string,"id": string,"school_id": string,"source": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"school_id": string,"source": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"school_id"?: string,"source"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "link_attributions_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "link_attributions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
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
                    "created_at": string,"expires_at": string,"id": string,"revoked_at": string | null,"token_hash": string,"user_a": string,"user_a_consented": boolean,"user_b": string,"user_b_consented": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"id"?: string,"revoked_at"?: string | null,"token_hash": string,"user_a": string,"user_a_consented"?: boolean,"user_b": string,"user_b_consented"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"revoked_at"?: string | null,"token_hash"?: string,"user_a"?: string,"user_a_consented"?: boolean,"user_b"?: string,"user_b_consented"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_share_tokens_user_a_fkey"
      columns: ["user_a"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
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
                    "action": string,"actor_id": string | null,"classifier": string | null,"confidence": number | null,"created_at": string,"id": string,"meta": NonNullable<Json>,"report_id": string | null,"target_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"classifier"?: string | null,"confidence"?: number | null,"created_at"?: string,"id"?: string,"meta"?: NonNullable<Json>,"report_id"?: string | null,"target_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"classifier"?: string | null,"confidence"?: number | null,"created_at"?: string,"id"?: string,"meta"?: NonNullable<Json>,"report_id"?: string | null,"target_id"?: string | null
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
                },"notification_preferences": {
                  Row: {
                    "email": boolean,"in_app": boolean,"kind": string,"push": boolean,"sms": boolean,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "email"?: boolean,"in_app"?: boolean,"kind": string,"push"?: boolean,"sms"?: boolean,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "email"?: boolean,"in_app"?: boolean,"kind"?: string,"push"?: boolean,"sms"?: boolean,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_preferences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
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
                },"nudge_rules": {
                  Row: {
                    "channels": (string)[],"deadline_key": string,"id": string,"offsets": (number)[],"paused": boolean,"school_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "channels"?: (string)[],"deadline_key": string,"id"?: string,"offsets"?: (number)[],"paused"?: boolean,"school_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "channels"?: (string)[],"deadline_key"?: string,"id"?: string,"offsets"?: (number)[],"paused"?: boolean,"school_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "nudge_rules_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nudge_rules_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"nudge_sends": {
                  Row: {
                    "channels": (string)[],"deadline_on": string,"id": string,"offset_days": number,"rule_id": string,"sent_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channels"?: (string)[],"deadline_on": string,"id"?: string,"offset_days": number,"rule_id": string,"sent_at"?: string,"user_id": string
                  }
                  Update: {
                    "channels"?: (string)[],"deadline_on"?: string,"id"?: string,"offset_days"?: number,"rule_id"?: string,"sent_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "nudge_sends_rule_id_fkey"
      columns: ["rule_id"]
isOneToOne: false
      referencedRelation: "nudge_rules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nudge_sends_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"outcome_survey_sends": {
                  Row: {
                    "sent_at": string,"term_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "sent_at"?: string,"term_id": string,"user_id": string
                  }
                  Update: {
                    "sent_at"?: string,"term_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "outcome_survey_sends_term_id_fkey"
      columns: ["term_id"]
isOneToOne: false
      referencedRelation: "terms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "outcome_survey_sends_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"outcome_surveys": {
                  Row: {
                    "biggest_win": string | null,"created_at": string,"friction_tags": (string)[],"group_id": string | null,"id": string,"room_again": string,"school_id": string,"score": number,"term_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "biggest_win"?: string | null,"created_at"?: string,"friction_tags"?: (string)[],"group_id"?: string | null,"id"?: string,"room_again": string,"school_id": string,"score": number,"term_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "biggest_win"?: string | null,"created_at"?: string,"friction_tags"?: (string)[],"group_id"?: string | null,"id"?: string,"room_again"?: string,"school_id"?: string,"score"?: number,"term_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "outcome_surveys_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "outcome_surveys_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "outcome_surveys_term_id_fkey"
      columns: ["term_id"]
isOneToOne: false
      referencedRelation: "terms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "outcome_surveys_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pairings": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"carried_from_term": string | null,"created_at": string,"exported_at": string | null,"group_id": string | null,"id": string,"member_ids": (string)[],"school_id": string,"staff_notes": string | null,"status": string,"term_id": string | null,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"carried_from_term"?: string | null,"created_at"?: string,"exported_at"?: string | null,"group_id"?: string | null,"id"?: string,"member_ids"?: (string)[],"school_id": string,"staff_notes"?: string | null,"status"?: string,"term_id"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"carried_from_term"?: string | null,"created_at"?: string,"exported_at"?: string | null,"group_id"?: string | null,"id"?: string,"member_ids"?: (string)[],"school_id"?: string,"staff_notes"?: string | null,"status"?: string,"term_id"?: string | null,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pairings_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pairings_carried_from_term_fkey"
      columns: ["carried_from_term"]
isOneToOne: false
      referencedRelation: "terms"
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
      foreignKeyName: "pairings_term_id_fkey"
      columns: ["term_id"]
isOneToOne: false
      referencedRelation: "terms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pairings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"phone_verifications": {
                  Row: {
                    "attempts": number,"code_hash": string,"created_at": string,"expires_at": string,"phone_enc": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"code_hash": string,"created_at"?: string,"expires_at": string,"phone_enc": string,"user_id": string
                  }
                  Update: {
                    "attempts"?: number,"code_hash"?: string,"created_at"?: string,"expires_at"?: string,"phone_enc"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "phone_verifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
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
                },"pilot_cohorts": {
                  Row: {
                    "arm": string,"created_at": string,"created_by": string | null,"id": string,"name": string,"rule": NonNullable<Json>,"school_id": string,"term_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "arm": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"rule"?: NonNullable<Json>,"school_id": string,"term_id"?: string | null
                  }
                  Update: {
                    "arm"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"rule"?: NonNullable<Json>,"school_id"?: string,"term_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pilot_cohorts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pilot_cohorts_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pilot_cohorts_term_id_fkey"
      columns: ["term_id"]
isOneToOne: false
      referencedRelation: "terms"
      referencedColumns: ["id"]
    }
                  ]
                },"pilot_configs": {
                  Row: {
                    "created_at": string,"ends_on": string,"school_id": string,"scope": NonNullable<Json>,"starts_on": string,"success_metrics": NonNullable<Json>,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_on": string,"school_id": string,"scope"?: NonNullable<Json>,"starts_on": string,"success_metrics"?: NonNullable<Json>,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"ends_on"?: string,"school_id"?: string,"scope"?: NonNullable<Json>,"starts_on"?: string,"success_metrics"?: NonNullable<Json>,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pilot_configs_school_id_fkey"
      columns: ["school_id"]
isOneToOne: true
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pilot_configs_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"preference_flags": {
                  Row: {
                    "answers_sig": string,"created_at": string,"dismissed_at": string | null,"id": string,"rule_key": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers_sig"?: string,"created_at"?: string,"dismissed_at"?: string | null,"id"?: string,"rule_key": string,"user_id": string
                  }
                  Update: {
                    "answers_sig"?: string,"created_at"?: string,"dismissed_at"?: string | null,"id"?: string,"rule_key"?: string,"user_id"?: string
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
                },"profile_media": {
                  Row: {
                    "created_at": string,"duration_s": number,"kind": string,"mime_type": string,"path": string,"reviewed_at": string | null,"reviewed_by": string | null,"size_bytes": number,"status": string,"transcript": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"duration_s": number,"kind": string,"mime_type": string,"path": string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"size_bytes": number,"status"?: string,"transcript": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"duration_s"?: number,"kind"?: string,"mime_type"?: string,"path"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"size_bytes"?: number,"status"?: string,"transcript"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_media_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_media_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_media_reports": {
                  Row: {
                    "created_at": string,"media_user_id": string,"reason": string,"reporter_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"media_user_id": string,"reason": string,"reporter_id": string
                  }
                  Update: {
                    "created_at"?: string,"media_user_id"?: string,"reason"?: string,"reporter_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_media_reports_media_user_id_fkey"
      columns: ["media_user_id"]
isOneToOne: false
      referencedRelation: "profile_media"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "profile_media_reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "academic_college": string | null,"admit_term_id": string | null,"avatar_path": string | null,"ban_reason": string | null,"banned_at": string | null,"bio": string,"campus": string | null,"class_year": string | null,"created_at": string,"first_name": string,"gender": string | null,"gender_inclusive": boolean | null,"id": string,"inactivity_warned_at": string | null,"is_demo": boolean,"is_hidden": boolean,"is_seed": boolean,"is_staff": boolean,"last_active_at": string,"last_initial": string,"llc": string | null,"major": string | null,"onboarding_completed_at": string | null,"onboarding_step": number,"pre_arrival": boolean,"pronouns": string | null,"residential_college": string | null,"school_id": string,"student_verified_at": string | null,"track": string | null,"track_locked": boolean,"updated_at": string,"verified_only": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "academic_college"?: string | null,"admit_term_id"?: string | null,"avatar_path"?: string | null,"ban_reason"?: string | null,"banned_at"?: string | null,"bio"?: string,"campus"?: string | null,"class_year"?: string | null,"created_at"?: string,"first_name"?: string,"gender"?: string | null,"gender_inclusive"?: boolean | null,"id": string,"inactivity_warned_at"?: string | null,"is_demo"?: boolean,"is_hidden"?: boolean,"is_seed"?: boolean,"is_staff"?: boolean,"last_active_at"?: string,"last_initial"?: string,"llc"?: string | null,"major"?: string | null,"onboarding_completed_at"?: string | null,"onboarding_step"?: number,"pre_arrival"?: boolean,"pronouns"?: string | null,"residential_college"?: string | null,"school_id": string,"student_verified_at"?: string | null,"track"?: string | null,"track_locked"?: boolean,"updated_at"?: string,"verified_only"?: boolean
                  }
                  Update: {
                    "academic_college"?: string | null,"admit_term_id"?: string | null,"avatar_path"?: string | null,"ban_reason"?: string | null,"banned_at"?: string | null,"bio"?: string,"campus"?: string | null,"class_year"?: string | null,"created_at"?: string,"first_name"?: string,"gender"?: string | null,"gender_inclusive"?: boolean | null,"id"?: string,"inactivity_warned_at"?: string | null,"is_demo"?: boolean,"is_hidden"?: boolean,"is_seed"?: boolean,"is_staff"?: boolean,"last_active_at"?: string,"last_initial"?: string,"llc"?: string | null,"major"?: string | null,"onboarding_completed_at"?: string | null,"onboarding_step"?: number,"pre_arrival"?: boolean,"pronouns"?: string | null,"residential_college"?: string | null,"school_id"?: string,"student_verified_at"?: string | null,"track"?: string | null,"track_locked"?: boolean,"updated_at"?: string,"verified_only"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_admit_term_id_fkey"
      columns: ["admit_term_id"]
isOneToOne: false
      referencedRelation: "terms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"last_used_at": string | null,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"last_used_at"?: string | null,"p256dh": string,"user_agent"?: string | null,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"last_used_at"?: string | null,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ra_case_notes": {
                  Row: {
                    "author_id": string | null,"body": string,"case_id": string,"created_at": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body": string,"case_id": string,"created_at"?: string,"id"?: string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"case_id"?: string,"created_at"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ra_case_notes_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ra_case_notes_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "ra_cases"
      referencedColumns: ["id"]
    }
                  ]
                },"ra_cases": {
                  Row: {
                    "assignment_id": string,"building": string,"closed_at": string | null,"closed_by": string | null,"created_at": string,"id": string,"opened_by": string | null,"school_id": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignment_id": string,"building": string,"closed_at"?: string | null,"closed_by"?: string | null,"created_at"?: string,"id"?: string,"opened_by"?: string | null,"school_id": string,"status"?: string,"user_id": string
                  }
                  Update: {
                    "assignment_id"?: string,"building"?: string,"closed_at"?: string | null,"closed_by"?: string | null,"created_at"?: string,"id"?: string,"opened_by"?: string | null,"school_id"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ra_cases_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ra_cases_closed_by_fkey"
      columns: ["closed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ra_cases_opened_by_fkey"
      columns: ["opened_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ra_cases_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ra_cases_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ra_tasks": {
                  Row: {
                    "case_id": string,"created_at": string,"created_by": string | null,"done_at": string | null,"due_on": string | null,"id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "case_id": string,"created_at"?: string,"created_by"?: string | null,"done_at"?: string | null,"due_on"?: string | null,"id"?: string,"title": string
                  }
                  Update: {
                    "case_id"?: string,"created_at"?: string,"created_by"?: string | null,"done_at"?: string | null,"due_on"?: string | null,"id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ra_tasks_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "ra_cases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ra_tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
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
                },"room_calendar_tokens": {
                  Row: {
                    "created_at": string,"group_id": string,"id": string,"rotated_at": string | null,"token_hash": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"group_id": string,"id"?: string,"rotated_at"?: string | null,"token_hash": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"group_id"?: string,"id"?: string,"rotated_at"?: string | null,"token_hash"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_calendar_tokens_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_calendar_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"room_change_reasons": {
                  Row: {
                    "active": boolean,"key": string,"label": string,"position": number,"school_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"key": string,"label": string,"position"?: number,"school_id": string
                  }
                  Update: {
                    "active"?: boolean,"key"?: string,"label"?: string,"position"?: number,"school_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_change_reasons_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"room_change_requests": {
                  Row: {
                    "agreement_signed": boolean | null,"assignment_id": string | null,"building": string | null,"closed_at": string | null,"created_at": string,"external_ref": string | null,"id": string,"match_score_at_assignment": number | null,"reason_keys": (string)[],"school_id": string,"source": string,"staff_note": string | null,"status": string,"student_note": string | null,"tagged_at": string | null,"tagged_by": string | null,"term_id": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "agreement_signed"?: boolean | null,"assignment_id"?: string | null,"building"?: string | null,"closed_at"?: string | null,"created_at"?: string,"external_ref"?: string | null,"id"?: string,"match_score_at_assignment"?: number | null,"reason_keys"?: (string)[],"school_id": string,"source"?: string,"staff_note"?: string | null,"status"?: string,"student_note"?: string | null,"tagged_at"?: string | null,"tagged_by"?: string | null,"term_id"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "agreement_signed"?: boolean | null,"assignment_id"?: string | null,"building"?: string | null,"closed_at"?: string | null,"created_at"?: string,"external_ref"?: string | null,"id"?: string,"match_score_at_assignment"?: number | null,"reason_keys"?: (string)[],"school_id"?: string,"source"?: string,"staff_note"?: string | null,"status"?: string,"student_note"?: string | null,"tagged_at"?: string | null,"tagged_by"?: string | null,"term_id"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_change_requests_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_change_requests_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_change_requests_tagged_by_fkey"
      columns: ["tagged_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_change_requests_term_id_fkey"
      columns: ["term_id"]
isOneToOne: false
      referencedRelation: "terms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_change_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"room_events": {
                  Row: {
                    "created_at": string,"created_by": string,"ends_at": string,"group_id": string,"guest_count": number,"id": string,"kind": string,"notes": string | null,"overnight": boolean,"rrule": string | null,"starts_at": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"ends_at": string,"group_id": string,"guest_count"?: number,"id"?: string,"kind": string,"notes"?: string | null,"overnight"?: boolean,"rrule"?: string | null,"starts_at": string,"title": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"ends_at"?: string,"group_id"?: string,"guest_count"?: number,"id"?: string,"kind"?: string,"notes"?: string | null,"overnight"?: boolean,"rrule"?: string | null,"starts_at"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_events_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
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
                },"school_options": {
                  Row: {
                    "active": boolean,"kind": string,"label": string,"position": number,"school_id": string,"value": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"kind": string,"label": string,"position"?: number,"school_id": string,"value": string
                  }
                  Update: {
                    "active"?: boolean,"kind"?: string,"label"?: string,"position"?: number,"school_id"?: string,"value"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "school_options_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"school_question_answers": {
                  Row: {
                    "choice_key": string,"question_key": string,"question_version": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "choice_key": string,"question_key": string,"question_version": number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "choice_key"?: string,"question_key"?: string,"question_version"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "school_question_answers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"school_questions": {
                  Row: {
                    "choices": NonNullable<Json>,"created_at": string,"created_by": string | null,"factor": string,"id": string,"is_active": boolean,"key": string,"kind": string,"position": number,"reviewed_at": string | null,"reviewed_by": string | null,"school_id": string,"stem": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "choices": NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"factor": string,"id"?: string,"is_active"?: boolean,"key": string,"kind": string,"position"?: number,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"school_id": string,"stem": string,"version"?: number
                  }
                  Update: {
                    "choices"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"factor"?: string,"id"?: string,"is_active"?: boolean,"key"?: string,"kind"?: string,"position"?: number,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"school_id"?: string,"stem"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "school_questions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "school_questions_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "school_questions_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"school_rules": {
                  Row: {
                    "active": boolean,"id": string,"params": NonNullable<Json>,"rule_type": string,"school_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"id"?: string,"params"?: NonNullable<Json>,"rule_type": string,"school_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"id"?: string,"params"?: NonNullable<Json>,"rule_type"?: string,"school_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "school_rules_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "school_rules_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"schools": {
                  Row: {
                    "active": boolean,"ai_moderation_enabled": boolean,"branding": NonNullable<Json>,"created_at": string,"email_domains": (string)[],"hide_seed_profiles": boolean,"housing_office_name": string | null,"id": string,"is_demo": boolean,"licensed_beds": number | null,"merge_track_pools": boolean,"name": string,"otp_enabled": boolean,"plan": string,"pre_arrival_enabled": boolean,"short_name": string,"sso_domain": string | null,"sso_provider": string | null,"sso_provider_id": string | null,"timezone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"ai_moderation_enabled"?: boolean,"branding"?: NonNullable<Json>,"created_at"?: string,"email_domains": (string)[],"hide_seed_profiles"?: boolean,"housing_office_name"?: string | null,"id": string,"is_demo"?: boolean,"licensed_beds"?: number | null,"merge_track_pools"?: boolean,"name": string,"otp_enabled"?: boolean,"plan"?: string,"pre_arrival_enabled"?: boolean,"short_name": string,"sso_domain"?: string | null,"sso_provider"?: string | null,"sso_provider_id"?: string | null,"timezone"?: string
                  }
                  Update: {
                    "active"?: boolean,"ai_moderation_enabled"?: boolean,"branding"?: NonNullable<Json>,"created_at"?: string,"email_domains"?: (string)[],"hide_seed_profiles"?: boolean,"housing_office_name"?: string | null,"id"?: string,"is_demo"?: boolean,"licensed_beds"?: number | null,"merge_track_pools"?: boolean,"name"?: string,"otp_enabled"?: boolean,"plan"?: string,"pre_arrival_enabled"?: boolean,"short_name"?: string,"sso_domain"?: string | null,"sso_provider"?: string | null,"sso_provider_id"?: string | null,"timezone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"settlements": {
                  Row: {
                    "amount_cents": number,"created_at": string,"group_id": string,"id": string,"note": string | null,"payer_id": string,"receiver_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"group_id": string,"id"?: string,"note"?: string | null,"payer_id": string,"receiver_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"group_id"?: string,"id"?: string,"note"?: string | null,"payer_id"?: string,"receiver_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "settlements_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "settlements_payer_id_fkey"
      columns: ["payer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "settlements_receiver_id_fkey"
      columns: ["receiver_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"sms_messages": {
                  Row: {
                    "body": string,"created_at": string,"direction": string,"error": string | null,"id": string,"kind": string,"provider_sid": string | null,"status": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"direction": string,"error"?: string | null,"id"?: string,"kind": string,"provider_sid"?: string | null,"status": string,"user_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"direction"?: string,"error"?: string | null,"id"?: string,"kind"?: string,"provider_sid"?: string | null,"status"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sms_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"social_links": {
                  Row: {
                    "created_at": string,"handle": string,"id": string,"platform": string,"updated_at": string,"user_id": string,"verification_code": string | null,"verified_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"handle": string,"id"?: string,"platform": string,"updated_at"?: string,"user_id": string,"verification_code"?: string | null,"verified_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"handle"?: string,"id"?: string,"platform"?: string,"updated_at"?: string,"user_id"?: string,"verification_code"?: string | null,"verified_at"?: string | null
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
                    "assignment_id": string,"opted_in_at": string,"request_id": string,"school_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignment_id": string,"opted_in_at"?: string,"request_id": string,"school_id": string,"user_id": string
                  }
                  Update: {
                    "assignment_id"?: string,"opted_in_at"?: string,"request_id"?: string,"school_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "swap_pool_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "swap_pool_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "room_change_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "swap_pool_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "swap_pool_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"swap_proposals": {
                  Row: {
                    "approved_by": string | null,"assignment_ids": (string)[],"created_at": string,"cycle": (string)[],"decided_at": string | null,"id": string,"responses": NonNullable<Json>,"school_id": string,"scores": NonNullable<Json>,"staff_notes": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_by"?: string | null,"assignment_ids": (string)[],"created_at"?: string,"cycle": (string)[],"decided_at"?: string | null,"id"?: string,"responses"?: NonNullable<Json>,"school_id": string,"scores": NonNullable<Json>,"staff_notes"?: string | null,"status"?: string
                  }
                  Update: {
                    "approved_by"?: string | null,"assignment_ids"?: (string)[],"created_at"?: string,"cycle"?: (string)[],"decided_at"?: string | null,"id"?: string,"responses"?: NonNullable<Json>,"school_id"?: string,"scores"?: NonNullable<Json>,"staff_notes"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "swap_proposals_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "swap_proposals_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"terms": {
                  Row: {
                    "active": boolean,"config": NonNullable<Json>,"created_at": string,"created_by": string | null,"deadlines": NonNullable<Json>,"ends_on": string,"id": string,"name": string,"school_id": string,"starts_on": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"config"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"deadlines"?: NonNullable<Json>,"ends_on": string,"id"?: string,"name": string,"school_id": string,"starts_on": string
                  }
                  Update: {
                    "active"?: boolean,"config"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"deadlines"?: NonNullable<Json>,"ends_on"?: string,"id"?: string,"name"?: string,"school_id"?: string,"starts_on"?: string
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
                },"tracks": {
                  Row: {
                    "created_at": string,"id": string,"key": string,"label": string,"question_keys": (string)[],"school_id": string,"timeline": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"key": string,"label": string,"question_keys"?: (string)[],"school_id": string,"timeline"?: NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"key"?: string,"label"?: string,"question_keys"?: (string)[],"school_id"?: string,"timeline"?: NonNullable<Json>
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
                },"user_settings": {
                  Row: {
                    "created_at": string,"email": string,"last_digest_at": string | null,"last_name": string,"locale": string,"notify_email_groups": boolean,"notify_email_intros": boolean,"notify_email_matches": boolean,"notify_email_messages": boolean,"notify_inapp_groups": boolean,"notify_inapp_intros": boolean,"notify_inapp_matches": boolean,"notify_inapp_messages": boolean,"phone_enc": string | null,"phone_hash": string | null,"phone_last4": string | null,"phone_verified_at": string | null,"student_id_enc": string | null,"theme": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"last_digest_at"?: string | null,"last_name"?: string,"locale"?: string,"notify_email_groups"?: boolean,"notify_email_intros"?: boolean,"notify_email_matches"?: boolean,"notify_email_messages"?: boolean,"notify_inapp_groups"?: boolean,"notify_inapp_intros"?: boolean,"notify_inapp_matches"?: boolean,"notify_inapp_messages"?: boolean,"phone_enc"?: string | null,"phone_hash"?: string | null,"phone_last4"?: string | null,"phone_verified_at"?: string | null,"student_id_enc"?: string | null,"theme"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"last_digest_at"?: string | null,"last_name"?: string,"locale"?: string,"notify_email_groups"?: boolean,"notify_email_intros"?: boolean,"notify_email_matches"?: boolean,"notify_email_messages"?: boolean,"notify_inapp_groups"?: boolean,"notify_inapp_intros"?: boolean,"notify_inapp_matches"?: boolean,"notify_inapp_messages"?: boolean,"phone_enc"?: string | null,"phone_hash"?: string | null,"phone_last4"?: string | null,"phone_verified_at"?: string | null,"student_id_enc"?: string | null,"theme"?: string,"updated_at"?: string,"user_id"?: string
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
                },"weight_models": {
                  Row: {
                    "adopted_at": string | null,"adopted_by": string | null,"coefficients": NonNullable<Json>,"created_at": string,"id": string,"metrics": NonNullable<Json>,"school_id": string,"status": string,"suggested_weights": NonNullable<Json>,"trained_on_terms": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "adopted_at"?: string | null,"adopted_by"?: string | null,"coefficients": NonNullable<Json>,"created_at"?: string,"id"?: string,"metrics": NonNullable<Json>,"school_id": string,"status"?: string,"suggested_weights"?: NonNullable<Json>,"trained_on_terms"?: (string)[]
                  }
                  Update: {
                    "adopted_at"?: string | null,"adopted_by"?: string | null,"coefficients"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"metrics"?: NonNullable<Json>,"school_id"?: string,"status"?: string,"suggested_weights"?: NonNullable<Json>,"trained_on_terms"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "weight_models_adopted_by_fkey"
      columns: ["adopted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "weight_models_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
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
"add_chore":
{ Args: { "p_cadence": string,"p_first_due": string,"p_from_agreement"?: boolean,"p_group": string,"p_rotation": (string)[],"p_title": string }; Returns: string
                           },
"add_expense":
{ Args: { "p_amount_cents": number,"p_description": string,"p_group": string,"p_splits": Json }; Returns: string
                           },
"admit_school_for":
{ Args: { "p_email_hash": string }; Returns: string
                           },
"can_contact":
{ Args: { "recipient": string,"sender": string }; Returns: boolean
                           },
"can_manage_accommodations":
{ Args: { "p_school": string,"p_uid"?: string }; Returns: boolean
                           },
"can_view_profile":
{ Args: { "target": string,"viewer": string }; Returns: boolean
                           },
"cancel_group_request":
{ Args: { "p_request_id": string }; Returns: undefined
                           },
"checkin_visible_to_staff":
{ Args: { "p_ask": boolean,"p_share": boolean,"p_user": string }; Returns: boolean
                           },
"chore_next_due":
{ Args: { "p_cadence": string,"p_from": string }; Returns: string
                           },
"complete_chore":
{ Args: { "p_instance": string }; Returns: string
                           },
"complete_onboarding":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"consent_match_share":
{ Args: { "p_id": string,"p_other": string,"p_token_hash": string }; Returns: {
              "ready": boolean,"share_id": string
            }[]
                           },
"create_group":
{ Args: { "p_name": string,"p_target_size": number }; Returns: string
                           },
"decline_intro":
{ Args: { "p_intro_id": string }; Returns: undefined
                           },
"delete_expense":
{ Args: { "p_expense": string }; Returns: undefined
                           },
"email_hash":
{ Args: { "p_email": string }; Returns: string
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
"in_pilot_scope":
{ Args: { "p_residential_college": string,"p_school": string }; Returns: boolean
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
"join_swap_pool":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"leave_group":
{ Args: { "p_group_id": string }; Returns: undefined
                           },
"mark_conversation_read":
{ Args: { "p_conversation_id": string }; Returns: undefined
                           },
"mutual_connections_details":
{ Args: { "target_id": string }; Returns: {
              "avatar_path": string,"first_name": string,"last_initial": string,"user_id": string
            }[]
                           },
"mutual_count":
{ Args: { "p_other": string }; Returns: number
                           },
"mutual_people":
{ Args: { "p_target": string,"p_viewer": string }; Returns: string[]
                           },
"prune_match_scores":
{ Args: { "p_keep": (string)[],"p_user": string }; Returns: undefined
                           },
"purge_audit_log":
{ Args: { "p_before": string,"p_school": string }; Returns: number
                           },
"ra_case_visible":
{ Args: { "p_case": string }; Returns: boolean
                           },
"ra_risk_list":
{ Args: { "p_school": string }; Returns: {
              "ask_ra": boolean,"assignment_id": string,"building": string,"case_id": string,"case_status": string,"first_name": string,"group_id": string,"last_initial": string,"level": string,"note_enc": string,"reasons": (string)[],"room": string,"score": number,"submitted_at": string,"tags": (string)[],"user_id": string
            }[]
                           },
"rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"reorder_photos":
{ Args: { "p_ids": (string)[] }; Returns: undefined
                           },
"report_profile_media":
{ Args: { "p_owner": string,"p_reason": string }; Returns: string
                           },
"request_connection":
{ Args: { "p_target": string }; Returns: string
                           },
"request_to_join_group":
{ Args: { "p_group_id": string,"p_message"?: string }; Returns: string
                           },
"resolve_imported_answers":
{ Args: { "p_confirm": boolean }; Returns: number
                           },
"respond_connection":
{ Args: { "p_accept": boolean,"p_id": string }; Returns: string
                           },
"respond_group_request":
{ Args: { "p_accept": boolean,"p_request_id": string }; Returns: string
                           },
"respond_housing_suggestion":
{ Args: { "p_accept": boolean,"p_id": string }; Returns: string
                           },
"respond_swap":
{ Args: { "p_accept": boolean,"p_id": string }; Returns: string
                           },
"revoke_match_share":
{ Args: { "p_other": string }; Returns: undefined
                           },
"school_for_email":
{ Args: { "p_email": string }; Returns: string
                           },
"school_students":
{ Args: { "p_school": string }; Returns: {
              "academic_college": string | null,
"admit_term_id": string | null,
"avatar_path": string | null,
"ban_reason": string | null,
"banned_at": string | null,
"bio": string,
"campus": string | null,
"class_year": string | null,
"created_at": string,
"first_name": string,
"gender": string | null,
"gender_inclusive": boolean | null,
"id": string,
"inactivity_warned_at": string | null,
"is_demo": boolean,
"is_hidden": boolean,
"is_seed": boolean,
"is_staff": boolean,
"last_active_at": string,
"last_initial": string,
"llc": string | null,
"major": string | null,
"onboarding_completed_at": string | null,
"onboarding_step": number,
"pre_arrival": boolean,
"pronouns": string | null,
"residential_college": string | null,
"school_id": string,
"student_verified_at": string | null,
"track": string | null,
"track_locked": boolean,
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
"staff_agreement_completion":
{ Args: { "p_school": string }; Returns: {
              "building": string,"groups": number,"signed": number,"suppressed": boolean
            }[]
                           },
"staff_consistency_rate":
{ Args: { "p_school": string }; Returns: {
              "flagged": number,"suppressed": boolean,"total": number
            }[]
                           },
"staff_exported_students":
{ Args: { "p_school": string }; Returns: number
                           },
"staff_overview":
{ Args: { "p_school": string,"p_weeks"?: number }; Returns: Json
                           },
"staff_pairings":
{ Args: { "p_school": string }; Returns: {
              "agreement_status": string,"approved_at": string,"created_at": string,"group_id": string,"members": Json,"name": string,"pair_scores": Json,"snapshot": (string)[],"staff_notes": string,"status": string,"target_size": number
            }[]
                           },
"staff_room_changes":
{ Args: { "p_school": string }; Returns: Json
                           },
"staff_school_reports":
{ Args: { "p_school": string }; Returns: {
              "context": Json,"created_at": string,"details": string,"escalation_category": string,"escalation_destination": string,"escalation_forwarded_at": string,"escalation_id": string,"escalation_status": string,"id": string,"reason": string,"reported_avatar_path": string,"reported_banned_at": string,"reported_first_name": string,"reported_id": string,"reported_last_initial": string,"reporter_first_name": string,"reporter_id": string,"reporter_last_initial": string,"resolution_note": string,"reviewed_at": string,"source": string,"status": string
            }[]
                           },
"staff_scope_includes":
{ Args: { "p_building": string,"p_school": string,"p_uid"?: string }; Returns: boolean
                           },
"staff_segment_base":
{ Args: { "p_school": string }; Returns: {
              "academic_college": string,"agreement_signed": boolean,"best_score": number,"campus": string,"checkin_avg": number,"class_year": string,"gender_inclusive": string,"has_assignment": boolean,"housing_type": string,"id": string,"intros_accepted": number,"intros_sent": number,"llc": string,"matched": boolean,"onboarded": boolean,"pre_arrival": string,"residential_college": string,"room_changed": boolean,"track": string
            }[]
                           },
"staff_segments":
{ Args: { "p_dimension": string,"p_metric": string,"p_school": string }; Returns: {
              "average": number,"n": number,"numerator": number,"rate": number,"suppressed": boolean,"value": string
            }[]
                           },
"staff_signups_by_source":
{ Args: { "p_school": string }; Returns: {
              "n": number,"source": string,"suppressed": boolean
            }[]
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

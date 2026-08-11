CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';

CREATE TABLE public.account_deletion_requests (
    id uuid NOT NULL,
    user_id uuid,
    email character varying(320) NOT NULL,
    requester_name character varying(100),
    reason text,
    status character varying(30) NOT NULL,
    source character varying(30) NOT NULL,
    verification_token_hash character varying(200),
    verified_at timestamp with time zone,
    processed_by uuid,
    processed_at timestamp with time zone,
    result text,
    retention_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email_hash character varying(128),
    email_redacted_at timestamp with time zone,
    retention_until timestamp with time zone,
    auth_user_delete_status character varying(40),
    auth_user_deleted_at timestamp with time zone,
    auth_user_delete_error_code character varying(120),
    verification_code_hash character varying(128),
    verification_expires_at timestamp with time zone,
    verification_attempt_count integer DEFAULT 0 NOT NULL,
    verification_resend_available_at timestamp with time zone,
    verification_locked_at timestamp with time zone,
    verification_send_count integer DEFAULT 0 NOT NULL,
    verification_window_started_at timestamp with time zone,
    deletion_authorization_hash character varying(128),
    deletion_authorization_expires_at timestamp with time zone,
    CONSTRAINT ck_account_deletion_requests_source CHECK (((source)::text = ANY ((ARRAY['mobile_app'::character varying, 'public_web'::character varying, 'operator'::character varying])::text[]))),
    CONSTRAINT ck_account_deletion_requests_status CHECK (((status)::text = ANY ((ARRAY['requested'::character varying, 'verified'::character varying, 'in_review'::character varying, 'completed'::character varying, 'rejected'::character varying, 'canceled'::character varying])::text[])))
);

CREATE TABLE public.ai_summary_artifacts (
    id uuid NOT NULL,
    summary_type character varying(40) NOT NULL,
    interview_post_id uuid,
    application_id uuid,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    source_hash character varying(64) NOT NULL,
    prompt_version character varying(40) NOT NULL,
    work_version integer DEFAULT 1 NOT NULL,
    result jsonb,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    last_error_code character varying(80),
    last_error_message character varying(500),
    provider character varying(40),
    model character varying(100),
    input_tokens integer,
    output_tokens integer,
    estimated_cost_usd numeric(12,6),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_ai_summary_artifacts_attempt_count CHECK ((attempt_count >= 0)),
    CONSTRAINT ck_ai_summary_artifacts_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'ready'::character varying, 'failed'::character varying])::text[]))),
    CONSTRAINT ck_ai_summary_artifacts_target CHECK (((((summary_type)::text = 'interview_post'::text) AND (interview_post_id IS NOT NULL) AND (application_id IS NULL)) OR (((summary_type)::text = 'application'::text) AND (application_id IS NOT NULL) AND (interview_post_id IS NULL)))),
    CONSTRAINT ck_ai_summary_artifacts_type CHECK (((summary_type)::text = ANY ((ARRAY['interview_post'::character varying, 'application'::character varying])::text[]))),
    CONSTRAINT ck_ai_summary_artifacts_work_version CHECK ((work_version > 0))
);

CREATE TABLE public.app_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(320) NOT NULL,
    name character varying(100) NOT NULL,
    phone character varying(40),
    role character varying(30) DEFAULT 'respondent'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    profile_image_path character varying(500),
    profile_image_url character varying(1000),
    bio character varying(120),
    deactivated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    anonymized_at timestamp with time zone,
    deletion_requested_at timestamp with time zone,
    deletion_completed_at timestamp with time zone,
    deletion_reason character varying(500),
    deleted_email_hash character varying(128)
);

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_post_id uuid NOT NULL,
    respondent_id uuid NOT NULL,
    answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    available_times jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(30) DEFAULT 'applied'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rejection_reason text,
    moderation_status character varying(30) DEFAULT 'visible'::character varying NOT NULL,
    CONSTRAINT ck_applications_moderation_status CHECK (((moderation_status)::text = ANY ((ARRAY['visible'::character varying, 'hidden'::character varying, 'removed'::character varying])::text[]))),
    CONSTRAINT ck_applications_status CHECK (((status)::text = ANY ((ARRAY['applied'::character varying, 'selected'::character varying, 'rejected'::character varying, 'canceled'::character varying, 'no_show'::character varying, 'completed'::character varying])::text[])))
);

CREATE TABLE public.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    founder_confirmed boolean DEFAULT false NOT NULL,
    respondent_confirmed boolean DEFAULT false NOT NULL,
    no_show_party character varying(30),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    founder_confirmed_at timestamp with time zone,
    respondent_confirmed_at timestamp with time zone,
    completed_by uuid,
    completion_source character varying(40),
    no_show_reason text,
    disputed_at timestamp with time zone,
    dispute_reason text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_attendance_records_no_show_party CHECK ((((no_show_party)::text = ANY ((ARRAY['founder'::character varying, 'respondent'::character varying])::text[])) OR (no_show_party IS NULL)))
);

CREATE TABLE public.audit_events (
    id uuid NOT NULL,
    actor_user_id uuid,
    actor_type character varying(30) NOT NULL,
    event_type character varying(80) NOT NULL,
    target_type character varying(50) NOT NULL,
    target_id uuid,
    before jsonb,
    after jsonb,
    reason text,
    request_id character varying(120),
    ip_hash character varying(120),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sender_id uuid,
    message_type character varying(40) NOT NULL,
    body text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    hidden_at timestamp with time zone,
    hidden_reason text,
    client_message_id character varying(80),
    CONSTRAINT ck_chat_messages_message_type CHECK (((message_type)::text = ANY ((ARRAY['system'::character varying, 'user'::character varying, 'application_created'::character varying, 'application_selected'::character varying, 'application_rejected'::character varying, 'schedule_created'::character varying])::text[])))
);

CREATE TABLE public.chat_room_participant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_muted boolean DEFAULT false NOT NULL,
    is_hidden boolean DEFAULT false NOT NULL,
    last_read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.chat_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_post_id uuid NOT NULL,
    application_id uuid NOT NULL,
    founder_id uuid NOT NULL,
    respondent_id uuid NOT NULL,
    status character varying(30) DEFAULT 'open'::character varying NOT NULL,
    last_message_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_chat_rooms_status CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'selected'::character varying, 'closed'::character varying, 'blocked'::character varying])::text[])))
);

CREATE TABLE public.founder_profiles (
    user_id uuid NOT NULL,
    team_name character varying(120),
    service_domain character varying(120),
    startup_stage character varying(80),
    university character varying(120),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.interview_post_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    interview_post_id uuid NOT NULL,
    first_viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    last_viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    view_count integer DEFAULT 1 NOT NULL,
    source character varying(30) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_interview_post_views_source CHECK (((source)::text = ANY ((ARRAY['home'::character varying, 'interviews'::character varying, 'map'::character varying, 'detail'::character varying, 'chat'::character varying])::text[])))
);

CREATE TABLE public.interview_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    founder_id uuid NOT NULL,
    title character varying(120) NOT NULL,
    service_summary text NOT NULL,
    target_description text NOT NULL,
    reward_amount integer NOT NULL,
    duration_minutes integer NOT NULL,
    interview_mode character varying(20) NOT NULL,
    location character varying(200),
    schedule_options jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    location_text character varying(200),
    location_address character varying(300),
    location_place_name character varying(200),
    location_latitude numeric(10,7),
    location_longitude numeric(10,7),
    location_precision character varying(30),
    location_source character varying(30),
    recruit_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT ck_interview_posts_interview_mode CHECK (((interview_mode)::text = ANY ((ARRAY['offline'::character varying, 'online'::character varying, 'both'::character varying])::text[]))),
    CONSTRAINT ck_interview_posts_location_latitude CHECK ((((location_latitude >= ('-90'::integer)::numeric) AND (location_latitude <= (90)::numeric)) OR (location_latitude IS NULL))),
    CONSTRAINT ck_interview_posts_location_longitude CHECK ((((location_longitude >= ('-180'::integer)::numeric) AND (location_longitude <= (180)::numeric)) OR (location_longitude IS NULL))),
    CONSTRAINT ck_interview_posts_location_precision CHECK ((((location_precision)::text = ANY ((ARRAY['exact'::character varying, 'nearby'::character varying, 'district'::character varying])::text[])) OR (location_precision IS NULL))),
    CONSTRAINT ck_interview_posts_location_source CHECK ((((location_source)::text = ANY ((ARRAY['kakao_place'::character varying, 'manual'::character varying, 'current_location'::character varying])::text[])) OR (location_source IS NULL))),
    CONSTRAINT ck_interview_posts_recruit_count CHECK ((recruit_count >= 0)),
    CONSTRAINT ck_interview_posts_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'open'::character varying, 'closed'::character varying, 'completed'::character varying, 'archived'::character varying, 'hidden'::character varying, 'removed'::character varying])::text[])))
);

CREATE TABLE public.interview_reviews (
    id uuid NOT NULL,
    session_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    reviewee_id uuid NOT NULL,
    reviewer_role character varying(30) NOT NULL,
    rating integer NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    comment text,
    visibility character varying(30) DEFAULT 'private'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_interview_reviews_rating CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT ck_interview_reviews_reviewer_role CHECK (((reviewer_role)::text = ANY ((ARRAY['founder'::character varying, 'respondent'::character varying])::text[]))),
    CONSTRAINT ck_interview_reviews_visibility CHECK (((visibility)::text = ANY ((ARRAY['private'::character varying, 'public_later'::character varying, 'hidden'::character varying, 'removed'::character varying])::text[])))
);

CREATE TABLE public.interview_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    meeting_type character varying(20) NOT NULL,
    meeting_url character varying(500),
    place character varying(300),
    status character varying(30) DEFAULT 'scheduled'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    moderation_status character varying(30) DEFAULT 'visible'::character varying NOT NULL,
    CONSTRAINT ck_interview_sessions_meeting_type CHECK (((meeting_type)::text = ANY ((ARRAY['offline'::character varying, 'online'::character varying])::text[]))),
    CONSTRAINT ck_interview_sessions_moderation_status CHECK (((moderation_status)::text = ANY ((ARRAY['visible'::character varying, 'hidden'::character varying, 'removed'::character varying])::text[]))),
    CONSTRAINT ck_interview_sessions_status CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'completed'::character varying, 'canceled'::character varying, 'no_show'::character varying])::text[])))
);

CREATE TABLE public.moderation_actions (
    id uuid NOT NULL,
    actor_user_id uuid,
    target_type character varying(40) NOT NULL,
    target_id uuid NOT NULL,
    action character varying(40) NOT NULL,
    reason text,
    source_ticket_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_moderation_actions_action CHECK (((action)::text = ANY ((ARRAY['warn'::character varying, 'hide'::character varying, 'remove'::character varying, 'block'::character varying, 'unblock'::character varying, 'close_report'::character varying, 'restore'::character varying])::text[]))),
    CONSTRAINT ck_moderation_actions_target_type CHECK (((target_type)::text = ANY ((ARRAY['user'::character varying, 'interview_post'::character varying, 'application'::character varying, 'chat_room'::character varying, 'chat_message'::character varying, 'session'::character varying])::text[])))
);

CREATE TABLE public.notification_preferences (
    user_id uuid NOT NULL,
    push_enabled boolean DEFAULT false NOT NULL,
    chat_push_enabled boolean DEFAULT true NOT NULL,
    application_push_enabled boolean DEFAULT true NOT NULL,
    session_push_enabled boolean DEFAULT true NOT NULL,
    support_push_enabled boolean DEFAULT true NOT NULL,
    marketing_push_enabled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    type character varying(60) NOT NULL,
    title character varying(120) NOT NULL,
    body text NOT NULL,
    target_type character varying(40),
    target_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.push_deliveries (
    id uuid NOT NULL,
    notification_id uuid NOT NULL,
    push_device_id uuid NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(20) NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    provider_message_id character varying(240),
    provider_status character varying(80),
    provider_error_code character varying(120),
    provider_error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_push_deliveries_provider CHECK (((provider)::text = ANY ((ARRAY['apns'::character varying, 'fcm'::character varying])::text[]))),
    CONSTRAINT ck_push_deliveries_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'sending'::character varying, 'sent'::character varying, 'failed'::character varying, 'invalid'::character varying, 'skipped'::character varying])::text[])))
);

CREATE TABLE public.push_devices (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    platform character varying(20) NOT NULL,
    provider character varying(20) NOT NULL,
    environment character varying(20) NOT NULL,
    token text NOT NULL,
    token_hash character varying(80) NOT NULL,
    installation_id character varying(120),
    device_label character varying(120),
    app_version character varying(40),
    build_number character varying(40),
    os_version character varying(80),
    locale character varying(40),
    timezone character varying(80),
    permission_status character varying(30) DEFAULT 'unknown'::character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    last_registered_at timestamp with time zone DEFAULT now() NOT NULL,
    last_success_at timestamp with time zone,
    last_failure_at timestamp with time zone,
    failure_count integer DEFAULT 0 NOT NULL,
    disabled_at timestamp with time zone,
    disabled_reason character varying(120),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_push_devices_environment CHECK (((environment)::text = ANY ((ARRAY['development'::character varying, 'production'::character varying])::text[]))),
    CONSTRAINT ck_push_devices_permission_status CHECK (((permission_status)::text = ANY ((ARRAY['granted'::character varying, 'denied'::character varying, 'provisional'::character varying, 'unknown'::character varying])::text[]))),
    CONSTRAINT ck_push_devices_platform CHECK (((platform)::text = ANY ((ARRAY['ios'::character varying, 'android'::character varying])::text[]))),
    CONSTRAINT ck_push_devices_provider CHECK (((provider)::text = ANY ((ARRAY['apns'::character varying, 'fcm'::character varying])::text[])))
);

CREATE TABLE public.respondent_profiles (
    user_id uuid NOT NULL,
    birth_year integer,
    gender character varying(40),
    occupation character varying(120),
    location character varying(200),
    available_modes jsonb DEFAULT '[]'::jsonb NOT NULL,
    interests jsonb DEFAULT '[]'::jsonb NOT NULL,
    experience_tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.reward_confirmations (
    id uuid NOT NULL,
    session_id uuid NOT NULL,
    application_id uuid NOT NULL,
    founder_id uuid NOT NULL,
    respondent_id uuid NOT NULL,
    amount integer NOT NULL,
    status character varying(40) DEFAULT 'pending'::character varying NOT NULL,
    founder_marked_paid_at timestamp with time zone,
    respondent_confirmed_at timestamp with time zone,
    disputed_at timestamp with time zone,
    dispute_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_reward_confirmations_amount CHECK ((amount >= 0)),
    CONSTRAINT ck_reward_confirmations_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'founder_marked_paid'::character varying, 'respondent_confirmed'::character varying, 'disputed'::character varying, 'canceled'::character varying])::text[])))
);

CREATE TABLE public.social_auth_attempts (
    id uuid NOT NULL,
    provider character varying(30) NOT NULL,
    platform character varying(20) NOT NULL,
    flow character varying(20) NOT NULL,
    return_path character varying(2048),
    secret_hash character varying(128) NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    auth_user_id uuid,
    result_next_step character varying(50),
    result_email character varying(320),
    result_email_verified boolean,
    completed_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_social_auth_attempt_flow CHECK (((flow)::text = ANY ((ARRAY['login'::character varying, 'link'::character varying])::text[]))),
    CONSTRAINT ck_social_auth_attempt_platform CHECK (((platform)::text = ANY ((ARRAY['web'::character varying, 'ios'::character varying, 'android'::character varying])::text[]))),
    CONSTRAINT ck_social_auth_attempt_provider CHECK (((provider)::text = ANY ((ARRAY['apple'::character varying, 'google'::character varying, 'kakao'::character varying, 'naver'::character varying])::text[]))),
    CONSTRAINT ck_social_auth_attempt_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'expired'::character varying, 'cancelled'::character varying, 'failed'::character varying])::text[])))
);

CREATE TABLE public.social_auth_identities (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(30) NOT NULL,
    provider_subject_hash character varying(128) NOT NULL,
    supabase_identity_id character varying(120) NOT NULL,
    provider_email character varying(320),
    provider_email_verified boolean,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    linked_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone,
    revoked_at timestamp with time zone,
    email_forwarding_enabled boolean,
    CONSTRAINT ck_social_auth_identity_provider CHECK (((provider)::text = ANY ((ARRAY['apple'::character varying, 'google'::character varying, 'kakao'::character varying, 'naver'::character varying])::text[]))),
    CONSTRAINT ck_social_auth_identity_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'revocation_pending'::character varying, 'revoked'::character varying])::text[])))
);

CREATE TABLE public.social_auth_provider_events (
    id uuid NOT NULL,
    provider character varying(30) NOT NULL,
    event_type character varying(50) NOT NULL,
    provider_subject_hash character varying(128) NOT NULL,
    provider_event_id_hash character varying(128) NOT NULL,
    social_auth_identity_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_social_auth_provider_event_provider CHECK (((provider)::text = ANY ((ARRAY['apple'::character varying, 'google'::character varying, 'kakao'::character varying, 'naver'::character varying])::text[]))),
    CONSTRAINT ck_social_auth_provider_event_type CHECK (((event_type)::text = ANY ((ARRAY['email-enabled'::character varying, 'email-disabled'::character varying, 'consent-revoked'::character varying, 'account-deleted'::character varying])::text[])))
);

CREATE TABLE public.support_ticket_events (
    id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    actor_user_id uuid,
    actor_type character varying(30) NOT NULL,
    event_type character varying(40) NOT NULL,
    from_status character varying(30),
    to_status character varying(30),
    message text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_support_ticket_events_actor_type CHECK (((actor_type)::text = ANY ((ARRAY['user'::character varying, 'operator'::character varying, 'system'::character varying])::text[]))),
    CONSTRAINT ck_support_ticket_events_event_type CHECK (((event_type)::text = ANY ((ARRAY['created'::character varying, 'edited'::character varying, 'deleted_by_user'::character varying, 'status_changed'::character varying, 'assigned'::character varying, 'operator_replied'::character varying, 'internal_note_added'::character varying, 'closed'::character varying])::text[])))
);

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind character varying(30) NOT NULL,
    category character varying(60) NOT NULL,
    subject character varying(140),
    body text NOT NULL,
    contact_email character varying(320) NOT NULL,
    target_type character varying(40),
    target_id uuid,
    status character varying(30) DEFAULT 'open'::character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_by_user_at timestamp with time zone,
    CONSTRAINT ck_support_tickets_kind CHECK (((kind)::text = ANY ((ARRAY['inquiry'::character varying, 'report'::character varying, 'privacy'::character varying, 'account_deletion'::character varying])::text[]))),
    CONSTRAINT ck_support_tickets_status CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'in_review'::character varying, 'resolved'::character varying, 'closed'::character varying])::text[])))
);

CREATE TABLE public.user_blocks (
    id uuid NOT NULL,
    blocker_id uuid NOT NULL,
    blocked_user_id uuid NOT NULL,
    reason text,
    source character varying(30) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT ck_user_blocks_not_self CHECK ((blocker_id <> blocked_user_id))
);

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ai_summary_artifacts
    ADD CONSTRAINT ai_summary_artifacts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_email_key UNIQUE (email);

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chat_room_participant_settings
    ADD CONSTRAINT chat_room_participant_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.founder_profiles
    ADD CONSTRAINT founder_profiles_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.interview_post_views
    ADD CONSTRAINT interview_post_views_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.interview_posts
    ADD CONSTRAINT interview_posts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.interview_reviews
    ADD CONSTRAINT interview_reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.push_deliveries
    ADD CONSTRAINT push_deliveries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.push_devices
    ADD CONSTRAINT push_devices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.respondent_profiles
    ADD CONSTRAINT respondent_profiles_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.reward_confirmations
    ADD CONSTRAINT reward_confirmations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.social_auth_attempts
    ADD CONSTRAINT social_auth_attempts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.social_auth_identities
    ADD CONSTRAINT social_auth_identities_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.social_auth_provider_events
    ADD CONSTRAINT social_auth_provider_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.support_ticket_events
    ADD CONSTRAINT support_ticket_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT uq_applications_post_respondent UNIQUE (interview_post_id, respondent_id);

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT uq_attendance_records_session_id UNIQUE (session_id);

ALTER TABLE ONLY public.chat_room_participant_settings
    ADD CONSTRAINT uq_chat_room_participant_settings_room_user UNIQUE (room_id, user_id);

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT uq_chat_rooms_application_id UNIQUE (application_id);

ALTER TABLE ONLY public.interview_post_views
    ADD CONSTRAINT uq_interview_post_views_user_post UNIQUE (user_id, interview_post_id);

ALTER TABLE ONLY public.interview_reviews
    ADD CONSTRAINT uq_interview_reviews_session_reviewer UNIQUE (session_id, reviewer_id);

ALTER TABLE ONLY public.push_deliveries
    ADD CONSTRAINT uq_push_deliveries_notification_device UNIQUE (notification_id, push_device_id);

ALTER TABLE ONLY public.push_devices
    ADD CONSTRAINT uq_push_devices_provider_environment_token_hash UNIQUE (provider, environment, token_hash);

ALTER TABLE ONLY public.reward_confirmations
    ADD CONSTRAINT uq_reward_confirmations_session_id UNIQUE (session_id);

ALTER TABLE ONLY public.social_auth_identities
    ADD CONSTRAINT uq_social_auth_identity_provider_subject UNIQUE (provider, provider_subject_hash);

ALTER TABLE ONLY public.social_auth_identities
    ADD CONSTRAINT uq_social_auth_identity_supabase_identity UNIQUE (supabase_identity_id);

ALTER TABLE ONLY public.social_auth_identities
    ADD CONSTRAINT uq_social_auth_identity_user_provider UNIQUE (user_id, provider);

ALTER TABLE ONLY public.social_auth_provider_events
    ADD CONSTRAINT uq_social_auth_provider_event_provider_event_id UNIQUE (provider, provider_event_id_hash);

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT uq_user_blocks_pair UNIQUE (blocker_id, blocked_user_id);

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_pkey PRIMARY KEY (id);

CREATE INDEX ix_account_deletion_requests_auth_user_delete_status ON public.account_deletion_requests USING btree (auth_user_delete_status);

CREATE INDEX ix_account_deletion_requests_email ON public.account_deletion_requests USING btree (email);

CREATE INDEX ix_account_deletion_requests_email_hash ON public.account_deletion_requests USING btree (email_hash);

CREATE INDEX ix_account_deletion_requests_processed_by ON public.account_deletion_requests USING btree (processed_by);

CREATE INDEX ix_account_deletion_requests_retention_until ON public.account_deletion_requests USING btree (retention_until);

CREATE INDEX ix_account_deletion_requests_source ON public.account_deletion_requests USING btree (source);

CREATE INDEX ix_account_deletion_requests_status ON public.account_deletion_requests USING btree (status);

CREATE INDEX ix_account_deletion_requests_user_id ON public.account_deletion_requests USING btree (user_id);

CREATE INDEX ix_ai_summary_artifacts_queue ON public.ai_summary_artifacts USING btree (status, next_attempt_at, created_at);

CREATE INDEX ix_app_users_deleted_email_hash ON public.app_users USING btree (deleted_email_hash);

CREATE INDEX ix_app_users_email ON public.app_users USING btree (email);

CREATE INDEX ix_applications_id_status ON public.applications USING btree (id, status);

CREATE INDEX ix_applications_interview_post_id ON public.applications USING btree (interview_post_id);

CREATE INDEX ix_applications_moderation_status ON public.applications USING btree (moderation_status);

CREATE INDEX ix_applications_respondent_id ON public.applications USING btree (respondent_id);

CREATE INDEX ix_applications_status ON public.applications USING btree (status);

CREATE INDEX ix_attendance_records_session_id ON public.attendance_records USING btree (session_id);

CREATE INDEX ix_audit_events_actor_type ON public.audit_events USING btree (actor_type);

CREATE INDEX ix_audit_events_actor_user_id ON public.audit_events USING btree (actor_user_id);

CREATE INDEX ix_audit_events_event_type ON public.audit_events USING btree (event_type);

CREATE INDEX ix_audit_events_request_id ON public.audit_events USING btree (request_id);

CREATE INDEX ix_audit_events_target_id ON public.audit_events USING btree (target_id);

CREATE INDEX ix_audit_events_target_type ON public.audit_events USING btree (target_type);

CREATE INDEX ix_chat_messages_message_type ON public.chat_messages USING btree (message_type);

CREATE INDEX ix_chat_messages_room_created_id ON public.chat_messages USING btree (room_id, created_at, id);

CREATE INDEX ix_chat_messages_room_id ON public.chat_messages USING btree (room_id);

CREATE INDEX ix_chat_messages_room_id_created_at ON public.chat_messages USING btree (room_id, created_at);

CREATE INDEX ix_chat_messages_sender_id ON public.chat_messages USING btree (sender_id);

CREATE INDEX ix_chat_room_participant_settings_room_id ON public.chat_room_participant_settings USING btree (room_id);

CREATE INDEX ix_chat_room_participant_settings_user_id ON public.chat_room_participant_settings USING btree (user_id);

CREATE INDEX ix_chat_rooms_application_id ON public.chat_rooms USING btree (application_id);

CREATE INDEX ix_chat_rooms_founder_id ON public.chat_rooms USING btree (founder_id);

CREATE INDEX ix_chat_rooms_interview_post_id ON public.chat_rooms USING btree (interview_post_id);

CREATE INDEX ix_chat_rooms_last_message_at ON public.chat_rooms USING btree (last_message_at);

CREATE INDEX ix_chat_rooms_respondent_id ON public.chat_rooms USING btree (respondent_id);

CREATE INDEX ix_chat_rooms_status ON public.chat_rooms USING btree (status);

CREATE INDEX ix_interview_post_views_interview_post_id ON public.interview_post_views USING btree (interview_post_id);

CREATE INDEX ix_interview_post_views_user_id ON public.interview_post_views USING btree (user_id);

CREATE INDEX ix_interview_posts_founder_id ON public.interview_posts USING btree (founder_id);

CREATE INDEX ix_interview_posts_status ON public.interview_posts USING btree (status);

CREATE INDEX ix_interview_reviews_reviewee_id ON public.interview_reviews USING btree (reviewee_id);

CREATE INDEX ix_interview_reviews_reviewer_id ON public.interview_reviews USING btree (reviewer_id);

CREATE INDEX ix_interview_reviews_session_id ON public.interview_reviews USING btree (session_id);

CREATE INDEX ix_interview_sessions_application_id ON public.interview_sessions USING btree (application_id);

CREATE INDEX ix_interview_sessions_id_status ON public.interview_sessions USING btree (id, status);

CREATE INDEX ix_interview_sessions_moderation_status ON public.interview_sessions USING btree (moderation_status);

CREATE INDEX ix_interview_sessions_status ON public.interview_sessions USING btree (status);

CREATE INDEX ix_moderation_actions_action ON public.moderation_actions USING btree (action);

CREATE INDEX ix_moderation_actions_actor_user_id ON public.moderation_actions USING btree (actor_user_id);

CREATE INDEX ix_moderation_actions_source_ticket_id ON public.moderation_actions USING btree (source_ticket_id);

CREATE INDEX ix_moderation_actions_target_id ON public.moderation_actions USING btree (target_id);

CREATE INDEX ix_moderation_actions_target_type ON public.moderation_actions USING btree (target_type);

CREATE INDEX ix_notifications_created_at ON public.notifications USING btree (created_at);

CREATE INDEX ix_notifications_read_at ON public.notifications USING btree (read_at);

CREATE INDEX ix_notifications_target_id ON public.notifications USING btree (target_id);

CREATE INDEX ix_notifications_target_type ON public.notifications USING btree (target_type);

CREATE INDEX ix_notifications_type ON public.notifications USING btree (type);

CREATE INDEX ix_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX ix_push_deliveries_next_attempt_at ON public.push_deliveries USING btree (next_attempt_at);

CREATE INDEX ix_push_deliveries_notification_id ON public.push_deliveries USING btree (notification_id);

CREATE INDEX ix_push_deliveries_provider ON public.push_deliveries USING btree (provider);

CREATE INDEX ix_push_deliveries_push_device_id ON public.push_deliveries USING btree (push_device_id);

CREATE INDEX ix_push_deliveries_status ON public.push_deliveries USING btree (status);

CREATE INDEX ix_push_deliveries_status_next_attempt_created ON public.push_deliveries USING btree (status, next_attempt_at, created_at);

CREATE INDEX ix_push_deliveries_user_id ON public.push_deliveries USING btree (user_id);

CREATE INDEX ix_push_devices_enabled ON public.push_devices USING btree (enabled);

CREATE INDEX ix_push_devices_environment ON public.push_devices USING btree (environment);

CREATE INDEX ix_push_devices_installation_id ON public.push_devices USING btree (installation_id);

CREATE INDEX ix_push_devices_platform ON public.push_devices USING btree (platform);

CREATE INDEX ix_push_devices_provider ON public.push_devices USING btree (provider);

CREATE INDEX ix_push_devices_token_hash ON public.push_devices USING btree (token_hash);

CREATE INDEX ix_push_devices_user_id ON public.push_devices USING btree (user_id);

CREATE INDEX ix_reward_confirmations_application_id ON public.reward_confirmations USING btree (application_id);

CREATE INDEX ix_reward_confirmations_founder_id ON public.reward_confirmations USING btree (founder_id);

CREATE INDEX ix_reward_confirmations_respondent_id ON public.reward_confirmations USING btree (respondent_id);

CREATE INDEX ix_reward_confirmations_session_id ON public.reward_confirmations USING btree (session_id);

CREATE INDEX ix_reward_confirmations_status ON public.reward_confirmations USING btree (status);

CREATE INDEX ix_social_auth_attempts_expires_at ON public.social_auth_attempts USING btree (expires_at);

CREATE INDEX ix_social_auth_attempts_status ON public.social_auth_attempts USING btree (status);

CREATE INDEX ix_social_auth_identities_status ON public.social_auth_identities USING btree (status);

CREATE INDEX ix_social_auth_identities_user_id ON public.social_auth_identities USING btree (user_id);

CREATE INDEX ix_social_auth_provider_events_social_auth_identity_id ON public.social_auth_provider_events USING btree (social_auth_identity_id);

CREATE INDEX ix_support_ticket_events_actor_user_id ON public.support_ticket_events USING btree (actor_user_id);

CREATE INDEX ix_support_ticket_events_event_type ON public.support_ticket_events USING btree (event_type);

CREATE INDEX ix_support_ticket_events_ticket_id ON public.support_ticket_events USING btree (ticket_id);

CREATE INDEX ix_support_tickets_category ON public.support_tickets USING btree (category);

CREATE INDEX ix_support_tickets_deleted_by_user_at ON public.support_tickets USING btree (deleted_by_user_at);

CREATE INDEX ix_support_tickets_kind ON public.support_tickets USING btree (kind);

CREATE INDEX ix_support_tickets_status ON public.support_tickets USING btree (status);

CREATE INDEX ix_support_tickets_target_id ON public.support_tickets USING btree (target_id);

CREATE INDEX ix_support_tickets_target_type ON public.support_tickets USING btree (target_type);

CREATE INDEX ix_support_tickets_user_id ON public.support_tickets USING btree (user_id);

CREATE INDEX ix_user_blocks_blocked_user_id ON public.user_blocks USING btree (blocked_user_id);

CREATE INDEX ix_user_blocks_blocker_id ON public.user_blocks USING btree (blocker_id);

CREATE INDEX ix_user_blocks_source ON public.user_blocks USING btree (source);

CREATE UNIQUE INDEX uq_ai_summary_artifacts_application ON public.ai_summary_artifacts USING btree (application_id) WHERE (application_id IS NOT NULL);

CREATE UNIQUE INDEX uq_ai_summary_artifacts_interview_post ON public.ai_summary_artifacts USING btree (interview_post_id) WHERE (interview_post_id IS NOT NULL);

CREATE UNIQUE INDEX uq_chat_messages_room_sender_client_message ON public.chat_messages USING btree (room_id, sender_id, client_message_id) WHERE (client_message_id IS NOT NULL);

CREATE UNIQUE INDEX uq_interview_sessions_one_scheduled_per_application ON public.interview_sessions USING btree (application_id) WHERE (((status)::text = 'scheduled'::text) AND ((moderation_status)::text = 'visible'::text));

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.ai_summary_artifacts
    ADD CONSTRAINT ai_summary_artifacts_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ai_summary_artifacts
    ADD CONSTRAINT ai_summary_artifacts_interview_post_id_fkey FOREIGN KEY (interview_post_id) REFERENCES public.interview_posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_interview_post_id_fkey FOREIGN KEY (interview_post_id) REFERENCES public.interview_posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_respondent_id_fkey FOREIGN KEY (respondent_id) REFERENCES public.app_users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.app_users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.chat_room_participant_settings
    ADD CONSTRAINT chat_room_participant_settings_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_room_participant_settings
    ADD CONSTRAINT chat_room_participant_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_founder_id_fkey FOREIGN KEY (founder_id) REFERENCES public.app_users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_interview_post_id_fkey FOREIGN KEY (interview_post_id) REFERENCES public.interview_posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_respondent_id_fkey FOREIGN KEY (respondent_id) REFERENCES public.app_users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT fk_attendance_records_completed_by_app_users FOREIGN KEY (completed_by) REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.founder_profiles
    ADD CONSTRAINT founder_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.interview_post_views
    ADD CONSTRAINT interview_post_views_interview_post_id_fkey FOREIGN KEY (interview_post_id) REFERENCES public.interview_posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.interview_post_views
    ADD CONSTRAINT interview_post_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.interview_posts
    ADD CONSTRAINT interview_posts_founder_id_fkey FOREIGN KEY (founder_id) REFERENCES public.app_users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.interview_reviews
    ADD CONSTRAINT interview_reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES public.app_users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.interview_reviews
    ADD CONSTRAINT interview_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.app_users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.interview_reviews
    ADD CONSTRAINT interview_reviews_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.interview_sessions
    ADD CONSTRAINT interview_sessions_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.moderation_actions
    ADD CONSTRAINT moderation_actions_source_ticket_id_fkey FOREIGN KEY (source_ticket_id) REFERENCES public.support_tickets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.push_deliveries
    ADD CONSTRAINT push_deliveries_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.push_deliveries
    ADD CONSTRAINT push_deliveries_push_device_id_fkey FOREIGN KEY (push_device_id) REFERENCES public.push_devices(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.push_deliveries
    ADD CONSTRAINT push_deliveries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.push_devices
    ADD CONSTRAINT push_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.respondent_profiles
    ADD CONSTRAINT respondent_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reward_confirmations
    ADD CONSTRAINT reward_confirmations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reward_confirmations
    ADD CONSTRAINT reward_confirmations_founder_id_fkey FOREIGN KEY (founder_id) REFERENCES public.app_users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.reward_confirmations
    ADD CONSTRAINT reward_confirmations_respondent_id_fkey FOREIGN KEY (respondent_id) REFERENCES public.app_users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.reward_confirmations
    ADD CONSTRAINT reward_confirmations_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.social_auth_identities
    ADD CONSTRAINT social_auth_identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.social_auth_provider_events
    ADD CONSTRAINT social_auth_provider_events_social_auth_identity_id_fkey FOREIGN KEY (social_auth_identity_id) REFERENCES public.social_auth_identities(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.support_ticket_events
    ADD CONSTRAINT support_ticket_events_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.support_ticket_events
    ADD CONSTRAINT support_ticket_events_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocked_user_id_fkey FOREIGN KEY (blocked_user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

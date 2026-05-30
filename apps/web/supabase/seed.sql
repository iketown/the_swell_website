-- WEBHOOKS SEED
-- PLEASE NOTE: These webhooks are only for development purposes. Leave them as they are or add new ones.

-- These webhooks are only for development purposes.
-- In production, you should manually create webhooks in the Supabase dashboard (or create a migration to do so).
-- We don't do it because you'll need to manually add your webhook URL and secret key.

-- this webhook will be triggered after a delete on the subscriptions table
-- which should happen when a user deletes their account (and all their subscriptions)
create trigger "subscriptions_delete"
    after delete
    on "public"."subscriptions"
    for each row
execute function "supabase_functions"."http_request"(
        'http://host.docker.internal:3000/api/db/webhook',
        'POST',
        '{"Content-Type":"application/json", "X-Supabase-Event-Signature":"WEBHOOKSECRET"}',
        '{}',
        '5000'
                 );

-- DATA SEED
-- This is a data dump for testing purposes. It should be used to seed the database with data for testing.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at",
                            "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token",
                            "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at",
                            "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin",
                            "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change",
                            "phone_change_token", "phone_change_sent_at", "email_change_token_current",
                            "email_change_confirm_status", "banned_until", "reauthentication_token",
                            "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous")
VALUES ('00000000-0000-0000-0000-000000000000', 'b73eb03e-fb7a-424d-84ff-18e2791ce0b4', 'authenticated',
        'authenticated', 'custom@makerkit.dev', '$2a$10$b3ZPpU6TU3or30QzrXnZDuATPAx2pPq3JW.sNaneVY3aafMSuR4yi',
        '2024-04-20 08:38:00.860548+00', NULL, '', '2024-04-20 08:37:43.343769+00', '', NULL, '', '', NULL,
        '2024-04-20 08:38:00.93864+00', '{"provider": "email", "providers": ["email"]}',
        '{"sub": "b73eb03e-fb7a-424d-84ff-18e2791ce0b4", "email": "custom@makerkit.dev", "email_verified": false, "phone_verified": false}',
        NULL, '2024-04-20 08:37:43.3385+00', '2024-04-20 08:38:00.942809+00', NULL, NULL, '', '', NULL, '', 0, NULL, '',
        NULL, false, NULL, false),
       ('00000000-0000-0000-0000-000000000000', '31a03e74-1639-45b6-bfa7-77447f1a4762', 'authenticated',
        'authenticated', 'test@makerkit.dev', '$2a$10$NaMVRrI7NyfwP.AfAVWt6O/abulGnf9BBqwa6DqdMwXMvOCGpAnVO',
        '2024-04-20 08:20:38.165331+00', NULL, '', NULL, '', NULL, '', '', NULL, '2024-04-20 09:36:02.521776+00',
        '{"provider": "email", "providers": ["email"], "role": "super-admin"}',
        '{"sub": "31a03e74-1639-45b6-bfa7-77447f1a4762", "email": "test@makerkit.dev", "email_verified": false, "phone_verified": false}',
        NULL, '2024-04-20 08:20:34.459113+00', '2024-04-20 10:07:48.554125+00', NULL, NULL, '', '', NULL, '', 0, NULL,
        '', NULL, false, NULL, false),
       ('00000000-0000-0000-0000-000000000000', '5c064f1b-78ee-4e1c-ac3b-e99aa97c99bf', 'authenticated',
        'authenticated', 'owner@makerkit.dev', '$2a$10$D6arGxWJShy8q4RTW18z7eW0vEm2hOxEUovUCj5f3NblyHfamm5/a',
        '2024-04-20 08:36:37.517993+00', NULL, '', '2024-04-20 08:36:27.639648+00', '', NULL, '', '', NULL,
        '2024-04-20 08:36:37.614337+00', '{"provider": "email", "providers": ["email"]}',
        '{"sub": "5c064f1b-78ee-4e1c-ac3b-e99aa97c99bf", "email": "owner@makerkit.dev", "email_verified": false, "phone_verified": false}',
        NULL, '2024-04-20 08:36:27.630379+00', '2024-04-20 08:36:37.617955+00', NULL, NULL, '', '', NULL, '', 0, NULL,
        '', NULL, false, NULL, false),
       ('00000000-0000-0000-0000-000000000000', '6b83d656-e4ab-48e3-a062-c0c54a427368', 'authenticated',
        'authenticated', 'member@makerkit.dev', '$2a$10$6h/x.AX.6zzphTfDXIJMzuYx13hIYEi/Iods9FXH19J2VxhsLycfa',
        '2024-04-20 08:41:15.376778+00', NULL, '', '2024-04-20 08:41:08.689674+00', '', NULL, '', '', NULL,
        '2024-04-20 08:41:15.484606+00', '{"provider": "email", "providers": ["email"]}',
        '{"sub": "6b83d656-e4ab-48e3-a062-c0c54a427368", "email": "member@makerkit.dev", "email_verified": false, "phone_verified": false}',
        NULL, '2024-04-20 08:41:08.683395+00', '2024-04-20 08:41:15.485494+00', NULL, NULL, '', '', NULL, '', 0, NULL,
        '', NULL, false, NULL, false),
       ('00000000-0000-0000-0000-000000000000', 'c5b930c9-0a76-412e-a836-4bc4849a3270', 'authenticated',
        'authenticated', 'super-admin@makerkit.dev',
        '$2a$10$gzxQw3vaVni8Ke9UVcn6ueWh674.6xImf6/yWYNc23BSeYdE9wmki', '2025-02-24 13:25:11.176987+00', null, '',
        '2025-02-24 13:25:01.649714+00', '', null, '', '', null, '2025-02-24 13:25:11.17957+00',
        '{"provider": "email", "providers": ["email"], "role": "super-admin"}',
        '{"sub": "c5b930c9-0a76-412e-a836-4bc4849a3270", "email": "super-admin@makerkit.dev", "email_verified": true, "phone_verified": false}',
        null, '2025-02-24 13:25:01.646641+00', '2025-02-24 13:25:11.181332+00', null, null, '', '', null
           , '', '0', null, '', null, 'false', null, 'false');

--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at",
                                 "updated_at", "id")
VALUES ('31a03e74-1639-45b6-bfa7-77447f1a4762', '31a03e74-1639-45b6-bfa7-77447f1a4762',
        '{"sub": "31a03e74-1639-45b6-bfa7-77447f1a4762", "email": "test@makerkit.dev", "email_verified": false, "phone_verified": false}',
        'email', '2024-04-20 08:20:34.46275+00', '2024-04-20 08:20:34.462773+00', '2024-04-20 08:20:34.462773+00',
        '9bb58bad-24a4-41a8-9742-1b5b4e2d8abd'),
       ('5c064f1b-78ee-4e1c-ac3b-e99aa97c99bf', '5c064f1b-78ee-4e1c-ac3b-e99aa97c99bf',
        '{"sub": "5c064f1b-78ee-4e1c-ac3b-e99aa97c99bf", "email": "owner@makerkit.dev", "email_verified": false, "phone_verified": false}',
        'email', '2024-04-20 08:36:27.637388+00', '2024-04-20 08:36:27.637409+00', '2024-04-20 08:36:27.637409+00',
        '090598a1-ebba-4879-bbe3-38d517d5066f'),
       ('b73eb03e-fb7a-424d-84ff-18e2791ce0b4', 'b73eb03e-fb7a-424d-84ff-18e2791ce0b4',
        '{"sub": "b73eb03e-fb7a-424d-84ff-18e2791ce0b4", "email": "custom@makerkit.dev", "email_verified": false, "phone_verified": false}',
        'email', '2024-04-20 08:37:43.342194+00', '2024-04-20 08:37:43.342218+00', '2024-04-20 08:37:43.342218+00',
        '4392e228-a6d8-4295-a7d6-baed50c33e7c'),
       ('6b83d656-e4ab-48e3-a062-c0c54a427368', '6b83d656-e4ab-48e3-a062-c0c54a427368',
        '{"sub": "6b83d656-e4ab-48e3-a062-c0c54a427368", "email": "member@makerkit.dev", "email_verified": false, "phone_verified": false}',
        'email', '2024-04-20 08:41:08.687948+00', '2024-04-20 08:41:08.687982+00', '2024-04-20 08:41:08.687982+00',
        'd122aca5-4f29-43f0-b1b1-940b000638db'),
        ('c5b930c9-0a76-412e-a836-4bc4849a3270', 'c5b930c9-0a76-412e-a836-4bc4849a3270',
        '{"sub": "c5b930c9-0a76-412e-a836-4bc4849a3270", "email": "super-admin@makerkit.dev", "email_verified": true, "phone_verified": false}',
        'email', '2025-02-24 13:25:01.646641+00', '2025-02-24 13:25:11.181332+00', '2025-02-24 13:25:11.181332+00',
        'c5b930c9-0a76-412e-a836-4bc4849a3270');

--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--


--
-- Data for Name: key; Type: TABLE DATA; Schema: pgsodium; Owner: supabase_admin
--


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."accounts" ("id", "primary_owner_user_id", "name", "slug", "email", "is_personal_account",
                                 "updated_at", "created_at", "created_by", "updated_by", "picture_url", "public_data")
VALUES ('5deaa894-2094-4da3-b4fd-1fada0809d1c', '31a03e74-1639-45b6-bfa7-77447f1a4762', 'Makerkit', 'makerkit', NULL,
        false, NULL, NULL, NULL, NULL, NULL, '{}');

--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."roles" ("name", "hierarchy_level")
VALUES ('custom-role', 4);

--
-- Data for Name: accounts_memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."accounts_memberships" ("user_id", "account_id", "account_role", "created_at", "updated_at",
                                             "created_by", "updated_by")
VALUES ('31a03e74-1639-45b6-bfa7-77447f1a4762', '5deaa894-2094-4da3-b4fd-1fada0809d1c', 'owner',
        '2024-04-20 08:21:16.802867+00', '2024-04-20 08:21:16.802867+00', NULL, NULL),
       ('5c064f1b-78ee-4e1c-ac3b-e99aa97c99bf', '5deaa894-2094-4da3-b4fd-1fada0809d1c', 'owner',
        '2024-04-20 08:36:44.21028+00', '2024-04-20 08:36:44.21028+00', NULL, NULL),
       ('b73eb03e-fb7a-424d-84ff-18e2791ce0b4', '5deaa894-2094-4da3-b4fd-1fada0809d1c', 'custom-role',
        '2024-04-20 08:38:02.50993+00', '2024-04-20 08:38:02.50993+00', NULL, NULL),
       ('6b83d656-e4ab-48e3-a062-c0c54a427368', '5deaa894-2094-4da3-b4fd-1fada0809d1c', 'member',
        '2024-04-20 08:41:17.833709+00', '2024-04-20 08:41:17.833709+00', NULL, NULL);

-- MFA Factors
INSERT INTO "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at",
                                  "secret", "phone", "last_challenged_at")
VALUES ('659e3b57-1128-4d26-8757-f714fd073fc4', 'c5b930c9-0a76-412e-a836-4bc4849a3270', 'iPhone', 'totp', 'verified',
        '2025-02-24 13:23:55.5805+00', '2025-02-24 13:24:32.591999+00', 'NHOHJVGPO3R3LKVPRMNIYLCDMBHUM2SE', null,
        '2025-02-24 13:24:32.563314+00');

--
-- Data for Name: billing_customers; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- Data for Name: subscription_items; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--


--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--

--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 5, true);

--
-- The Swell seed data
--

INSERT INTO "public"."accounts" (
    "id",
    "primary_owner_user_id",
    "name",
    "slug",
    "email",
    "is_personal_account",
    "public_data"
)
VALUES (
    '914c4883-7fe2-4d99-91a7-8b5c6a07f54d',
    '5c064f1b-78ee-4e1c-ac3b-e99aa97c99bf',
    'The Swell',
    'the-swell',
    null,
    false,
    '{"brand": "sunny california 60s nostalgia"}'::jsonb
)
ON CONFLICT ("id") DO UPDATE
SET
    "name" = excluded."name",
    "slug" = excluded."slug",
    "public_data" = excluded."public_data";

INSERT INTO "public"."accounts_memberships" (
    "user_id",
    "account_id",
    "account_role"
)
VALUES
    ('5c064f1b-78ee-4e1c-ac3b-e99aa97c99bf', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'owner'),
    ('6b83d656-e4ab-48e3-a062-c0c54a427368', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'member')
ON CONFLICT ("user_id", "account_id") DO UPDATE
SET
    "account_role" = excluded."account_role";

INSERT INTO "public"."members" (
    "id",
    "account_id",
    "user_id",
    "account_role",
    "status",
    "display_name",
    "legal_name",
    "email",
    "role_label",
    "member_type",
    "default_instrument",
    "default_vocal_slot",
    "instrument_capabilities",
    "vocal_capabilities",
    "capability_notes"
)
VALUES
    (
        '52484098-96fc-4827-8e61-2576f5483da5',
        '914c4883-7fe2-4d99-91a7-8b5c6a07f54d',
        '5c064f1b-78ee-4e1c-ac3b-e99aa97c99bf',
        'owner',
        'active',
        'Ike',
        'Brian Eichenberger',
        'owner@makerkit.dev',
        'Brian Wilson role',
        'performer',
        'bass',
        'vocal_1',
        array['bass', 'rhy_gtr']::public.instrument_slot[],
        array['vocal_1', 'vocal_2']::public.vocal_slot[],
        'Home base on bass and top harmony. Can cover rhythm guitar.'
    ),
    (
        '6f4d0de6-e193-4347-a9fc-727d35ee5346',
        '914c4883-7fe2-4d99-91a7-8b5c6a07f54d',
        null,
        'member',
        'active',
        'Cron',
        null,
        'cron@example.test',
        'Keys / vocal director',
        'performer',
        'keys',
        'vocal_3',
        array['keys', 'bass']::public.instrument_slot[],
        array['vocal_2', 'vocal_3', 'vocal_4']::public.vocal_slot[],
        'Primary keys, can cover lower-middle harmony and bass in a pinch.'
    ),
    (
        'c00c8c90-250d-476f-a532-1044cf0b141f',
        '914c4883-7fe2-4d99-91a7-8b5c6a07f54d',
        '6b83d656-e4ab-48e3-a062-c0c54a427368',
        'member',
        'active',
        'Alex',
        null,
        'member@makerkit.dev',
        'Guitar / vocal blend',
        'performer',
        'lead_gtr',
        'vocal_2',
        array['lead_gtr', 'rhy_gtr']::public.instrument_slot[],
        array['vocal_2', 'vocal_3']::public.vocal_slot[],
        'Can move between lead and rhythm guitar song to song.'
    ),
    (
        'ef5a956d-3909-4c09-bf32-e40f602cf6c7',
        '914c4883-7fe2-4d99-91a7-8b5c6a07f54d',
        null,
        'member',
        'active',
        'Matt',
        null,
        'matt@example.test',
        'Drums',
        'performer',
        'drums',
        null,
        array['drums']::public.instrument_slot[],
        array[]::public.vocal_slot[],
        'Depth-1 drums seed so coverage warnings have something real to flag.'
    ),
    (
        '41d46229-abaf-4804-9e7e-2c553ac5fc8b',
        '914c4883-7fe2-4d99-91a7-8b5c6a07f54d',
        null,
        'member',
        'candidate',
        'Jamie Candidate',
        null,
        'jamie@example.test',
        'Rhythm guitar candidate',
        'performer',
        'rhy_gtr',
        'vocal_4',
        array['rhy_gtr']::public.instrument_slot[],
        array['vocal_4', 'vocal_5']::public.vocal_slot[],
        'Candidate can cover low harmonies and rhythm guitar.'
    )
ON CONFLICT ("id") DO UPDATE
SET
    "user_id" = excluded."user_id",
    "account_role" = excluded."account_role",
    "status" = excluded."status",
    "display_name" = excluded."display_name",
    "legal_name" = excluded."legal_name",
    "email" = excluded."email",
    "role_label" = excluded."role_label",
    "member_type" = excluded."member_type",
    "default_instrument" = excluded."default_instrument",
    "default_vocal_slot" = excluded."default_vocal_slot",
    "instrument_capabilities" = excluded."instrument_capabilities",
    "vocal_capabilities" = excluded."vocal_capabilities",
    "capability_notes" = excluded."capability_notes";

INSERT INTO "public"."songs" (
    "id",
    "account_id",
    "title",
    "original_artist",
    "year_recorded",
    "song_key",
    "bpm",
    "status",
    "duration_sec",
    "notes"
)
VALUES
    ('d5d8c238-53fb-4a4b-91d7-28eccecd0250', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'Don''t Worry Baby', 'The Beach Boys', 1964, 'E', 118, 'learning', 169, 'Seed arrangement for top harmony and bass practice.'),
    ('eb0fca32-0d27-4b88-8650-09d038038258', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'California Girls', 'The Beach Boys', 1965, 'A', 116, 'active', 158, 'Lead guitar/rhythm guitar split for arrangement testing.'),
    ('732590ed-a33f-46ed-8f5f-c1d20dea1af2', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'God Only Knows', 'The Beach Boys', 1966, 'E', 117, 'learning', 173, 'Includes keys; good harmony-stack test song.'),
    ('55b1a590-498e-4e4b-beab-817e60a4251b', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'Help Me, Rhonda', 'The Beach Boys', 1965, 'A', 142, 'active', 167, 'No keys part in this seed arrangement.'),
    ('c5fa050a-d110-4ff3-8591-ac72b9abaa0e', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'Good Vibrations', 'The Beach Boys', 1966, 'Eb', 75, 'candidate', 217, 'Candidate repertoire with keys and dense vocals.')
ON CONFLICT ("id") DO UPDATE
SET
    "title" = excluded."title",
    "original_artist" = excluded."original_artist",
    "year_recorded" = excluded."year_recorded",
    "song_key" = excluded."song_key",
    "bpm" = excluded."bpm",
    "status" = excluded."status",
    "duration_sec" = excluded."duration_sec",
    "notes" = excluded."notes";

INSERT INTO "public"."tags" (
    "id",
    "account_id",
    "display",
    "slug",
    "color"
)
VALUES
    ('b88b23a5-5ca3-4f1f-bb77-3ef0601a71c2', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'Surf Songs', 'surf-songs', 'teal'),
    ('e151d8fe-151a-4bbf-9d3c-8dd8d6d09931', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'Car Songs', 'car-songs', 'coral'),
    ('786f1952-99c8-411e-8de2-bf78bb1545dc', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'Early Songs', 'early-songs', 'gold'),
    ('225d4d67-2b5b-480f-8c42-e43c1de22c51', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'Pet Sounds', 'pet-sounds', 'teal'),
    ('377d29d5-0db5-4a17-8d3d-1f910d8af863', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'Summer Days', 'summer-days', 'gold'),
    ('da4ac50e-7c59-4c78-9d24-6daf845c94fb', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'Smile Era', 'smile-era', 'hibiscus')
ON CONFLICT ("account_id", "slug") DO UPDATE
SET
    "display" = excluded."display",
    "color" = excluded."color";

INSERT INTO "public"."song_tags" (
    "account_id",
    "song_id",
    "tag_id"
)
VALUES
    ('914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'd5d8c238-53fb-4a4b-91d7-28eccecd0250', 'b88b23a5-5ca3-4f1f-bb77-3ef0601a71c2'),
    ('914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'd5d8c238-53fb-4a4b-91d7-28eccecd0250', '786f1952-99c8-411e-8de2-bf78bb1545dc'),
    ('914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'eb0fca32-0d27-4b88-8650-09d038038258', 'b88b23a5-5ca3-4f1f-bb77-3ef0601a71c2'),
    ('914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'eb0fca32-0d27-4b88-8650-09d038038258', '377d29d5-0db5-4a17-8d3d-1f910d8af863'),
    ('914c4883-7fe2-4d99-91a7-8b5c6a07f54d', '732590ed-a33f-46ed-8f5f-c1d20dea1af2', '225d4d67-2b5b-480f-8c42-e43c1de22c51'),
    ('914c4883-7fe2-4d99-91a7-8b5c6a07f54d', '55b1a590-498e-4e4b-beab-817e60a4251b', '786f1952-99c8-411e-8de2-bf78bb1545dc'),
    ('914c4883-7fe2-4d99-91a7-8b5c6a07f54d', '55b1a590-498e-4e4b-beab-817e60a4251b', '377d29d5-0db5-4a17-8d3d-1f910d8af863'),
    ('914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'c5fa050a-d110-4ff3-8591-ac72b9abaa0e', 'da4ac50e-7c59-4c78-9d24-6daf845c94fb')
ON CONFLICT ("account_id", "song_id", "tag_id") DO NOTHING;

INSERT INTO "public"."parts" (
    "id",
    "account_id",
    "song_id",
    "type",
    "slot",
    "label",
    "is_lead",
    "default_member_id",
    "order_index",
    "notes"
)
VALUES
    ('39936027-900d-44b9-abf5-c00ed9adbb2e', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'd5d8c238-53fb-4a4b-91d7-28eccecd0250', 'vocal', 'vocal_1', 'Falsetto top', false, '52484098-96fc-4827-8e61-2576f5483da5', 10, null),
    ('6b08f229-d332-4371-9238-65a05964352e', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'd5d8c238-53fb-4a4b-91d7-28eccecd0250', 'vocal', 'vocal_2', 'Lead vocal', true, 'c00c8c90-250d-476f-a532-1044cf0b141f', 20, null),
    ('c30e7bb7-f86f-4fb5-b56e-e26a520076fc', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'd5d8c238-53fb-4a4b-91d7-28eccecd0250', 'instrumental', 'bass', 'Bass', false, '52484098-96fc-4827-8e61-2576f5483da5', 30, null),
    ('493128d3-4598-4a86-8fc9-f3119673e245', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'd5d8c238-53fb-4a4b-91d7-28eccecd0250', 'instrumental', 'drums', 'Drums', false, 'ef5a956d-3909-4c09-bf32-e40f602cf6c7', 40, null),
    ('e70480e2-7b34-4e8e-8017-5a61b12501ed', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'd5d8c238-53fb-4a4b-91d7-28eccecd0250', 'instrumental', 'rhy_gtr', 'Rhythm guitar', false, 'c00c8c90-250d-476f-a532-1044cf0b141f', 50, null),
    ('4fa525e2-42b0-4334-8ec6-ce0f1afcdced', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'eb0fca32-0d27-4b88-8650-09d038038258', 'vocal', 'vocal_1', 'Top stack', false, '52484098-96fc-4827-8e61-2576f5483da5', 10, null),
    ('8c1ebafb-0c5d-41ae-a174-516235c07f33', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'eb0fca32-0d27-4b88-8650-09d038038258', 'vocal', 'vocal_2', 'Lead vocal', true, 'c00c8c90-250d-476f-a532-1044cf0b141f', 20, null),
    ('6eb65f64-cd01-4395-b266-d1b9e987ba5f', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'eb0fca32-0d27-4b88-8650-09d038038258', 'instrumental', 'lead_gtr', 'Lead guitar', false, 'c00c8c90-250d-476f-a532-1044cf0b141f', 30, null),
    ('5f3d676c-9320-4fe8-af05-6cc85c4734ce', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'eb0fca32-0d27-4b88-8650-09d038038258', 'instrumental', 'rhy_gtr', 'Rhythm guitar', false, '41d46229-abaf-4804-9e7e-2c553ac5fc8b', 40, 'Candidate assignment to exercise candidate rows.'),
    ('d565c761-baac-4cb4-8eab-b12d62e186ca', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'eb0fca32-0d27-4b88-8650-09d038038258', 'instrumental', 'bass', 'Bass', false, '52484098-96fc-4827-8e61-2576f5483da5', 50, null),
    ('dc2c071a-c344-4780-9cfa-8babc837648a', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'eb0fca32-0d27-4b88-8650-09d038038258', 'instrumental', 'drums', 'Drums', false, 'ef5a956d-3909-4c09-bf32-e40f602cf6c7', 60, null),
    ('c2dba89c-5759-4f0c-9fbd-f4d5084cf633', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', '732590ed-a33f-46ed-8f5f-c1d20dea1af2', 'vocal', 'vocal_1', 'High harmony', false, '52484098-96fc-4827-8e61-2576f5483da5', 10, null),
    ('d0a00947-2c8c-4962-999f-873e83f95c4e', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', '732590ed-a33f-46ed-8f5f-c1d20dea1af2', 'vocal', 'vocal_2', 'Lead vocal', true, '6f4d0de6-e193-4347-a9fc-727d35ee5346', 20, null),
    ('39474323-a049-4b59-a7a3-c55786b29d37', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', '732590ed-a33f-46ed-8f5f-c1d20dea1af2', 'instrumental', 'keys', 'Keys', false, '6f4d0de6-e193-4347-a9fc-727d35ee5346', 30, null),
    ('1f43f17e-bfc5-456b-8529-5cbd1c06143b', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', '732590ed-a33f-46ed-8f5f-c1d20dea1af2', 'instrumental', 'bass', 'Bass', false, '52484098-96fc-4827-8e61-2576f5483da5', 40, null),
    ('bd914325-e4b3-4b0e-bba3-8e930aa35849', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', '732590ed-a33f-46ed-8f5f-c1d20dea1af2', 'instrumental', 'drums', 'Drums', false, 'ef5a956d-3909-4c09-bf32-e40f602cf6c7', 50, null),
    ('8c85f2df-bb59-4f0f-9385-95d42c67ec8b', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', '55b1a590-498e-4e4b-beab-817e60a4251b', 'vocal', 'vocal_1', 'Top harmony', false, '52484098-96fc-4827-8e61-2576f5483da5', 10, null),
    ('56992a12-550f-4598-89fb-abb9d2911518', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', '55b1a590-498e-4e4b-beab-817e60a4251b', 'vocal', 'vocal_2', 'Lead vocal', true, 'c00c8c90-250d-476f-a532-1044cf0b141f', 20, null),
    ('23da04ac-347d-43e4-9458-60d10c4a86c6', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', '55b1a590-498e-4e4b-beab-817e60a4251b', 'instrumental', 'lead_gtr', 'Lead guitar', false, 'c00c8c90-250d-476f-a532-1044cf0b141f', 30, null),
    ('98e44042-8f6a-4d89-af69-46ca9db25867', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', '55b1a590-498e-4e4b-beab-817e60a4251b', 'instrumental', 'rhy_gtr', 'Rhythm guitar', false, '41d46229-abaf-4804-9e7e-2c553ac5fc8b', 40, null),
    ('cc669831-7795-4eaf-b6e7-806b7add62f7', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', '55b1a590-498e-4e4b-beab-817e60a4251b', 'instrumental', 'bass', 'Bass', false, '52484098-96fc-4827-8e61-2576f5483da5', 50, null),
    ('95aa171c-7d17-412e-bb4b-b822c9f573de', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', '55b1a590-498e-4e4b-beab-817e60a4251b', 'instrumental', 'drums', 'Drums', false, 'ef5a956d-3909-4c09-bf32-e40f602cf6c7', 60, null),
    ('a06f6c2f-ec48-430d-9824-2027b051136a', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'c5fa050a-d110-4ff3-8591-ac72b9abaa0e', 'vocal', 'vocal_1', 'Theremin-like top', false, '52484098-96fc-4827-8e61-2576f5483da5', 10, null),
    ('9b860434-a82a-4056-8b83-efb062c7b519', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'c5fa050a-d110-4ff3-8591-ac72b9abaa0e', 'vocal', 'vocal_2', 'Lead vocal', true, '6f4d0de6-e193-4347-a9fc-727d35ee5346', 20, null),
    ('43cd9332-72f0-41cb-981d-4982b94928bd', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'c5fa050a-d110-4ff3-8591-ac72b9abaa0e', 'instrumental', 'keys', 'Keys', false, '6f4d0de6-e193-4347-a9fc-727d35ee5346', 30, null),
    ('2db811dc-9f61-4451-a166-0414dfd83451', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'c5fa050a-d110-4ff3-8591-ac72b9abaa0e', 'instrumental', 'bass', 'Bass', false, '52484098-96fc-4827-8e61-2576f5483da5', 40, null),
    ('f425e0fe-29b1-4b3e-a172-f906a6ad7c30', '914c4883-7fe2-4d99-91a7-8b5c6a07f54d', 'c5fa050a-d110-4ff3-8591-ac72b9abaa0e', 'instrumental', 'drums', 'Drums', false, 'ef5a956d-3909-4c09-bf32-e40f602cf6c7', 50, null)
ON CONFLICT ("id") DO UPDATE
SET
    "type" = excluded."type",
    "slot" = excluded."slot",
    "label" = excluded."label",
    "is_lead" = excluded."is_lead",
    "default_member_id" = excluded."default_member_id",
    "order_index" = excluded."order_index",
    "notes" = excluded."notes";

INSERT INTO "public"."part_files" (
    "account_id",
    "part_id",
    "kind",
    "label",
    "storage_path",
    "mime_type",
    "size_bytes",
    "order_index"
)
SELECT
    part_row."account_id",
    part_row."id",
    'guide_audio'::public.part_file_kind,
    coalesce(part_row."label", part_row."slot"::text) || ' guide',
    part_row."account_id"::text || '/parts/' || part_row."id"::text || '/guide.mp3',
    'audio/mpeg',
    2048000,
    0
FROM
    "public"."parts" part_row
WHERE
    part_row."account_id" = '914c4883-7fe2-4d99-91a7-8b5c6a07f54d'
ON CONFLICT ("account_id", "storage_path") DO NOTHING;

INSERT INTO "public"."part_files" (
    "account_id",
    "part_id",
    "kind",
    "label",
    "storage_path",
    "mime_type",
    "size_bytes",
    "order_index"
)
SELECT
    part_row."account_id",
    part_row."id",
    'chart_pdf'::public.part_file_kind,
    coalesce(part_row."label", part_row."slot"::text) || ' chart',
    part_row."account_id"::text || '/parts/' || part_row."id"::text || '/chart.pdf',
    'application/pdf',
    512000,
    1
FROM
    "public"."parts" part_row
WHERE
    part_row."account_id" = '914c4883-7fe2-4d99-91a7-8b5c6a07f54d'
ON CONFLICT ("account_id", "storage_path") DO NOTHING;


--
-- Name: billing_customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."billing_customers_id_seq"', 1, false);


--
-- Name: invitations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."invitations_id_seq"', 19, true);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval(
    '"public"."role_permissions_id_seq"',
    coalesce((select max("id") from "public"."role_permissions"), 1),
    true
);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 19, true);

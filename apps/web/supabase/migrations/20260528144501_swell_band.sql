create type "public"."instrument_slot" as enum ('rhy_gtr', 'lead_gtr', 'keys', 'bass', 'drums');

create type "public"."member_status" as enum ('candidate', 'active', 'inactive', 'alumni');

create type "public"."member_type" as enum ('performer', 'crew');

create type "public"."part_file_kind" as enum ('guide_audio', 'chart_pdf');

create type "public"."part_slot" as enum ('vocal_1', 'vocal_2', 'vocal_3', 'vocal_4', 'vocal_5', 'rhy_gtr', 'lead_gtr', 'keys', 'bass', 'drums');

create type "public"."part_type" as enum ('vocal', 'instrumental');

create type "public"."song_status" as enum ('active', 'learning', 'candidate', 'retired');

create type "public"."vocal_slot" as enum ('vocal_1', 'vocal_2', 'vocal_3', 'vocal_4', 'vocal_5');


  create table "public"."member_private_financial" (
    "member_id" uuid not null,
    "account_id" uuid not null,
    "address" jsonb,
    "billing" jsonb,
    "tax" jsonb,
    "created_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "created_by" uuid,
    "updated_by" uuid
      );


alter table "public"."member_private_financial" enable row level security;


  create table "public"."members" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "account_id" uuid not null,
    "user_id" uuid,
    "account_role" character varying(50) not null default 'member'::character varying,
    "status" public.member_status not null default 'candidate'::public.member_status,
    "display_name" character varying(255) not null,
    "legal_name" character varying(255),
    "email" character varying(320) not null,
    "phone" character varying(50),
    "role_label" character varying(255),
    "bio" character varying(5000),
    "shirt_size" character varying(50),
    "suit_size" character varying(50),
    "shoe_size" character varying(50),
    "member_type" public.member_type not null default 'performer'::public.member_type,
    "default_instrument" public.instrument_slot,
    "default_vocal_slot" public.vocal_slot,
    "instrument_capabilities" public.instrument_slot[] not null default '{}'::public.instrument_slot[],
    "vocal_capabilities" public.vocal_slot[] not null default '{}'::public.vocal_slot[],
    "capability_notes" character varying(5000),
    "photos" jsonb not null default '[]'::jsonb,
    "candidate_notes" character varying(5000),
    "created_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "created_by" uuid,
    "updated_by" uuid
      );


alter table "public"."members" enable row level security;


  create table "public"."part_files" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "account_id" uuid not null,
    "part_id" uuid not null,
    "kind" public.part_file_kind not null,
    "label" character varying(255) not null,
    "storage_path" character varying(1000) not null,
    "mime_type" character varying(120) not null,
    "size_bytes" bigint,
    "order_index" integer not null default 0,
    "created_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "created_by" uuid,
    "updated_by" uuid
      );


alter table "public"."part_files" enable row level security;


  create table "public"."parts" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "account_id" uuid not null,
    "song_id" uuid not null,
    "type" public.part_type not null,
    "slot" public.part_slot not null,
    "label" character varying(255),
    "is_lead" boolean not null default false,
    "default_member_id" uuid,
    "order_index" integer not null default 0,
    "notes" character varying(5000),
    "created_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "created_by" uuid,
    "updated_by" uuid
      );


alter table "public"."parts" enable row level security;


  create table "public"."songs" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "account_id" uuid not null,
    "title" character varying(255) not null,
    "original_artist" character varying(255) default 'The Beach Boys'::character varying,
    "year_recorded" integer,
    "song_key" character varying(24),
    "bpm" integer,
    "era" character varying(120),
    "status" public.song_status not null default 'learning'::public.song_status,
    "duration_sec" integer,
    "notes" character varying(5000),
    "created_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone not null default CURRENT_TIMESTAMP,
    "created_by" uuid,
    "updated_by" uuid
      );


alter table "public"."songs" enable row level security;

CREATE INDEX ix_members_account_status_display_name ON public.members USING btree (account_id, status, display_name);

CREATE INDEX ix_members_account_user_id ON public.members USING btree (account_id, user_id);

CREATE INDEX ix_members_instrument_capabilities ON public.members USING gin (instrument_capabilities);

CREATE INDEX ix_members_vocal_capabilities ON public.members USING gin (vocal_capabilities);

CREATE INDEX ix_part_files_part_kind_order ON public.part_files USING btree (part_id, kind, order_index);

CREATE INDEX ix_parts_account_default_member_song_order ON public.parts USING btree (account_id, default_member_id, song_id, order_index);

CREATE INDEX ix_parts_song_order ON public.parts USING btree (song_id, order_index);

CREATE INDEX ix_songs_account_status_title ON public.songs USING btree (account_id, status, title);

CREATE UNIQUE INDEX member_private_financial_account_id_member_id_key ON public.member_private_financial USING btree (account_id, member_id);

CREATE UNIQUE INDEX member_private_financial_pkey ON public.member_private_financial USING btree (member_id);

CREATE UNIQUE INDEX members_account_id_id_key ON public.members USING btree (account_id, id);

CREATE UNIQUE INDEX members_account_id_user_id_key ON public.members USING btree (account_id, user_id);

CREATE UNIQUE INDEX members_pkey ON public.members USING btree (id);

CREATE UNIQUE INDEX part_files_account_id_id_key ON public.part_files USING btree (account_id, id);

CREATE UNIQUE INDEX part_files_account_id_storage_path_key ON public.part_files USING btree (account_id, storage_path);

CREATE UNIQUE INDEX part_files_pkey ON public.part_files USING btree (id);

CREATE UNIQUE INDEX parts_account_id_id_key ON public.parts USING btree (account_id, id);

CREATE UNIQUE INDEX parts_pkey ON public.parts USING btree (id);

CREATE UNIQUE INDEX songs_account_id_id_key ON public.songs USING btree (account_id, id);

CREATE UNIQUE INDEX songs_pkey ON public.songs USING btree (id);

alter table "public"."member_private_financial" add constraint "member_private_financial_pkey" PRIMARY KEY using index "member_private_financial_pkey";

alter table "public"."members" add constraint "members_pkey" PRIMARY KEY using index "members_pkey";

alter table "public"."part_files" add constraint "part_files_pkey" PRIMARY KEY using index "part_files_pkey";

alter table "public"."parts" add constraint "parts_pkey" PRIMARY KEY using index "parts_pkey";

alter table "public"."songs" add constraint "songs_pkey" PRIMARY KEY using index "songs_pkey";

alter table "public"."member_private_financial" add constraint "member_private_financial_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."member_private_financial" validate constraint "member_private_financial_account_id_fkey";

alter table "public"."member_private_financial" add constraint "member_private_financial_account_id_member_id_fkey" FOREIGN KEY (account_id, member_id) REFERENCES public.members(account_id, id) ON DELETE CASCADE not valid;

alter table "public"."member_private_financial" validate constraint "member_private_financial_account_id_member_id_fkey";

alter table "public"."member_private_financial" add constraint "member_private_financial_account_id_member_id_key" UNIQUE using index "member_private_financial_account_id_member_id_key";

alter table "public"."member_private_financial" add constraint "member_private_financial_address_check" CHECK (((address IS NULL) OR (jsonb_typeof(address) = 'object'::text))) not valid;

alter table "public"."member_private_financial" validate constraint "member_private_financial_address_check";

alter table "public"."member_private_financial" add constraint "member_private_financial_billing_check" CHECK (((billing IS NULL) OR (jsonb_typeof(billing) = 'object'::text))) not valid;

alter table "public"."member_private_financial" validate constraint "member_private_financial_billing_check";

alter table "public"."member_private_financial" add constraint "member_private_financial_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."member_private_financial" validate constraint "member_private_financial_created_by_fkey";

alter table "public"."member_private_financial" add constraint "member_private_financial_tax_check" CHECK (((tax IS NULL) OR (jsonb_typeof(tax) = 'object'::text))) not valid;

alter table "public"."member_private_financial" validate constraint "member_private_financial_tax_check";

alter table "public"."member_private_financial" add constraint "member_private_financial_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."member_private_financial" validate constraint "member_private_financial_updated_by_fkey";

alter table "public"."members" add constraint "members_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."members" validate constraint "members_account_id_fkey";

alter table "public"."members" add constraint "members_account_id_id_key" UNIQUE using index "members_account_id_id_key";

alter table "public"."members" add constraint "members_account_id_user_id_key" UNIQUE using index "members_account_id_user_id_key";

alter table "public"."members" add constraint "members_account_role_fkey" FOREIGN KEY (account_role) REFERENCES public.roles(name) not valid;

alter table "public"."members" validate constraint "members_account_role_fkey";

alter table "public"."members" add constraint "members_check" CHECK (((default_instrument IS NULL) OR (default_instrument = ANY (instrument_capabilities)))) not valid;

alter table "public"."members" validate constraint "members_check";

alter table "public"."members" add constraint "members_check1" CHECK (((default_vocal_slot IS NULL) OR (default_vocal_slot = ANY (vocal_capabilities)))) not valid;

alter table "public"."members" validate constraint "members_check1";

alter table "public"."members" add constraint "members_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."members" validate constraint "members_created_by_fkey";

alter table "public"."members" add constraint "members_display_name_check" CHECK ((length(TRIM(BOTH FROM display_name)) > 0)) not valid;

alter table "public"."members" validate constraint "members_display_name_check";

alter table "public"."members" add constraint "members_email_check" CHECK ((POSITION(('@'::text) IN (email)) > 1)) not valid;

alter table "public"."members" validate constraint "members_email_check";

alter table "public"."members" add constraint "members_photos_check" CHECK ((jsonb_typeof(photos) = 'array'::text)) not valid;

alter table "public"."members" validate constraint "members_photos_check";

alter table "public"."members" add constraint "members_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."members" validate constraint "members_updated_by_fkey";

alter table "public"."members" add constraint "members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."members" validate constraint "members_user_id_fkey";

alter table "public"."part_files" add constraint "part_files_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."part_files" validate constraint "part_files_account_id_fkey";

alter table "public"."part_files" add constraint "part_files_account_id_id_key" UNIQUE using index "part_files_account_id_id_key";

alter table "public"."part_files" add constraint "part_files_account_id_part_id_fkey" FOREIGN KEY (account_id, part_id) REFERENCES public.parts(account_id, id) ON DELETE CASCADE not valid;

alter table "public"."part_files" validate constraint "part_files_account_id_part_id_fkey";

alter table "public"."part_files" add constraint "part_files_account_id_storage_path_key" UNIQUE using index "part_files_account_id_storage_path_key";

alter table "public"."part_files" add constraint "part_files_check" CHECK ((((kind = 'guide_audio'::public.part_file_kind) AND ((mime_type)::text = ANY ((ARRAY['audio/mpeg'::character varying, 'audio/mp3'::character varying])::text[]))) OR ((kind = 'chart_pdf'::public.part_file_kind) AND ((mime_type)::text = 'application/pdf'::text)))) not valid;

alter table "public"."part_files" validate constraint "part_files_check";

alter table "public"."part_files" add constraint "part_files_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."part_files" validate constraint "part_files_created_by_fkey";

alter table "public"."part_files" add constraint "part_files_label_check" CHECK ((length(TRIM(BOTH FROM label)) > 0)) not valid;

alter table "public"."part_files" validate constraint "part_files_label_check";

alter table "public"."part_files" add constraint "part_files_order_index_check" CHECK ((order_index >= 0)) not valid;

alter table "public"."part_files" validate constraint "part_files_order_index_check";

alter table "public"."part_files" add constraint "part_files_size_bytes_check" CHECK (((size_bytes IS NULL) OR (size_bytes > 0))) not valid;

alter table "public"."part_files" validate constraint "part_files_size_bytes_check";

alter table "public"."part_files" add constraint "part_files_storage_path_check" CHECK ((length(TRIM(BOTH FROM storage_path)) > 0)) not valid;

alter table "public"."part_files" validate constraint "part_files_storage_path_check";

alter table "public"."part_files" add constraint "part_files_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."part_files" validate constraint "part_files_updated_by_fkey";

alter table "public"."parts" add constraint "parts_account_id_default_member_id_fkey" FOREIGN KEY (account_id, default_member_id) REFERENCES public.members(account_id, id) ON DELETE SET NULL not valid;

alter table "public"."parts" validate constraint "parts_account_id_default_member_id_fkey";

alter table "public"."parts" add constraint "parts_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."parts" validate constraint "parts_account_id_fkey";

alter table "public"."parts" add constraint "parts_account_id_id_key" UNIQUE using index "parts_account_id_id_key";

alter table "public"."parts" add constraint "parts_account_id_song_id_fkey" FOREIGN KEY (account_id, song_id) REFERENCES public.songs(account_id, id) ON DELETE CASCADE not valid;

alter table "public"."parts" validate constraint "parts_account_id_song_id_fkey";

alter table "public"."parts" add constraint "parts_check" CHECK ((((type = 'vocal'::public.part_type) AND (slot = ANY (ARRAY['vocal_1'::public.part_slot, 'vocal_2'::public.part_slot, 'vocal_3'::public.part_slot, 'vocal_4'::public.part_slot, 'vocal_5'::public.part_slot]))) OR ((type = 'instrumental'::public.part_type) AND (slot = ANY (ARRAY['rhy_gtr'::public.part_slot, 'lead_gtr'::public.part_slot, 'keys'::public.part_slot, 'bass'::public.part_slot, 'drums'::public.part_slot]))))) not valid;

alter table "public"."parts" validate constraint "parts_check";

alter table "public"."parts" add constraint "parts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."parts" validate constraint "parts_created_by_fkey";

alter table "public"."parts" add constraint "parts_order_index_check" CHECK ((order_index >= 0)) not valid;

alter table "public"."parts" validate constraint "parts_order_index_check";

alter table "public"."parts" add constraint "parts_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."parts" validate constraint "parts_updated_by_fkey";

alter table "public"."songs" add constraint "songs_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE not valid;

alter table "public"."songs" validate constraint "songs_account_id_fkey";

alter table "public"."songs" add constraint "songs_account_id_id_key" UNIQUE using index "songs_account_id_id_key";

alter table "public"."songs" add constraint "songs_bpm_check" CHECK (((bpm IS NULL) OR ((bpm >= 1) AND (bpm <= 400)))) not valid;

alter table "public"."songs" validate constraint "songs_bpm_check";

alter table "public"."songs" add constraint "songs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."songs" validate constraint "songs_created_by_fkey";

alter table "public"."songs" add constraint "songs_duration_sec_check" CHECK (((duration_sec IS NULL) OR (duration_sec > 0))) not valid;

alter table "public"."songs" validate constraint "songs_duration_sec_check";

alter table "public"."songs" add constraint "songs_title_check" CHECK ((length(TRIM(BOTH FROM title)) > 0)) not valid;

alter table "public"."songs" validate constraint "songs_title_check";

alter table "public"."songs" add constraint "songs_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."songs" validate constraint "songs_updated_by_fkey";

alter table "public"."songs" add constraint "songs_year_recorded_check" CHECK (((year_recorded IS NULL) OR ((year_recorded >= 1900) AND (year_recorded <= 2100)))) not valid;

alter table "public"."songs" validate constraint "songs_year_recorded_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION kit.get_storage_object_account_id(name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
    folder_names text[];
begin
    folder_names := storage.foldername(name);

    if array_length(folder_names, 1) < 1 then
      return null;
    end if;

    return folder_names[1]::uuid;
exception
    when invalid_text_representation then
      return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION kit.protect_member_owner_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    if current_user = 'authenticated'
      and not public.has_role_on_account(old.account_id, 'owner')
    then
      if new.account_id <> old.account_id
        or new.user_id is distinct from old.user_id
        or new.account_role <> old.account_role
        or new.status <> old.status
        or new.default_instrument is distinct from old.default_instrument
        or new.default_vocal_slot is distinct from old.default_vocal_slot
        or new.instrument_capabilities is distinct from old.instrument_capabilities
        or new.vocal_capabilities is distinct from old.vocal_capabilities
        or new.capability_notes is distinct from old.capability_notes
        or new.candidate_notes is distinct from old.candidate_notes
      then
        raise exception 'Only owners can update member-managed fields';
      end if;
    end if;

    return new;
end;
$function$
;

insert into storage.buckets (id, name, public)
values ('band_assets', 'band_assets', false)
on conflict (id) do update
set public = excluded.public;

grant execute on function kit.get_storage_object_account_id(text) to authenticated, service_role;

grant delete on table "public"."member_private_financial" to "anon";

grant insert on table "public"."member_private_financial" to "anon";

grant references on table "public"."member_private_financial" to "anon";

grant select on table "public"."member_private_financial" to "anon";

grant trigger on table "public"."member_private_financial" to "anon";

grant truncate on table "public"."member_private_financial" to "anon";

grant update on table "public"."member_private_financial" to "anon";

grant delete on table "public"."member_private_financial" to "authenticated";

grant insert on table "public"."member_private_financial" to "authenticated";

grant select on table "public"."member_private_financial" to "authenticated";

grant update on table "public"."member_private_financial" to "authenticated";

grant delete on table "public"."member_private_financial" to "service_role";

grant insert on table "public"."member_private_financial" to "service_role";

grant select on table "public"."member_private_financial" to "service_role";

grant update on table "public"."member_private_financial" to "service_role";

grant delete on table "public"."members" to "anon";

grant insert on table "public"."members" to "anon";

grant references on table "public"."members" to "anon";

grant select on table "public"."members" to "anon";

grant trigger on table "public"."members" to "anon";

grant truncate on table "public"."members" to "anon";

grant update on table "public"."members" to "anon";

grant delete on table "public"."members" to "authenticated";

grant insert on table "public"."members" to "authenticated";

grant select on table "public"."members" to "authenticated";

grant update on table "public"."members" to "authenticated";

grant delete on table "public"."members" to "service_role";

grant insert on table "public"."members" to "service_role";

grant select on table "public"."members" to "service_role";

grant update on table "public"."members" to "service_role";

grant delete on table "public"."part_files" to "anon";

grant insert on table "public"."part_files" to "anon";

grant references on table "public"."part_files" to "anon";

grant select on table "public"."part_files" to "anon";

grant trigger on table "public"."part_files" to "anon";

grant truncate on table "public"."part_files" to "anon";

grant update on table "public"."part_files" to "anon";

grant delete on table "public"."part_files" to "authenticated";

grant insert on table "public"."part_files" to "authenticated";

grant select on table "public"."part_files" to "authenticated";

grant update on table "public"."part_files" to "authenticated";

grant delete on table "public"."part_files" to "service_role";

grant insert on table "public"."part_files" to "service_role";

grant select on table "public"."part_files" to "service_role";

grant update on table "public"."part_files" to "service_role";

grant delete on table "public"."parts" to "anon";

grant insert on table "public"."parts" to "anon";

grant references on table "public"."parts" to "anon";

grant select on table "public"."parts" to "anon";

grant trigger on table "public"."parts" to "anon";

grant truncate on table "public"."parts" to "anon";

grant update on table "public"."parts" to "anon";

grant delete on table "public"."parts" to "authenticated";

grant insert on table "public"."parts" to "authenticated";

grant select on table "public"."parts" to "authenticated";

grant update on table "public"."parts" to "authenticated";

grant delete on table "public"."parts" to "service_role";

grant insert on table "public"."parts" to "service_role";

grant select on table "public"."parts" to "service_role";

grant update on table "public"."parts" to "service_role";

grant delete on table "public"."songs" to "anon";

grant insert on table "public"."songs" to "anon";

grant references on table "public"."songs" to "anon";

grant select on table "public"."songs" to "anon";

grant trigger on table "public"."songs" to "anon";

grant truncate on table "public"."songs" to "anon";

grant update on table "public"."songs" to "anon";

grant delete on table "public"."songs" to "authenticated";

grant insert on table "public"."songs" to "authenticated";

grant select on table "public"."songs" to "authenticated";

grant update on table "public"."songs" to "authenticated";

grant delete on table "public"."songs" to "service_role";

grant insert on table "public"."songs" to "service_role";

grant select on table "public"."songs" to "service_role";

grant update on table "public"."songs" to "service_role";

revoke all on table "public"."member_private_financial" from "anon";

revoke all on table "public"."members" from "anon";

revoke all on table "public"."part_files" from "anon";

revoke all on table "public"."parts" from "anon";

revoke all on table "public"."songs" from "anon";


  create policy "member_private_financial_read"
  on "public"."member_private_financial"
  as permissive
  for select
  to authenticated
using ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.members member_row
  WHERE ((member_row.id = member_private_financial.member_id) AND (member_row.account_id = member_private_financial.account_id) AND (member_row.user_id = ( SELECT auth.uid() AS uid)))))));



  create policy "member_private_financial_write"
  on "public"."member_private_financial"
  as permissive
  for all
  to authenticated
using ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.members member_row
  WHERE ((member_row.id = member_private_financial.member_id) AND (member_row.account_id = member_private_financial.account_id) AND (member_row.user_id = ( SELECT auth.uid() AS uid)))))))
with check ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin() OR (EXISTS ( SELECT 1
   FROM public.members member_row
  WHERE ((member_row.id = member_private_financial.member_id) AND (member_row.account_id = member_private_financial.account_id) AND (member_row.user_id = ( SELECT auth.uid() AS uid)))))));



  create policy "members_owner_delete"
  on "public"."members"
  as permissive
  for delete
  to authenticated
using ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()));



  create policy "members_owner_insert"
  on "public"."members"
  as permissive
  for insert
  to authenticated
with check ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()));



  create policy "members_owner_update"
  on "public"."members"
  as permissive
  for update
  to authenticated
using ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()))
with check ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()));



  create policy "members_read"
  on "public"."members"
  as permissive
  for select
  to authenticated
using ((public.has_role_on_account(account_id) OR public.is_super_admin()));



  create policy "members_self_update"
  on "public"."members"
  as permissive
  for update
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)))
with check ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "part_files_owner_delete"
  on "public"."part_files"
  as permissive
  for delete
  to authenticated
using ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()));



  create policy "part_files_owner_insert"
  on "public"."part_files"
  as permissive
  for insert
  to authenticated
with check ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()));



  create policy "part_files_owner_update"
  on "public"."part_files"
  as permissive
  for update
  to authenticated
using ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()))
with check ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()));



  create policy "part_files_read"
  on "public"."part_files"
  as permissive
  for select
  to authenticated
using ((public.has_role_on_account(account_id) OR public.is_super_admin()));



  create policy "parts_owner_delete"
  on "public"."parts"
  as permissive
  for delete
  to authenticated
using ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()));



  create policy "parts_owner_insert"
  on "public"."parts"
  as permissive
  for insert
  to authenticated
with check ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()));



  create policy "parts_owner_update"
  on "public"."parts"
  as permissive
  for update
  to authenticated
using ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()))
with check ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()));



  create policy "parts_read"
  on "public"."parts"
  as permissive
  for select
  to authenticated
using ((public.has_role_on_account(account_id) OR public.is_super_admin()));



  create policy "songs_owner_delete"
  on "public"."songs"
  as permissive
  for delete
  to authenticated
using ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()));



  create policy "songs_owner_insert"
  on "public"."songs"
  as permissive
  for insert
  to authenticated
with check ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()));



  create policy "songs_owner_update"
  on "public"."songs"
  as permissive
  for update
  to authenticated
using ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()))
with check ((public.has_role_on_account(account_id, 'owner'::character varying) OR public.is_super_admin()));



  create policy "songs_read"
  on "public"."songs"
  as permissive
  for select
  to authenticated
using ((public.has_role_on_account(account_id) OR public.is_super_admin()));


CREATE TRIGGER member_private_financial_set_timestamps BEFORE INSERT OR UPDATE ON public.member_private_financial FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER member_private_financial_set_user_tracking BEFORE INSERT OR UPDATE ON public.member_private_financial FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER members_set_timestamps BEFORE INSERT OR UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER members_set_user_tracking BEFORE INSERT OR UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER protect_member_owner_fields BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION kit.protect_member_owner_fields();

CREATE TRIGGER part_files_set_timestamps BEFORE INSERT OR UPDATE ON public.part_files FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER part_files_set_user_tracking BEFORE INSERT OR UPDATE ON public.part_files FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER parts_set_timestamps BEFORE INSERT OR UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER parts_set_user_tracking BEFORE INSERT OR UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();

CREATE TRIGGER songs_set_timestamps BEFORE INSERT OR UPDATE ON public.songs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamps();

CREATE TRIGGER songs_set_user_tracking BEFORE INSERT OR UPDATE ON public.songs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_user_tracking();


  create policy "band_assets_owner_delete"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'band_assets'::text) AND (public.has_role_on_account(kit.get_storage_object_account_id(name), 'owner'::character varying) OR public.is_super_admin())));



  create policy "band_assets_owner_insert"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'band_assets'::text) AND (public.has_role_on_account(kit.get_storage_object_account_id(name), 'owner'::character varying) OR public.is_super_admin())));



  create policy "band_assets_owner_update"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'band_assets'::text) AND (public.has_role_on_account(kit.get_storage_object_account_id(name), 'owner'::character varying) OR public.is_super_admin())))
with check (((bucket_id = 'band_assets'::text) AND (public.has_role_on_account(kit.get_storage_object_account_id(name), 'owner'::character varying) OR public.is_super_admin())));



  create policy "band_assets_read"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'band_assets'::text) AND (public.has_role_on_account(kit.get_storage_object_account_id(name)) OR public.is_super_admin())));


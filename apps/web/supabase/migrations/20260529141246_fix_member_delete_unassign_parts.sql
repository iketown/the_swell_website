alter table "public"."parts"
drop constraint if exists "parts_account_id_default_member_id_fkey";

alter table "public"."parts"
add constraint "parts_account_id_default_member_id_fkey"
foreign key ("account_id", "default_member_id")
references "public"."members" ("account_id", "id")
on delete set null ("default_member_id")
not valid;

alter table "public"."parts"
validate constraint "parts_account_id_default_member_id_fkey";

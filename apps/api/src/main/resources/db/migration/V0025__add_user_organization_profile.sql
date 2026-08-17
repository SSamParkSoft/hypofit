alter table app_users
  add column organization_type varchar(20),
  add column organization_name varchar(100);

alter table app_users
  add constraint ck_app_users_organization_type
    check (organization_type is null or organization_type in ('team', 'company')),
  add constraint ck_app_users_organization_pair
    check (
      (organization_type is null and organization_name is null)
      or (
        organization_type is not null
        and organization_name is not null
        and btrim(organization_name) <> ''
      )
    );

update app_users u
set organization_type = 'team',
    organization_name = btrim(fp.team_name)
from founder_profiles fp
where fp.user_id = u.id
  and fp.team_name is not null
  and btrim(fp.team_name) <> '';

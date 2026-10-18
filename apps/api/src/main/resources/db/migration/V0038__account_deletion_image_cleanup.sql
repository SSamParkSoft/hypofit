alter table account_deletion_requests
    add column pending_profile_image_path varchar(500);

-- Only newly completed deletions can supply a known path. Do not infer historical paths.
-- Clear this operational reference after Storage confirms deletion or absence.

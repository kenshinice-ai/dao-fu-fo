BEGIN;

ALTER TABLE museum.review_checks
  DROP CONSTRAINT review_checks_status_check,
  ADD CONSTRAINT review_checks_status_check
    CHECK (status IN ('pending', 'pre_reviewed', 'passed', 'failed', 'waived'));

COMMIT;

ALTER TABLE study_groups
ADD COLUMN is_open INTEGER NOT NULL DEFAULT 1 CHECK (is_open IN (0, 1));

CREATE TABLE memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  study_group_id INTEGER NOT NULL,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (study_group_id) REFERENCES study_groups(id),
  UNIQUE (student_id, study_group_id)
);

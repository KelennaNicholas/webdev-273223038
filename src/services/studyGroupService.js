import { getDb } from '../db/database.js';

export class StudyGroupError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StudyGroupError';
    this.code = code;
  }
}

export function getAllStudyGroups() {
  const db = getDb();
  const stmt = db.prepare('SELECT id, name, subject, description FROM study_groups');
  return stmt.all();
}

export function getStudentStudyGroups(userId, database = getDb()) {
  return database.prepare(`
    SELECT groups.id, groups.name, groups.subject, groups.description
    FROM memberships
    JOIN study_groups AS groups ON groups.id = memberships.study_group_id
    WHERE memberships.student_id = ?
    ORDER BY groups.id
  `).all(userId);
}

export function joinStudyGroup(userId, groupId, database = getDb()) {
  const group = database.prepare(`
    SELECT id, name, subject, description, is_open
    FROM study_groups
    WHERE id = ?
  `).get(groupId);

  if (!group) {
    throw new StudyGroupError('GROUP_NOT_FOUND', 'Study group not found');
  }

  const existingMembership = database.prepare(`
    SELECT id FROM memberships
    WHERE student_id = ? AND study_group_id = ?
  `).get(userId, groupId);

  if (existingMembership) {
    throw new StudyGroupError('ALREADY_MEMBER', 'Student is already a member of this study group');
  }

  if (!group.is_open) {
    throw new StudyGroupError('GROUP_CLOSED', 'Study group is closed');
  }

  try {
    const result = database.prepare(`
      INSERT INTO memberships (student_id, study_group_id)
      VALUES (?, ?)
    `).run(userId, groupId);
    return { ...group, membershipId: result.lastInsertRowid };
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: memberships.student_id, memberships.study_group_id')) {
      throw new StudyGroupError('ALREADY_MEMBER', 'Student is already a member of this study group');
    }
    throw error;
  }
}

export function updateStudyGroup(userId, groupId, updates, database = getDb()) {
  const group = database.prepare(`
    SELECT id, name, subject, description, creator_id
    FROM study_groups
    WHERE id = ?
  `).get(groupId);

  if (!group) {
    throw new StudyGroupError('GROUP_NOT_FOUND', 'Study group not found');
  }
  if (group.creator_id !== userId) {
    throw new StudyGroupError('FORBIDDEN', 'Only the group creator may update this study group');
  }

  const allowedFields = ['name', 'subject', 'description'];
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw new StudyGroupError('INVALID_UPDATE', 'Provide at least one group field to update');
  }

  const fields = Object.keys(updates);
  if (fields.length === 0 || fields.some((field) => !allowedFields.includes(field))) {
    throw new StudyGroupError('INVALID_UPDATE', 'Provide valid group fields to update');
  }

  const values = fields.map((field) => {
    const value = updates[field];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new StudyGroupError('INVALID_UPDATE', `${field} must be a non-empty string`);
    }
    return value.trim();
  });
  const assignments = fields.map((field) => `${field} = ?`).join(', ');
  database.prepare(`UPDATE study_groups SET ${assignments} WHERE id = ?`).run(...values, groupId);
  return database.prepare(`
    SELECT id, name, subject, description
    FROM study_groups
    WHERE id = ?
  `).get(groupId);
}

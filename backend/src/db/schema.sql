-- ============================================================
-- Online Examination & Proctoring Platform - PostgreSQL Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- Users & Roles ----------
CREATE TYPE user_role AS ENUM ('admin', 'examiner', 'student');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL DEFAULT 'student',
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verify_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    avatar_url      TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- Question Bank ----------
CREATE TYPE question_type AS ENUM ('mcq', 'true_false', 'short_answer', 'coding');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    subject     VARCHAR(100)
);

CREATE TABLE questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    type            question_type NOT NULL,
    difficulty      difficulty_level NOT NULL DEFAULT 'medium',
    statement       TEXT NOT NULL,
    options         JSONB,            -- for mcq: [{id, text}], true_false uses ["True","False"]
    correct_answer  JSONB NOT NULL,   -- mcq: option id(s); true_false: bool; short_answer: text; coding: expected outputs
    marks           NUMERIC(6,2) NOT NULL DEFAULT 1,
    negative_marks  NUMERIC(6,2) NOT NULL DEFAULT 0,
    starter_code    TEXT,             -- coding questions only
    test_cases      JSONB,            -- coding questions only: [{input, expected_output, is_hidden}]
    tags            TEXT[],
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- Exams ----------
CREATE TYPE exam_status AS ENUM ('draft', 'scheduled', 'live', 'completed', 'archived');

CREATE TABLE exams (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    duration_minutes    INTEGER NOT NULL,
    start_time          TIMESTAMP NOT NULL,
    end_time            TIMESTAMP NOT NULL,
    total_marks         NUMERIC(8,2) NOT NULL DEFAULT 0,
    passing_marks       NUMERIC(8,2) NOT NULL DEFAULT 0,
    negative_marking    BOOLEAN NOT NULL DEFAULT FALSE,
    randomize_questions BOOLEAN NOT NULL DEFAULT FALSE,
    fullscreen_required BOOLEAN NOT NULL DEFAULT TRUE,
    proctoring_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    max_tab_switches    INTEGER NOT NULL DEFAULT 3,
    instructions        TEXT,
    status              exam_status NOT NULL DEFAULT 'draft',
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- An exam is built from sections, each section groups questions
CREATE TABLE exam_sections (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id     UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    title       VARCHAR(150) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE exam_questions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id     UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    section_id  UUID REFERENCES exam_sections(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    UNIQUE (exam_id, question_id)
);

-- Which students are eligible / assigned to an exam
CREATE TABLE exam_enrollments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id     UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (exam_id, student_id)
);

-- ---------- Attempts, Answers, Results ----------
CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'auto_submitted', 'evaluated');

CREATE TABLE exam_attempts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    submitted_at    TIMESTAMP,
    status          attempt_status NOT NULL DEFAULT 'in_progress',
    last_heartbeat  TIMESTAMP NOT NULL DEFAULT NOW(),
    tab_switch_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE (exam_id, student_id)
);

CREATE TABLE answers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id      UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    response        JSONB,              -- student's submitted answer
    is_marked_for_review BOOLEAN NOT NULL DEFAULT FALSE,
    is_correct      BOOLEAN,
    marks_awarded   NUMERIC(6,2),
    examiner_feedback TEXT,
    evaluated_by    UUID REFERENCES users(id),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (attempt_id, question_id)
);

CREATE TABLE results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id      UUID NOT NULL UNIQUE REFERENCES exam_attempts(id) ON DELETE CASCADE,
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_score     NUMERIC(8,2) NOT NULL DEFAULT 0,
    max_score       NUMERIC(8,2) NOT NULL DEFAULT 0,
    accuracy        NUMERIC(5,2),
    rank            INTEGER,
    is_pass         BOOLEAN,
    generated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- Proctoring ----------
CREATE TYPE proctoring_event_type AS ENUM (
    'no_face', 'multiple_faces', 'tab_switch', 'window_blur',
    'fullscreen_exit', 'copy_paste', 'connection_lost', 'face_mismatch'
);
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high');

CREATE TABLE proctoring_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id  UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    event_type  proctoring_event_type NOT NULL,
    severity    severity_level NOT NULL DEFAULT 'low',
    snapshot_url TEXT,
    metadata    JSONB,
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- Notifications ----------
CREATE TYPE notification_type AS ENUM ('exam_reminder', 'result_announced', 'proctoring_alert', 'general');

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        notification_type NOT NULL DEFAULT 'general',
    title       VARCHAR(200) NOT NULL,
    message     TEXT,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- Audit Logs ----------
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(150) NOT NULL,
    entity      VARCHAR(100),
    entity_id   UUID,
    metadata    JSONB,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------- Indexes ----------
CREATE INDEX idx_questions_category ON questions(category_id);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX idx_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX idx_attempts_student ON exam_attempts(student_id);
CREATE INDEX idx_answers_attempt ON answers(attempt_id);
CREATE INDEX idx_proctoring_attempt ON proctoring_logs(attempt_id);
CREATE INDEX idx_results_exam ON results(exam_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

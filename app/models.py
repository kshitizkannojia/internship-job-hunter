"""
SQLAlchemy ORM models — mirrors the existing Supabase schema.

Tables: companies, emails, agent_runs, settings
"""

from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import (
    String, Text, Integer, Boolean, DateTime, ForeignKey, JSON, ARRAY,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


# ── Companies ────────────────────────────────────────────────────

class Company(Base):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    website: Mapped[str | None] = mapped_column(String)
    contact_name: Mapped[str | None] = mapped_column(String)
    contact_email: Mapped[str | None] = mapped_column(String)
    contact_title: Mapped[str | None] = mapped_column(String)
    linkedin_url: Mapped[str | None] = mapped_column(String)
    industry: Mapped[str | None] = mapped_column(String)
    location: Mapped[str | None] = mapped_column(String)
    size: Mapped[str | None] = mapped_column(String)
    tech_stack: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    recent_news: Mapped[str | None] = mapped_column(Text)
    role_hint: Mapped[str | None] = mapped_column(String)

    # Pipeline: discovered | verified | emailed | replied | interview | rejected | no_match
    status: Mapped[str] = mapped_column(String, default="discovered")
    source: Mapped[str | None] = mapped_column(String)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    emails: Mapped[list["Email"]] = relationship(back_populates="company", cascade="all, delete-orphan")


# ── Emails ───────────────────────────────────────────────────────

class Email(Base):
    __tablename__ = "emails"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"))

    subject_a: Mapped[str] = mapped_column(String, nullable=False)
    subject_b: Mapped[str | None] = mapped_column(String)
    chosen_subject: Mapped[str | None] = mapped_column(String)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    followup_body: Mapped[str | None] = mapped_column(Text)

    # Lifecycle: draft | approved | sent | opened | replied | bounced | follow_up_sent
    status: Mapped[str] = mapped_column(String, default="draft")
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime)
    replied_at: Mapped[datetime | None] = mapped_column(DateTime)
    followup_sent_at: Mapped[datetime | None] = mapped_column(DateTime)

    gmail_message_id: Mapped[str | None] = mapped_column(String)
    tracking_pixel_id: Mapped[str | None] = mapped_column(String)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    company: Mapped["Company"] = relationship(back_populates="emails")


# ── Agent Runs ───────────────────────────────────────────────────

class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    type: Mapped[str] = mapped_column(String, nullable=False)  # scraper | writer | sender
    status: Mapped[str] = mapped_column(String, default="running")
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    companies_found: Mapped[int] = mapped_column(Integer, default=0)
    emails_written: Mapped[int] = mapped_column(Integer, default=0)
    emails_sent: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    config: Mapped[dict | None] = mapped_column(JSON)


# ── Settings (key-value store) ───────────────────────────────────

class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

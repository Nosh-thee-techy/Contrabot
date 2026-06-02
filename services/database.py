import csv
import os
from pathlib import Path
from typing import Optional

from sqlalchemy import Boolean, Column, Float, Integer, String, Text, create_engine, func
from sqlalchemy.orm import Session, declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://contrabot:contrabot@localhost:5432/contrabot")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


class Facility(Base):
    __tablename__ = "facilities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    district = Column(String(128), nullable=False, index=True)
    country = Column(String(64), nullable=False, default="Kenya")
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    services = Column(Text, nullable=True)
    phone = Column(String(32), nullable=True)


class Outcome(Base):
    __tablename__ = "outcomes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    district = Column(String(128), nullable=False, index=True)
    recommended_method = Column(String(64), nullable=False)
    accepted = Column(Boolean, nullable=False)
    chosen_method = Column(String(64), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(String(32), server_default=func.now())


def init_db() -> None:
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        print(f"Database init skipped: {exc}")


def get_db() -> Session:
    return SessionLocal()


def import_facilities_csv(csv_path: Path, country: str = "Kenya") -> int:
    """Load facilities from CSV: name,district,lat,lng,services,phone"""
    if not csv_path.exists():
        return 0
    db = get_db()
    count = 0
    try:
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                db.add(
                    Facility(
                        name=row.get("name", "").strip(),
                        district=row.get("district", "").strip(),
                        country=country,
                        lat=_float_or_none(row.get("lat")),
                        lng=_float_or_none(row.get("lng")),
                        services=row.get("services", ""),
                        phone=row.get("phone", ""),
                    )
                )
                count += 1
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"Facility import error: {exc}")
    finally:
        db.close()
    return count


def _float_or_none(value: Optional[str]) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None

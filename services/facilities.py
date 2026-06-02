from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from services.database import Facility, Outcome, get_db


def find_nearest_facilities(district: str, limit: int = 3, country: Optional[str] = None) -> list[dict]:
    db: Session = get_db()
    try:
        query = db.query(Facility).filter(Facility.district.ilike(f"%{district}%"))
        if country:
            query = query.filter(Facility.country.ilike(f"%{country}%"))
        facilities = query.limit(limit).all()
        if not facilities:
            facilities = db.query(Facility).limit(limit).all()
        return [
            {
                "name": f.name,
                "district": f.district,
                "country": f.country,
                "phone": f.phone or "N/A",
                "services": f.services or "Family planning",
                "lat": f.lat,
                "lng": f.lng,
            }
            for f in facilities
        ]
    except Exception:
        return _fallback_facilities(district, limit)
    finally:
        db.close()


def _fallback_facilities(district: str, limit: int) -> list[dict]:
    samples = [
        {"name": "Nairobi West Health Centre", "district": "Nairobi", "country": "Kenya", "phone": "+254700000001", "services": "FP, ANC"},
        {"name": "Kampala City Clinic", "district": "Kampala", "country": "Uganda", "phone": "+256700000001", "services": "FP, HIV"},
        {"name": "Kibera Community Dispensary", "district": "Nairobi", "country": "Kenya", "phone": "+254700000002", "services": "FP"},
    ]
    matched = [f for f in samples if district.lower() in f["district"].lower()]
    return (matched or samples)[:limit]


def format_facilities_message(facilities: list[dict], max_chars: int = 160) -> str:
    if not facilities:
        return "No clinics found. Ask your CHW or dial local health line."
    parts = []
    for i, f in enumerate(facilities[:2], 1):
        parts.append(f"{i}.{f['name']} ({f['district']}) {f['phone']}")
    msg = "Nearest clinics: " + " | ".join(parts)
    return msg[:max_chars]


def log_outcome(district: str, recommended_method: str, accepted: bool, chosen_method: Optional[str] = None, notes: Optional[str] = None) -> bool:
    db = get_db()
    try:
        db.add(
            Outcome(
                district=district,
                recommended_method=recommended_method,
                accepted=accepted,
                chosen_method=chosen_method,
                notes=notes,
            )
        )
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False
    finally:
        db.close()


def get_outcome_analytics() -> dict:
    db = get_db()
    try:
        by_method = (
            db.query(Outcome.recommended_method, func.count(Outcome.id))
            .group_by(Outcome.recommended_method)
            .all()
        )
        by_district = (
            db.query(Outcome.district, func.count(Outcome.id))
            .group_by(Outcome.district)
            .all()
        )
        return {
            "by_method": {m: c for m, c in by_method},
            "by_district": {d: c for d, c in by_district},
        }
    except Exception:
        return {"by_method": {}, "by_district": {}}
    finally:
        db.close()

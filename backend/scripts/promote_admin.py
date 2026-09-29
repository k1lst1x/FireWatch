"""Promote an already registered, verified operator account from a local shell.

This intentionally is not an HTTP endpoint: public registration must never grant
privileges based only on a claimed email address.
"""
from __future__ import annotations

import argparse
import asyncio

from sqlalchemy import select

from app.db.models import User, UserRole
from app.db.session import SessionLocal


async def promote(email: str) -> None:
    async with SessionLocal() as session:
        user = (await session.execute(select(User).where(User.email == email.lower()))).scalar_one_or_none()
        if user is None:
            raise SystemExit("No registered user with that email. Register and verify the operator identity first.")
        user.role = UserRole.ADMIN
        await session.commit()
    print(f"Promoted {email.lower()} to administrator.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Promote an existing FireWatch user to administrator")
    parser.add_argument("email")
    args = parser.parse_args()
    asyncio.run(promote(args.email))

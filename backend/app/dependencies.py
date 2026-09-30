#dependencies for the api gateway
#shared Depends(): current_user, db session, http client
#the way of saying: "run this function first, and give me whatever it returns"
from fastapi import Depends, HTTPException, status
#HTTPBearer is a pre-built helper that knows how to read the Authorization: Bear <token> header from an incoming request
#HTTPAuthorizationCredentials is the object it returns after reading that header- it holds the scheme('Bearer') and the raw token string
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
#The type for an async database session.
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.core.auth import decode_token
from app.db.session import get_db
#theSQLAlchemy User model - the  python class that maps to the users table. We need it here to look up the user by ID and also as the return type of the function
from app.db.models import User, UserRole

#called outside the function, so it's created once and reused across all requests.
#it's created once and reused across all requests. -> This instance does one job: when FastAPI calls it as a dependency, it reads the Authorization header from the request and returns a credential object.
#auto_error=False: a missing header returns None instead of raising, so AUTH_REQUIRED decides what happens.
bearer = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer), # before the function runs, FastAPI first runs bearer.
    #bearer reads the Authorization header and returns an HTTPAuthorizationCredentials object.
    db: AsyncSession = Depends(get_db)
    #FastAPI also runs get_db, which opens a database session and yields it. After the request finishes, FastAPI returns to get_db and closes the session
) -> User | None: #User object, or None when auth is optional and no token was sent
    if credentials is None:
        if settings.auth_required:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
        return None
    if credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    user_id = decode_token(credentials.credentials) #Credential is the object bearer returned. It has two attributes: .scheme and .credentials
    try:
        user = await db.get(User, int(user_id)) #db.get(Model, primary_key) is SQLAlchemy's shortcut for fetching one row by its primary key.
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return user


async def require_user(user: User | None = Depends(get_current_user)) -> User | None:
    if user is None and settings.auth_required:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return user


async def require_admin(user: User | None = Depends(require_user)) -> User | None:
    if not settings.auth_required:
        return user
    if user is None or user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator role required")
    return user

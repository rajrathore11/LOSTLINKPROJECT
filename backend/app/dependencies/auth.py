import os
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

supabase_client: Client = None
if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    if SUPABASE_SERVICE_KEY.startswith("sb_publishable_"):
        raise RuntimeError(
            "SUPABASE_SERVICE_KEY must be a Supabase service role key (sb_secret_), not an anon/public key. "
            "Set SUPABASE_SERVICE_KEY in backend/.env."
        )
    supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verifies the Supabase JWT token passed in the Authorization header.
    Returns the user object if valid.
    """
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase credentials are not configured on the backend."
        )
    
    token = credentials.credentials
    try:
        # Verify the user token with Supabase auth
        res = supabase_client.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token."
            )
        return res.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication check failed: {str(e)}"
        )

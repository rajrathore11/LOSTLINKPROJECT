import os
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.dependencies.auth import get_current_user, supabase_client
from app.services.gemini_service import generate_embedding, embedding_health
from app.services.reasoning_service import explain_pair, answer_question

app = FastAPI(
    title="TraceFind API",
    description=(
        "Campus lost & found backend: free embeddings (no paid AI key), "
        "semantic match retrieval and an explainable match-reason service."
    ),
    version="2.0.0",
)

# Enable CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to Vercel domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class ItemCreate(BaseModel):
    type: str = Field(..., description="Must be 'lost' or 'found'")
    title: str
    description: str
    category: str
    location: str
    date_lost_found: datetime
    image_url: Optional[str] = None

class ClaimCreate(BaseModel):
    item_id: str
    message: Optional[str] = None

class ClaimUpdate(BaseModel):
    status: str = Field(..., description="Must be 'approved' or 'rejected'")

# Endpoints

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Lost & Found API!"}

@app.get("/health")
def health_check():
    """Honest health: exposes the embedding provider actually in use."""
    return {
        "status": "ok",
        "service": "tracefind-api",
        "version": "2.0.0",
        "embeddings": embedding_health(),
        "supabase": "connected" if supabase_client else "not-configured",
    }


@app.get("/api/embeddings/debug")
async def embeddings_debug(text: str = Query("black earbuds", max_length=200)):
    """
    Verify that a text produces a real (non-zero) vector.
    Handy during a viva: shows exactly what the matcher stores.
    """
    vec = await generate_embedding(text)
    nonzero = sum(1 for v in vec if abs(v) > 1e-9)
    return {
        "text": text,
        "dim": len(vec),
        "nonzero_dimensions": nonzero,
        "is_zero_vector": nonzero == 0,
        "preview": [round(v, 5) for v in vec[:8]],
    }

@app.post("/api/items", status_code=status.HTTP_201_CREATED)
async def create_item(item_data: ItemCreate, user=Depends(get_current_user)):
    """
    Creates a new lost or found item.
    Automatically generates description vector embedding using Google Gemini.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    if item_data.type not in ["lost", "found"]:
        raise HTTPException(status_code=400, detail="Type must be 'lost' or 'found'")
    
    # Generate a real (non-zero) embedding — see services/gemini_service.py
    embedding = await generate_embedding(f"{item_data.title}: {item_data.description}")
    
    payload = {
        "user_id": user.id,
        "type": item_data.type,
        "title": item_data.title,
        "description": item_data.description,
        "category": item_data.category,
        "location": item_data.location,
        "date_lost_found": item_data.date_lost_found.isoformat(),
        "image_url": item_data.image_url,
        "description_embedding": embedding
    }
    
    try:
        response = supabase_client.table("items").insert(payload).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to insert item")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/items")
async def get_items(
    type: Optional[str] = None,
    category: Optional[str] = None,
    query: Optional[str] = None,
    limit: int = 20
):
    """
    Lists items with optional search. If query is provided,
    performs an AI-driven semantic similarity vector search.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
        
    try:
        # If semantic search query is provided
        if query:
            query_embedding = await generate_embedding(query)
            # Call Supabase PostgreSQL match_items RPC
            response = supabase_client.rpc(
                "match_items",
                {
                    "query_embedding": query_embedding,
                    "match_threshold": 0.3, # lower threshold for broader matching
                    "match_count": limit,
                    "filter_type": type,
                    "filter_category": category
                }
            ).execute()
            return response.data
        
        # Standard filter logic if no search query
        db_query = supabase_client.table("items").select("*").eq("status", "active")
        if type:
            db_query = db_query.eq("type", type)
        if category:
            db_query = db_query.eq("category", category)
            
        response = db_query.order("created_at", desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database search error: {str(e)}")

@app.get("/api/items/my-items")
async def get_my_items(user=Depends(get_current_user)):
    """
    Retrieves all items reported by the current logged-in user.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    try:
        response = supabase_client.table("items").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

@app.get("/api/items/{item_id}")
async def get_item_detail(item_id: str):
    """
    Retrieves detailed information about a single item.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    try:
        response = supabase_client.table("items").select("*, profiles(full_name, email, phone)").eq("id", item_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Item not found")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/items/{item_id}/matches")
async def get_item_matches(item_id: str, threshold: float = 0.4, limit: int = 5, user=Depends(get_current_user)):
    """
    Uses vector embedding match to find potential counterparts.
    If the target item is 'lost', queries 'found' items and vice versa.
    Uses Gemini to explain why the items match.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
        
    try:
        # Get the original item
        item_response = supabase_client.table("items").select("*").eq("id", item_id).execute()
        if not item_response.data:
            raise HTTPException(status_code=404, detail="Item not found")
        
        target_item = item_response.data[0]
        
        # Verify ownership
        if target_item["user_id"] != user.id:
            raise HTTPException(status_code=403, detail="You do not own this listing.")
            
        embedding = target_item["description_embedding"]
        target_type = "found" if target_item["type"] == "lost" else "lost"
        
        # Run match query
        match_response = supabase_client.rpc(
            "match_items",
            {
                "query_embedding": embedding,
                "match_threshold": threshold,
                "match_count": limit,
                "filter_type": target_type,
                "filter_category": None
            }
        ).execute()
        
        matches = match_response.data or []
        
        # Attach a human-readable reason for each candidate (free, no AI key needed)
        for match in matches:
            match["match_reason"] = explain_pair(target_item, match)
        return matches
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching database error: {str(e)}")

@app.post("/api/claims", status_code=status.HTTP_201_CREATED)
async def create_claim(claim: ClaimCreate, user=Depends(get_current_user)):
    """
    Submits a claim for a found item, notifying the owner.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
        
    payload = {
        "item_id": claim.item_id,
        "claimed_by": user.id,
        "message": claim.message,
        "status": "pending"
    }
    try:
        response = supabase_client.table("claims").insert(payload).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Could not create claim. It may already exist.")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database claim error: {str(e)}")

@app.get("/api/claims")
async def get_claims(user=Depends(get_current_user)):
    """
    Retrieves all claims sent or received by the current user.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    try:
        # Claims received (claims on items owned by the current user)
        received_response = supabase_client.table("claims")\
            .select("*, items!inner(*), profiles:claimed_by(full_name, email, phone)")\
            .eq("items.user_id", user.id).execute()
            
        # Claims sent (claims made by the current user on other items)
        sent_response = supabase_client.table("claims")\
            .select("*, items(*)")\
            .eq("claimed_by", user.id).execute()
            
        return {
            "received": received_response.data or [],
            "sent": sent_response.data or []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

@app.put("/api/claims/{claim_id}")
async def update_claim_status(claim_id: str, body: ClaimUpdate, user=Depends(get_current_user)):
    """
    Allows the owner of the item to approve or reject a claim.
    If approved, marks the item status as 'resolved'.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
        
    if body.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'approved' or 'rejected'")
        
    try:
        # Check claim exists and user is owner of the matching item
        claim_response = supabase_client.table("claims")\
            .select("*, items!inner(*)")\
            .eq("id", claim_id).execute()
            
        if not claim_response.data:
            raise HTTPException(status_code=404, detail="Claim not found")
            
        claim = claim_response.data[0]
        item = claim["items"]
        
        if item["user_id"] != user.id:
            raise HTTPException(status_code=403, detail="Unauthorized. You do not own the claimed item.")
            
        # Update claim status
        update_response = supabase_client.table("claims")\
            .update({"status": body.status})\
            .eq("id", claim_id).execute()
            
        # If approved, also mark item as resolved
        if body.status == "approved":
            supabase_client.table("items")\
                .update({"status": "resolved"})\
                .eq("id", item["id"]).execute()
                
        return update_response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claim resolution error: {str(e)}")


class ChatTurn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=800)
    history: Optional[List[ChatTurn]] = None
    item_type: Optional[str] = Field(None, description="Restrict search to 'lost' or 'found'")


@app.post("/api/chat")
async def chat(body: ChatRequest):
    """
    Free assistant endpoint. Answers strictly from the live item table and never
    invents listings. Works with zero API keys (local reasoner), and degrades
    gracefully instead of hanging.
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    try:
        response = (
            supabase_client.table("items")
            .select("id,type,title,description,category,location,date_lost_found,status,created_at")
            .eq("status", "active")
            .order("created_at", desc=True)
            .limit(120)
            .execute()
        )
        items = response.data or []
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Could not load listings: {exc}")

    result = await answer_question(
        question=body.question,
        items=items,
        history=[t.model_dump() for t in (body.history or [])],
        item_type=body.item_type,
    )
    return result

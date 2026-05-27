"""
MemPalace stub — emula a API local do projeto MemPalace
(https://github.com/milla-jovovich/mempalace-Aya-fork) usando ChromaDB local
+ FastAPI. Compatível com o conceito de wings → rooms → drawers e armazenamento
verbatim.

Stub porque:
- Não baixa o repositório completo do MemPalace (300MB embedding model).
- Usa o all-MiniLM-L6-v2 embed (~80MB) pra zero-egress + leveza.
- Implementa o subset de tools que o AISEC precisa: store, recall, list.

Compliance Unisys AI P1.0:
- Zero API calls externas. Embedding 100% local via sentence-transformers.
- Data residency: ChromaDB persistido em volume Docker (/data).
- Audit: cada store retorna ID rastreável.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import chromadb
from chromadb.config import Settings
import hashlib
import time
import os
import uuid

VERSION = "0.1.0-stub"
DATA_DIR = os.environ.get("MEMPALACE_DATA", "/data/chroma")
os.makedirs(DATA_DIR, exist_ok=True)

# Persistent ChromaDB client (zero egress)
client = chromadb.PersistentClient(
    path=DATA_DIR,
    settings=Settings(anonymized_telemetry=False, allow_reset=True),
)

# Default embedding function — all-MiniLM-L6-v2 (chromadb default) lives locally.
# Tem que rodar o image build pra cachear, mas zero egress depois.
app = FastAPI(title="MemPalace Stub for AISEC", version=VERSION)


# ----------------------- Models -----------------------

class StoreRequest(BaseModel):
    content: str = Field(..., description="Texto verbatim a salvar")
    wing: str = Field(..., description="Pessoa ou projeto (ex: matheus, projeto-siaci)")
    room: Optional[str] = Field("default", description="Tópico (ex: hackbot, zekrom-plans, burp-imports)")
    drawer: Optional[str] = Field(None, description="ID do drawer (auto se omitido)")
    tags: Optional[List[str]] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class StoreResponse(BaseModel):
    id: str
    wing: str
    room: str
    drawer: str
    stored_at: float


class RecallRequest(BaseModel):
    query: str
    wing: Optional[str] = None
    room: Optional[str] = None
    top_k: int = 5


class RecallHit(BaseModel):
    id: str
    content: str
    wing: str
    room: str
    drawer: str
    distance: float
    metadata: Dict[str, Any] = {}
    tags: List[str] = []
    stored_at: Optional[float] = None


class RecallResponse(BaseModel):
    query: str
    hits: List[RecallHit]
    total: int


class WingSummary(BaseModel):
    wing: str
    drawer_count: int
    rooms: List[str]


# ----------------------- Helpers -----------------------

def _collection_name(wing: str) -> str:
    # ChromaDB collection names: alphanumeric + . + - + _, 3-63 chars
    safe = "".join(c if c.isalnum() or c in "-._" else "_" for c in wing.lower())[:60]
    if len(safe) < 3:
        safe = "wing_" + safe
    return safe


def _get_or_create_collection(wing: str):
    return client.get_or_create_collection(
        name=_collection_name(wing),
        metadata={"hnsw:space": "cosine", "wing": wing},
    )


# ----------------------- Endpoints -----------------------

@app.get("/")
def root():
    return {"service": "MemPalace stub", "version": VERSION, "data_dir": DATA_DIR}


@app.get("/health")
def health():
    try:
        wings_count = len(client.list_collections())
    except Exception:
        wings_count = -1
    return {"status": "ok", "wings": wings_count, "version": VERSION}


@app.post("/store", response_model=StoreResponse)
def store(req: StoreRequest):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="content vazio")
    coll = _get_or_create_collection(req.wing)
    drawer = req.drawer or str(uuid.uuid4())
    doc_id = hashlib.sha256(f"{req.wing}|{req.room}|{drawer}|{req.content[:200]}".encode()).hexdigest()[:24]
    stored_at = time.time()
    metadata = {
        "wing": req.wing,
        "room": req.room or "default",
        "drawer": drawer,
        "stored_at": stored_at,
        "tags_csv": ",".join(req.tags or []),
        **{f"meta_{k}": str(v) for k, v in (req.metadata or {}).items()},
    }
    coll.upsert(ids=[doc_id], documents=[req.content], metadatas=[metadata])
    return StoreResponse(
        id=doc_id, wing=req.wing, room=req.room or "default",
        drawer=drawer, stored_at=stored_at,
    )


@app.post("/recall", response_model=RecallResponse)
def recall(req: RecallRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="query vazia")

    # If a wing is specified, search just that collection.
    # Otherwise scan all collections and merge.
    target_collections = []
    if req.wing:
        try:
            target_collections.append(_get_or_create_collection(req.wing))
        except Exception:
            pass
    else:
        target_collections = [client.get_collection(c.name) for c in client.list_collections()]

    where: Dict[str, Any] = {}
    if req.room:
        where["room"] = req.room

    all_hits: List[RecallHit] = []
    for coll in target_collections:
        try:
            r = coll.query(
                query_texts=[req.query],
                n_results=min(req.top_k * 2, 20),
                where=where or None,
            )
            ids = r.get("ids", [[]])[0]
            docs = r.get("documents", [[]])[0]
            metas = r.get("metadatas", [[]])[0]
            dists = r.get("distances", [[]])[0]
            for i, doc_id in enumerate(ids):
                meta = metas[i] or {}
                tags_csv = meta.get("tags_csv", "")
                tags = [t for t in tags_csv.split(",") if t] if tags_csv else []
                all_hits.append(RecallHit(
                    id=doc_id,
                    content=docs[i],
                    wing=meta.get("wing", "?"),
                    room=meta.get("room", "default"),
                    drawer=meta.get("drawer", "?"),
                    distance=float(dists[i]) if dists and i < len(dists) else 0.0,
                    metadata={k.replace("meta_", ""): v for k, v in meta.items() if k.startswith("meta_")},
                    tags=tags,
                    stored_at=meta.get("stored_at"),
                ))
        except Exception:
            continue

    all_hits.sort(key=lambda h: h.distance)
    hits = all_hits[: req.top_k]
    return RecallResponse(query=req.query, hits=hits, total=len(hits))


@app.get("/wings", response_model=List[WingSummary])
def list_wings():
    summaries: List[WingSummary] = []
    for c in client.list_collections():
        try:
            coll = client.get_collection(c.name)
            count = coll.count()
            rooms_set = set()
            if count > 0:
                # Get unique rooms — sample first 100 docs
                sample = coll.get(limit=100)
                for m in sample.get("metadatas", []) or []:
                    if m and "room" in m:
                        rooms_set.add(m["room"])
            summaries.append(WingSummary(
                wing=c.metadata.get("wing", c.name) if c.metadata else c.name,
                drawer_count=count,
                rooms=sorted(rooms_set),
            ))
        except Exception:
            continue
    return summaries


@app.delete("/wing/{wing}")
def delete_wing(wing: str):
    try:
        client.delete_collection(_collection_name(wing))
        return {"ok": True, "wing": wing}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

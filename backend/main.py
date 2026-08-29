from urllib import request

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import re
import models
from typing import Any
from semantic_search import get_semantic_scores
from database import SessionLocal, engine
models.Base.metadata.create_all(bind=engine)
class Product(BaseModel):
    productName: str
    category: str
    subcategory: str | None = None
    description: str
    brand: str | None = None
    price: float
    stock: int
    tags: list[str] | None = None
    attributes: dict[str, Any] | None = None

class ShoppingRequest(BaseModel):
     query: str

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "AgentPass Commerce backend is running"}

@app.post("/products")
def create_product(product: Product):
    db = SessionLocal()

    db_product = models.Product(
        productName=product.productName,
        category=product.category,
        subcategory=product.subcategory,
        description=product.description,
        brand=product.brand,
        price=product.price,
        stock=product.stock,
        tags=product.tags,
        attributes=product.attributes
    )

    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    db.close()

    return {
        "message": "Product saved successfully",
        "product": {
            "id": db_product.id,
            "productName": db_product.productName,
            "category": db_product.category,
            "subcategory": db_product.subcategory,
            "description": db_product.description,
            "brand": db_product.brand,
            "price": db_product.price,
            "stock": db_product.stock,
            "tags": db_product.tags,
            "attributes": db_product.attributes
        }
    }

@app.get("/products")
def get_products():
    db = SessionLocal()

    products = db.query(models.Product).all()

    result = []

    for product in products:
        result.append({
            "id": product.id,
            "productName": product.productName,
            "category": product.category,
            "subcategory": product.subcategory,
            "description": product.description,
            "brand": product.brand,
            "price": product.price,
            "stock": product.stock,
            "tags": product.tags,
            "attributes": product.attributes
        })

    db.close()

    return result
@app.post("/recommend")
def recommend_products(request: ShoppingRequest):
    query = request.query.lower().strip()

    # Extract maximum budget
    budget_match = re.search(
        r"(?:under|below|upto|up to)\s*₹?\s*([\d,]+)",
        query
    )

    max_budget = None

    if budget_match:
        max_budget = float(
            budget_match.group(1).replace(",", "")
        )

    # Words which should not influence product matching
    stop_words = {
        "i",
        "me",
        "my",
        "we",
        "need",
        "want",
        "looking",
        "please",
        "something",
        "that",
        "this",
        "a",
        "an",
        "the",
        "for",
        "with",
        "and",
        "or",
        "of",
        "in",
        "on",
        "at",
        "is",
        "it",
        "to",
        "under",
        "below",
        "upto",
        "up"
    }

    query_terms = [
        term
        for term in re.findall(r"[a-z0-9]+", query)
        if term not in stop_words
    ]

    # Match complete words instead of accidental substrings
    def contains_term(text, term):
        return re.search(
            rf"\b{re.escape(term)}\b",
            text
        ) is not None

    db = SessionLocal()

    products = db.query(models.Product).all()

    # First apply hard constraints
    candidate_products = []

    for product in products:

        # Ignore out-of-stock products
        if product.stock <= 0:
            continue

        # Respect customer's budget
        if (
            max_budget is not None
            and product.price > max_budget
        ):
            continue

        candidate_products.append(product)

    # Semantic AI scores
    semantic_scores = get_semantic_scores(
        request.query,
        candidate_products
    )

    ranked_products = []

    for product in candidate_products:

        name_text = (
            product.productName or ""
        ).lower()

        category_text = (
            product.category or ""
        ).lower()

        subcategory_text = (
            product.subcategory or ""
        ).lower()

        description_text = (
            product.description or ""
        ).lower()

        brand_text = (
            product.brand or ""
        ).lower()

        tags = product.tags or []

        tags_text = " ".join(
            str(tag)
            for tag in tags
        ).lower()

        attributes = product.attributes or {}

        attributes_text = " ".join(
            f"{key} {value}"
            for key, value in attributes.items()
        ).lower()

        keyword_score = 0
        matched_terms = []

        for term in query_terms:

            term_matched = False

            # Subcategory receives highest keyword weight
            if contains_term(
                subcategory_text,
                term
            ):
                keyword_score += 5
                term_matched = True

            if contains_term(
                category_text,
                term
            ):
                keyword_score += 4
                term_matched = True

            if contains_term(
                tags_text,
                term
            ):
                keyword_score += 4
                term_matched = True

            if contains_term(
                attributes_text,
                term
            ):
                keyword_score += 4
                term_matched = True

            if contains_term(
                name_text,
                term
            ):
                keyword_score += 3
                term_matched = True

            if contains_term(
                description_text,
                term
            ):
                keyword_score += 2
                term_matched = True

            if contains_term(
                brand_text,
                term
            ):
                keyword_score += 2
                term_matched = True

            if term_matched:
                matched_terms.append(term)

        # Bonus when user directly mentions full subcategory
        if (
            product.subcategory
            and product.subcategory.lower() in query
        ):
            keyword_score += 8

        semantic_score = semantic_scores.get(
            product.id,
            0.0
        )

        # Combine traditional matching with semantic AI
        combined_score = (
            keyword_score
            + semantic_score * 20
        )

        # Avoid returning extremely weak matches
        if (
            keyword_score > 0
            or semantic_score >= 0.20
        ):
            ranked_products.append({
                "id": product.id,
                "productName": product.productName,
                "category": product.category,
                "subcategory": product.subcategory,
                "description": product.description,
                "brand": product.brand,
                "price": product.price,
                "stock": product.stock,
                "tags": product.tags,
                "attributes": product.attributes,

                "keyword_score": keyword_score,

                "semantic_score": round(
                    semantic_score,
                    3
                ),

                "match_score": round(
                    combined_score,
                    2
                ),

                "matched_terms": sorted(
                    set(matched_terms)
                )
            })

    db.close()

    ranked_products.sort(
        key=lambda product: (
            -product["match_score"],
            product["price"]
        )
    )

    filtered_products = []

    if ranked_products:
        best_score = ranked_products[0]["match_score"]

        for product in ranked_products:
            if product["match_score"] >= max(
                4.0,
                best_score * 0.45
            ):
                filtered_products.append(product)

    return {
        "query": request.query,
        "max_budget": max_budget,
        "recommendations": filtered_products[:5]
    }
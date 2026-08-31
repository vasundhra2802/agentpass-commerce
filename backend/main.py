from urllib import request

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import re
import models
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
import os
import time
import hmac
import hashlib
import uuid
import razorpay
from typing import Any
from semantic_search import get_semantic_scores
from database import SessionLocal, engine
models.Base.metadata.create_all(bind=engine)
def create_audit_log(
    event_type,
    status,
    message,
    reference_id=None,
    details=None,
):
    """
    Safely stores an audit event.

    Never pass passwords, Razorpay Key Secret,
    card details, OTP, CVV or payment signature here.
    """

    db = SessionLocal()

    try:
        audit_log = models.AuditLog(
            event_type=event_type,
            status=status,
            reference_id=reference_id,
            message=message,
            details=details,
        )

        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)

        return audit_log

    except Exception:
        db.rollback()

        # Audit logging failure should not crash
        # the main customer transaction.
        return None

    finally:
        db.close()
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
class CartItemRequest(BaseModel):
    product_id: int
    quantity: int


class PolicyRequest(BaseModel):
    items: list[CartItemRequest]
    max_budget: float | None = None
    quote_id: str | None = None


class PaymentApprovalRequest(BaseModel):
    items: list[CartItemRequest]
    max_budget: float | None = None
    quote_id: str | None = None


class PaymentOrderRequest(BaseModel):
    approval_id: str


class PaymentVerifyRequest(BaseModel):
    payment_session_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str



class CheckoutQuoteRequest(BaseModel):
    items: list[CartItemRequest]
    max_budget: float | None = None
    social_contribution_rupees: float = 0.0
    social_cause: str | None = None
    delivery_zone: str = "LOCAL"


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/audit-logs")
def get_audit_logs():
    db = SessionLocal()

    try:
        logs = (
            db.query(models.AuditLog)
            .order_by(models.AuditLog.id.desc())
            .limit(100)
            .all()
        )

        return [
            {
                "id": log.id,
                "event_type": log.event_type,
                "status": log.status,
                "reference_id": log.reference_id,
                "message": log.message,
                "details": log.details,
                "created_at": (
                    log.created_at.isoformat()
                    if log.created_at
                    else None
                ),
            }
            for log in logs
        ]

    finally:
        db.close()
@app.get("/payment-transactions")
def get_payment_transactions():
    db = SessionLocal()

    try:
        transactions = (
            db.query(models.PaymentTransaction)
            .order_by(models.PaymentTransaction.id.desc())
            .limit(100)
            .all()
        )

        return [
            {
                "id": transaction.id,

                "status": transaction.status,

                "amount_paise": transaction.amount_paise,

                "amount_rupees": round(
                    transaction.amount_paise / 100,
                    2
                ),

                "currency": transaction.currency,

                "items": transaction.items,

                "max_budget": transaction.max_budget,

                "fulfilled": transaction.fulfilled,

                "failure_reason": transaction.failure_reason,

                "created_at": (
                    transaction.created_at.isoformat()
                    if transaction.created_at
                    else None
                ),

                "updated_at": (
                    transaction.updated_at.isoformat()
                    if transaction.updated_at
                    else None
                ),
            }
            for transaction in transactions
        ]

    finally:
        db.close()
class PaymentFailureRequest(BaseModel):
    payment_session_id: str
    status: str
    reason: str | None = None

@app.get("/")
def home():
    return {"message": "AgentPass Commerce backend is running"}

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
@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    db = SessionLocal()

    try:
        product = (
            db.query(models.Product)
            .filter(models.Product.id == product_id)
            .first()
        )

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        db.delete(product)
        db.commit()

        return {
            "message": "Product deleted successfully"
        }

    finally:
        db.close()
@app.put("/products/{product_id}")
def update_product(product_id: int, updated_product: Product):
    db = SessionLocal()

    try:
        product = (
            db.query(models.Product)
            .filter(models.Product.id == product_id)
            .first()
        )

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        product.productName = updated_product.productName
        product.category = updated_product.category
        product.subcategory = updated_product.subcategory
        product.description = updated_product.description
        product.brand = updated_product.brand
        product.price = updated_product.price
        product.stock = updated_product.stock
        product.tags = updated_product.tags
        product.attributes = updated_product.attributes

        db.commit()
        db.refresh(product)

        return {
            "message": "Product updated successfully",
            "product": {
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
            }
        }

    finally:
        db.close()



# =========================================================
# CHECKOUT PRICING / QUOTE
# =========================================================

def _utc_now_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _offer_matches_product(offer, product, order_subtotal, now):
    if not offer.active:
        return False

    if offer.starts_at and now < offer.starts_at:
        return False

    if offer.ends_at and now > offer.ends_at:
        return False

    if (
        offer.min_order_value is not None
        and order_subtotal < float(offer.min_order_value)
    ):
        return False

    if (
        offer.product_id is not None
        and offer.product_id != product.id
    ):
        return False

    if offer.brand is not None:
        product_brand = (product.brand or "").strip().lower()
        if product_brand != offer.brand.strip().lower():
            return False

    if offer.category is not None:
        product_category = (product.category or "").strip().lower()
        if product_category != offer.category.strip().lower():
            return False

    return True


def _money(value):
    return float(
        Decimal(str(value)).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP
        )
    )


def _calculate_offer_discount(offer, line_total):
    discount_type = (offer.discount_type or "").strip().upper()
    discount_value = max(0.0, float(offer.discount_value or 0.0))

    if discount_type == "PERCENTAGE":
        discount = line_total * min(discount_value, 100.0) / 100.0
    elif discount_type == "FLAT":
        discount = discount_value
    else:
        return 0.0

    if offer.max_discount is not None:
        discount = min(discount, max(0.0, float(offer.max_discount)))

    return _money(min(discount, line_total))


def _find_tax_rule(db, product, now):
    rules = (
        db.query(models.TaxRule)
        .filter(models.TaxRule.active.is_(True))
        .all()
    )

    best_rule = None
    best_score = -1

    product_category = (product.category or "").strip().lower()
    product_subcategory = (product.subcategory or "").strip().lower()

    for rule in rules:
        if rule.effective_from and now < rule.effective_from:
            continue

        if rule.effective_to and now > rule.effective_to:
            continue

        rule_category = (rule.category or "").strip().lower()
        rule_subcategory = (rule.subcategory or "").strip().lower()

        if rule_category and rule_category != product_category:
            continue

        if rule_subcategory and rule_subcategory != product_subcategory:
            continue

        score = 0
        if rule_category:
            score += 1
        if rule_subcategory:
            score += 2

        if score > best_score:
            best_rule = rule
            best_score = score

    return best_rule


def _request_item_signature(items):
    return sorted(
        (int(item.product_id), int(item.quantity))
        for item in items
    )


def _quote_item_signature(quote_items):
    return sorted(
        (
            int(item.get("product_id")),
            int(item.get("quantity", 0))
        )
        for item in (quote_items or [])
    )


def _load_checkout_quote(db, quote_id):
    if not quote_id:
        return None

    quote = (
        db.query(models.CheckoutQuote)
        .filter(models.CheckoutQuote.quote_id == quote_id)
        .first()
    )

    if not quote:
        raise HTTPException(
            status_code=404,
            detail="Checkout quote not found"
        )

    return quote


@app.post("/checkout/quote")
def create_checkout_quote(request: CheckoutQuoteRequest):
    db = SessionLocal()
    quote_reference_id = f"quote_{uuid.uuid4().hex}"

    try:
        if not request.items:
            raise HTTPException(
                status_code=400,
                detail="Cart is empty"
            )

        contribution = _money(
            request.social_contribution_rupees or 0.0
        )

        if contribution < 0 or contribution > 10000:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Social contribution must be between "
                    "₹0 and ₹10,000"
                )
            )

        allowed_causes = {
            "EDUCATION",
            "FOOD",
            "HEALTHCARE",
        }

        normalized_cause = (
            request.social_cause.strip().upper()
            if request.social_cause
            else None
        )

        if contribution > 0:
            if normalized_cause not in allowed_causes:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Select Education, Food, or Healthcare "
                        "for the social contribution"
                    )
                )
        else:
            normalized_cause = None

        now = _utc_now_naive()
        validated_rows = []
        subtotal = 0.0

        # First pass: validate the cart and calculate server subtotal.
        for item in request.items:
            if item.quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid quantity"
                )

            product = (
                db.query(models.Product)
                .filter(models.Product.id == item.product_id)
                .first()
            )

            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product {item.product_id} not found"
                )

            if item.quantity > product.stock:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Insufficient stock for {product.productName}"
                    )
                )

            unit_price = _money(product.price)
            line_subtotal = _money(
                Decimal(str(unit_price))
                * Decimal(str(item.quantity))
            )
            subtotal += line_subtotal

            validated_rows.append({
                "product": product,
                "quantity": item.quantity,
                "unit_price": unit_price,
                "line_subtotal": line_subtotal,
            })

        subtotal = _money(subtotal)

        active_offers = (
            db.query(models.OfferCampaign)
            .filter(models.OfferCampaign.active.is_(True))
            .all()
        )

        pricing_lines = []
        total_discount = 0.0
        total_tax = 0.0

        # Second pass: apply one best non-stacking offer per item,
        # then calculate configured tax on the discounted line value.
        for row in validated_rows:
            product = row["product"]
            line_subtotal = row["line_subtotal"]

            best_offer = None
            best_discount = 0.0

            for offer in active_offers:
                if not _offer_matches_product(
                    offer,
                    product,
                    subtotal,
                    now
                ):
                    continue

                candidate_discount = _calculate_offer_discount(
                    offer,
                    line_subtotal
                )

                if candidate_discount > best_discount:
                    best_discount = candidate_discount
                    best_offer = offer

            discounted_line = _money(
                max(
                    0.0,
                    line_subtotal - best_discount
                )
            )

            tax_rule = _find_tax_rule(db, product, now)
            tax_rate = (
                max(0.0, float(tax_rule.rate_percent))
                if tax_rule
                else 0.0
            )
            line_tax = _money(
                Decimal(str(discounted_line))
                * Decimal(str(tax_rate))
                / Decimal("100")
            )

            total_discount += best_discount
            total_tax += line_tax

            pricing_lines.append({
                "product_id": product.id,
                "product_name": product.productName,
                "category": product.category,
                "subcategory": product.subcategory,
                "quantity": row["quantity"],
                "unit_price": row["unit_price"],
                "line_subtotal": line_subtotal,
                "offer": (
                    {
                        "offer_id": best_offer.id,
                        "name": best_offer.name,
                        "discount_type": best_offer.discount_type,
                        "discount_value": best_offer.discount_value,
                        "discount_rupees": best_discount,
                    }
                    if best_offer
                    else None
                ),
                "discount_rupees": best_discount,
                "tax_rule": (
                    {
                        "tax_rule_id": tax_rule.id,
                        "name": tax_rule.name,
                        "rate_percent": tax_rate,
                    }
                    if tax_rule
                    else None
                ),
                "taxable_value": discounted_line,
                "tax_rupees": line_tax,
                "line_total": _money(
                    discounted_line + line_tax
                ),
            })

        total_discount = _money(total_discount)
        total_tax = _money(total_tax)

        # Demo delivery pricing.
        # In production, this zone should be derived server-side from
        # the validated delivery address/postcode instead of trusting
        # a browser-supplied distance claim.
        normalized_delivery_zone = (
            str(request.delivery_zone or "LOCAL")
            .strip()
            .upper()
        )

        shipping_by_zone = {
            "LOCAL": 0.0,
            "STANDARD": 50.0,
            "FAR": 100.0,
        }

        if normalized_delivery_zone not in shipping_by_zone:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Delivery zone must be LOCAL, STANDARD, or FAR"
                )
            )

        shipping = shipping_by_zone[normalized_delivery_zone]

        grand_total = _money(
            Decimal(str(subtotal))
            - Decimal(str(total_discount))
            + Decimal(str(total_tax))
            + Decimal(str(shipping))
            + Decimal(str(contribution))
        )

        budget_passed = (
            request.max_budget is None
            or grand_total <= request.max_budget
        )

        expires_at = now + timedelta(minutes=10)

        quote = models.CheckoutQuote(
            quote_id=quote_reference_id,
            approval_id=None,
            items=[
                {
                    "product_id": line["product_id"],
                    "product_name": line["product_name"],
                    "quantity": line["quantity"],
                    "unit_price": line["unit_price"],
                }
                for line in pricing_lines
            ],
            subtotal_rupees=subtotal,
            discount_rupees=total_discount,
            tax_rupees=total_tax,
            shipping_rupees=shipping,
            social_contribution_rupees=contribution,
            social_cause=normalized_cause,
            grand_total_rupees=grand_total,
            max_budget=request.max_budget,
            pricing_details={
                "lines": pricing_lines,
                "budget_passed": budget_passed,
                "tax_basis": "CONFIGURED_TAX_RULES",
                "offer_stacking": False,
                "delivery_zone": normalized_delivery_zone,
                "shipping_rule": "DEMO_ZONE_BASED",
            },
            status="QUOTED",
            created_at=now,
            expires_at=expires_at,
        )

        db.add(quote)
        db.commit()
        db.refresh(quote)

        create_audit_log(
            event_type="CHECKOUT_QUOTED",
            status=(
                "QUOTED"
                if budget_passed
                else "OVER_BUDGET"
            ),
            reference_id=quote_reference_id,
            message="Server-side checkout quote created.",
            details={
                "subtotal": subtotal,
                "discount": total_discount,
                "tax": total_tax,
                "shipping": shipping,
                "delivery_zone": normalized_delivery_zone,
                "social_contribution": contribution,
                "grand_total": grand_total,
                "max_budget": request.max_budget,
                "budget_passed": budget_passed,
            },
        )

        return {
            "quote_id": quote_reference_id,
            "status": quote.status,
            "expires_in_seconds": 600,
            "items": pricing_lines,
            "subtotal": subtotal,
            "discount": total_discount,
            "tax": total_tax,
            "shipping": shipping,
            "delivery_zone": normalized_delivery_zone,
            "social_contribution": contribution,
            "social_cause": normalized_cause,
            "grand_total": grand_total,
            "max_budget": request.max_budget,
            "budget_passed": budget_passed,
            "message": (
                "Checkout quote created successfully"
                if budget_passed
                else "Checkout quote exceeds the detected budget"
            ),
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

@app.post("/policy/check")
def check_policy(request: PolicyRequest):
    db = SessionLocal()

    policy_reference_id = f"policy_{uuid.uuid4().hex[:12]}"

    try:
        checks = []

        stock_passed = True
        quantity_passed = True
        catalogue_passed = True
        price_lock_passed = True
        quote_passed = True

        if not request.items:
            create_audit_log(
                event_type="POLICY_BLOCKED",
                status="BLOCKED",
                reference_id=policy_reference_id,
                message="Policy check blocked because the cart was empty.",
                details={
                    "server_total": 0,
                    "max_budget": request.max_budget,
                    "reason": "EMPTY_CART",
                    "quote_id": request.quote_id,
                },
            )

            return {
                "passed": False,
                "decision": "BLOCKED",
                "server_total": 0,
                "reference_id": policy_reference_id,
                "quote_id": request.quote_id,
                "checks": [
                    {
                        "name": "Cart Check",
                        "passed": False,
                        "message": "Cart is empty",
                    }
                ],
            }

        quote = _load_checkout_quote(
            db,
            request.quote_id
        )

        authoritative_budget = request.max_budget
        server_total = 0.0

        if quote:
            now = _utc_now_naive()

            if now > quote.expires_at:
                quote_passed = False

            if quote.status not in {
                "QUOTED",
                "APPROVED",
            }:
                quote_passed = False

            if (
                _request_item_signature(request.items)
                != _quote_item_signature(quote.items)
            ):
                quote_passed = False

            authoritative_budget = quote.max_budget
            server_total = round(
                float(quote.grand_total_rupees),
                2
            )

            checks.append({
                "name": "Checkout Quote Check",
                "passed": quote_passed,
                "message": (
                    "Server checkout quote is valid and matches the cart"
                    if quote_passed
                    else "Checkout quote is expired, changed, or does not match the cart"
                ),
            })

        quote_items_by_id = {
            int(item.get("product_id")): item
            for item in (quote.items or [])
        } if quote else {}

        base_catalogue_total = 0.0

        for item in request.items:
            product = (
                db.query(models.Product)
                .filter(models.Product.id == item.product_id)
                .first()
            )

            if not product:
                catalogue_passed = False
                continue

            if item.quantity <= 0:
                quantity_passed = False
                continue

            if item.quantity > product.stock:
                stock_passed = False

            current_unit_price = round(
                float(product.price),
                2
            )

            base_catalogue_total += (
                current_unit_price
                * item.quantity
            )

            if quote:
                quoted_item = quote_items_by_id.get(
                    int(item.product_id)
                )

                if not quoted_item:
                    price_lock_passed = False
                else:
                    quoted_unit_price = round(
                        float(
                            quoted_item.get(
                                "unit_price",
                                -1
                            )
                        ),
                        2
                    )

                    if (
                        current_unit_price
                        != quoted_unit_price
                    ):
                        price_lock_passed = False

        if not quote:
            server_total = round(
                base_catalogue_total,
                2
            )

        checks.append({
            "name": "Catalogue Check",
            "passed": catalogue_passed,
            "message": (
                "All products exist in the merchant catalogue"
                if catalogue_passed
                else "One or more products no longer exist"
            ),
        })

        checks.append({
            "name": "Quantity Check",
            "passed": quantity_passed,
            "message": (
                "All quantities are valid"
                if quantity_passed
                else "One or more quantities are invalid"
            ),
        })

        checks.append({
            "name": "Stock Check",
            "passed": stock_passed,
            "message": (
                "Requested quantities are available"
                if stock_passed
                else "Requested quantity exceeds available stock"
            ),
        })

        if quote:
            checks.append({
                "name": "Price Lock Check",
                "passed": price_lock_passed,
                "message": (
                    "Current catalogue prices match the quoted prices"
                    if price_lock_passed
                    else "Product pricing changed after the quote was created"
                ),
            })

        budget_passed = True

        if authoritative_budget is not None:
            budget_passed = (
                server_total
                <= authoritative_budget
            )

            checks.append({
                "name": "Budget Check",
                "passed": budget_passed,
                "message": (
                    (
                        f"Final payable ₹{server_total:,.2f} "
                        f"is within budget ₹{authoritative_budget:,.2f}"
                    )
                    if budget_passed
                    else
                    (
                        f"Final payable ₹{server_total:,.2f} "
                        f"exceeds budget ₹{authoritative_budget:,.2f}"
                    )
                ),
            })
        else:
            checks.append({
                "name": "Budget Check",
                "passed": True,
                "message": "No maximum budget was specified",
            })

        passed = (
            catalogue_passed
            and quantity_passed
            and stock_passed
            and budget_passed
            and quote_passed
            and price_lock_passed
        )

        decision = (
            "APPROVED"
            if passed
            else "BLOCKED"
        )

        create_audit_log(
            event_type=(
                "POLICY_APPROVED"
                if passed
                else "POLICY_BLOCKED"
            ),
            status=decision,
            reference_id=policy_reference_id,
            message=(
                "Policy engine approved the checkout."
                if passed
                else "Policy engine blocked the checkout."
            ),
            details={
                "items": [
                    {
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                    }
                    for item in request.items
                ],
                "quote_id": (
                    quote.quote_id
                    if quote
                    else None
                ),
                "server_total": round(
                    server_total,
                    2
                ),
                "max_budget": authoritative_budget,
                "catalogue_passed": catalogue_passed,
                "quantity_passed": quantity_passed,
                "stock_passed": stock_passed,
                "price_lock_passed": price_lock_passed,
                "quote_passed": quote_passed,
                "budget_passed": budget_passed,
            },
        )

        return {
            "passed": passed,
            "decision": decision,
            "reference_id": policy_reference_id,
            "quote_id": (
                quote.quote_id
                if quote
                else None
            ),
            "server_total": round(
                server_total,
                2
            ),
            "max_budget": authoritative_budget,
            "pricing": (
                {
                    "subtotal": round(
                        float(
                            quote.subtotal_rupees
                        ),
                        2
                    ),
                    "discount": round(
                        float(
                            quote.discount_rupees
                        ),
                        2
                    ),
                    "tax": round(
                        float(
                            quote.tax_rupees
                        ),
                        2
                    ),
                    "shipping": round(
                        float(
                            quote.shipping_rupees
                        ),
                        2
                    ),
                    "social_contribution": round(
                        float(
                            quote.social_contribution_rupees
                        ),
                        2
                    ),
                    "grand_total": round(
                        float(
                            quote.grand_total_rupees
                        ),
                        2
                    ),
                }
                if quote
                else None
            ),
            "checks": checks,
        }

    except HTTPException:
        db.rollback()
        raise

    finally:
        db.close()


@app.post("/payment/approve")
def approve_payment(request: PaymentApprovalRequest):
    db = SessionLocal()

    approval_attempt_id = (
        "approval_attempt_"
        + uuid.uuid4().hex[:12]
    )

    try:
        if not request.items:
            create_audit_log(
                event_type="APPROVAL_BLOCKED",
                status="BLOCKED",
                reference_id=approval_attempt_id,
                message=(
                    "Purchase approval blocked "
                    "because the cart was empty."
                ),
                details={
                    "reason": "EMPTY_CART",
                    "max_budget": request.max_budget,
                    "quote_id": request.quote_id,
                },
            )

            raise HTTPException(
                status_code=400,
                detail="Cart is empty"
            )

        quote = _load_checkout_quote(
            db,
            request.quote_id
        )

        authoritative_budget = request.max_budget

        if quote:
            now = _utc_now_naive()

            if now > quote.expires_at:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Checkout quote expired. "
                        "Create a fresh quote."
                    )
                )

            if quote.status != "QUOTED":
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Checkout quote is no longer "
                        "available for approval"
                    )
                )

            if quote.approval_id:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Checkout quote has already "
                        "been approved"
                    )
                )

            if (
                _request_item_signature(request.items)
                != _quote_item_signature(quote.items)
            ):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Cart changed after the quote "
                        "was created"
                    )
                )

            authoritative_budget = quote.max_budget

        validated_items = []
        raw_catalogue_total = 0.0

        quote_items_by_id = {
            int(item.get("product_id")): item
            for item in (quote.items or [])
        } if quote else {}

        for item in request.items:
            product = (
                db.query(models.Product)
                .filter(
                    models.Product.id
                    == item.product_id
                )
                .first()
            )

            if not product:
                create_audit_log(
                    event_type="APPROVAL_BLOCKED",
                    status="BLOCKED",
                    reference_id=approval_attempt_id,
                    message=(
                        "Purchase approval blocked "
                        "because a product was not found."
                    ),
                    details={
                        "reason": "PRODUCT_NOT_FOUND",
                        "product_id": item.product_id,
                        "quote_id": request.quote_id,
                    },
                )

                raise HTTPException(
                    status_code=404,
                    detail="Product not found"
                )

            if item.quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid quantity"
                )

            if item.quantity > product.stock:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Insufficient stock for "
                        f"{product.productName}"
                    )
                )

            current_unit_price = round(
                float(product.price),
                2
            )

            if quote:
                quoted_item = quote_items_by_id.get(
                    int(product.id)
                )

                if not quoted_item:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "Checkout quote does not "
                            "match the cart"
                        )
                    )

                quoted_unit_price = round(
                    float(
                        quoted_item.get(
                            "unit_price",
                            -1
                        )
                    ),
                    2
                )

                if (
                    current_unit_price
                    != quoted_unit_price
                ):
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "Product pricing changed. "
                            "Create a fresh quote."
                        )
                    )

            raw_catalogue_total += (
                current_unit_price
                * item.quantity
            )

            validated_items.append({
                "product_id": product.id,
                "product_name": product.productName,
                "quantity": item.quantity,
                "unit_price": current_unit_price,
            })

        server_total = (
            round(
                float(
                    quote.grand_total_rupees
                ),
                2
            )
            if quote
            else round(
                raw_catalogue_total,
                2
            )
        )

        if (
            authoritative_budget is not None
            and server_total
            > authoritative_budget
        ):
            create_audit_log(
                event_type="APPROVAL_BLOCKED",
                status="BLOCKED",
                reference_id=approval_attempt_id,
                message=(
                    "Purchase approval blocked "
                    "because the final payable "
                    "exceeded the budget."
                ),
                details={
                    "reason": "BUDGET_EXCEEDED",
                    "server_total": server_total,
                    "max_budget": authoritative_budget,
                    "quote_id": (
                        quote.quote_id
                        if quote
                        else None
                    ),
                },
            )

            raise HTTPException(
                status_code=400,
                detail=(
                    "Final payable exceeds "
                    "approved budget"
                )
            )

        approval_id = (
            "approval_"
            + uuid.uuid4().hex
        )

        created_at = _utc_now_naive()

        expires_at = (
            created_at
            + timedelta(minutes=10)
        )

        persistent_approval = (
            models.PurchaseApproval(
                approval_id=approval_id,
                items=validated_items,
                amount_rupees=server_total,
                max_budget=authoritative_budget,
                used=False,
                created_at=created_at,
                expires_at=expires_at,
            )
        )

        db.add(persistent_approval)

        if quote:
            quote.approval_id = approval_id
            quote.status = "APPROVED"

        db.commit()
        db.refresh(persistent_approval)

        create_audit_log(
            event_type="USER_APPROVED",
            status="APPROVED",
            reference_id=approval_id,
            message="User approved the purchase.",
            details={
                "items": validated_items,
                "amount": server_total,
                "max_budget": authoritative_budget,
                "quote_id": (
                    quote.quote_id
                    if quote
                    else None
                ),
                "expires_in_seconds": 600,
                "persistent": True,
            },
        )

        return {
            "approved": True,
            "approval_id": approval_id,
            "quote_id": (
                quote.quote_id
                if quote
                else None
            ),
            "amount": server_total,
            "expires_in_seconds": 600,
            "message": (
                "Purchase approval recorded"
            ),
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


@app.post("/payment/create-order")
def create_payment_order(request: PaymentOrderRequest):
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")

    # -----------------------------
    # Credential checks
    # -----------------------------

    if not key_id or not key_secret:
        create_audit_log(
            event_type="ORDER_CREATION_FAILED",
            status="FAILED",
            reference_id=request.approval_id,
            message=(
                "Payment order creation failed "
                "because Test credentials were unavailable."
            ),
            details={
                "reason": "TEST_CREDENTIALS_NOT_LOADED"
            },
        )

        raise HTTPException(
            status_code=500,
            detail="Razorpay Test credentials are not loaded"
        )

    if not key_id.startswith("rzp_test_"):
        create_audit_log(
            event_type="ORDER_CREATION_FAILED",
            status="BLOCKED",
            reference_id=request.approval_id,
            message=(
                "Payment order creation blocked "
                "because Test Mode was not detected."
            ),
            details={
                "reason": "NON_TEST_KEY"
            },
        )

        raise HTTPException(
            status_code=400,
            detail="Only Razorpay Test Mode is allowed"
        )

    db = SessionLocal()

    try:
        # -----------------------------
        # Load persistent approval
        # -----------------------------

        approval = (
            db.query(models.PurchaseApproval)
            .filter(
                models.PurchaseApproval.approval_id
                == request.approval_id
            )
            .first()
        )

        if not approval:
            create_audit_log(
                event_type="PAYMENT_ORDER_BLOCKED",
                status="BLOCKED",
                reference_id=request.approval_id,
                message=(
                    "Payment order blocked because "
                    "a valid purchase approval was not found."
                ),
                details={
                    "reason": "APPROVAL_NOT_FOUND"
                },
            )

            raise HTTPException(
                status_code=403,
                detail="Valid purchase approval is required"
            )

        # -----------------------------
        # Prevent approval reuse
        # -----------------------------

        if approval.used:
            create_audit_log(
                event_type="APPROVAL_ALREADY_USED",
                status="BLOCKED",
                reference_id=request.approval_id,
                message=(
                    "Payment order blocked because "
                    "the approval had already been used."
                ),
                details={
                    "reason": "APPROVAL_ALREADY_USED"
                },
            )

            raise HTTPException(
                status_code=409,
                detail="This approval has already been used"
            )

        # -----------------------------
        # Approval expiry
        # -----------------------------

        current_time = (
            datetime.now(timezone.utc)
            .replace(tzinfo=None)
        )

        if current_time > approval.expires_at:
            create_audit_log(
                event_type="APPROVAL_EXPIRED",
                status="BLOCKED",
                reference_id=request.approval_id,
                message=(
                    "Payment order blocked because "
                    "the purchase approval expired."
                ),
                details={
                    "reason": "APPROVAL_EXPIRED"
                },
            )

            raise HTTPException(
                status_code=403,
                detail="Purchase approval has expired"
            )

        approval_items = approval.items or []

        quote = (
            db.query(models.CheckoutQuote)
            .filter(
                models.CheckoutQuote.approval_id
                == request.approval_id
            )
            .first()
        )

        quote_items_by_id = {
            int(item.get("product_id")): item
            for item in (quote.items or [])
        } if quote else {}

        raw_catalogue_total = 0.0

        # -----------------------------
        # Revalidate catalogue
        # -----------------------------

        for item in approval_items:
            product = (
                db.query(models.Product)
                .filter(
                    models.Product.id
                    == item["product_id"]
                )
                .first()
            )

            if not product:
                create_audit_log(
                    event_type="PAYMENT_ORDER_BLOCKED",
                    status="BLOCKED",
                    reference_id=request.approval_id,
                    message=(
                        "Payment order blocked because "
                        "a product no longer existed."
                    ),
                    details={
                        "reason": "PRODUCT_NOT_FOUND",
                        "product_id":
                            item["product_id"],
                    },
                )

                raise HTTPException(
                    status_code=404,
                    detail="Product no longer exists"
                )

            if item["quantity"] > product.stock:
                create_audit_log(
                    event_type="PAYMENT_ORDER_BLOCKED",
                    status="BLOCKED",
                    reference_id=request.approval_id,
                    message=(
                        "Payment order blocked because "
                        "product stock changed."
                    ),
                    details={
                        "reason": "STOCK_CHANGED",
                        "product_id": product.id,
                        "requested_quantity":
                            item["quantity"],
                        "available_stock":
                            product.stock,
                    },
                )

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Stock changed for "
                        f"{product.productName}"
                    )
                )

            current_unit_price = round(
                float(product.price),
                2
            )

            raw_catalogue_total += (
                current_unit_price
                * item["quantity"]
            )

            if quote:
                quoted_item = quote_items_by_id.get(
                    int(product.id)
                )

                if not quoted_item:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "Approved quote does not "
                            "match the cart"
                        )
                    )

                quoted_unit_price = round(
                    float(
                        quoted_item.get(
                            "unit_price",
                            -1
                        )
                    ),
                    2
                )

                if (
                    quoted_unit_price
                    != current_unit_price
                ):
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "Product pricing changed. "
                            "Approval must be repeated."
                        )
                    )

        approved_amount = round(
            float(
                approval.amount_rupees
            ),
            2
        )

        if quote:
            if quote.status != "APPROVED":
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Checkout quote is not "
                        "approved for payment"
                    )
                )

            quoted_amount = round(
                float(
                    quote.grand_total_rupees
                ),
                2
            )

            if approved_amount != quoted_amount:
                create_audit_log(
                    event_type="PAYMENT_ORDER_BLOCKED",
                    status="BLOCKED",
                    reference_id=request.approval_id,
                    message=(
                        "Payment order blocked because "
                        "the approved amount did not "
                        "match the checkout quote."
                    ),
                    details={
                        "reason": "QUOTE_AMOUNT_MISMATCH",
                        "approved_amount":
                            approved_amount,
                        "quoted_amount":
                            quoted_amount,
                        "quote_id":
                            quote.quote_id,
                    },
                )

                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Approved amount does not "
                        "match checkout quote"
                    )
                )

            amount_for_payment = quoted_amount

        else:
            current_total = round(
                raw_catalogue_total,
                2
            )

            if current_total != approved_amount:
                create_audit_log(
                    event_type="PAYMENT_ORDER_BLOCKED",
                    status="BLOCKED",
                    reference_id=request.approval_id,
                    message=(
                        "Payment order blocked because "
                        "product pricing changed."
                    ),
                    details={
                        "reason": "PRICE_CHANGED",
                        "approved_amount":
                            approved_amount,
                        "current_amount":
                            current_total,
                    },
                )

                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Product pricing changed. "
                        "Approval must be repeated."
                    )
                )

            amount_for_payment = current_total

        amount_in_paise = int(
            Decimal(str(amount_for_payment))
            .quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP
            )
            * 100
        )

        client = razorpay.Client(
            auth=(key_id, key_secret)
        )

        receipt = (
            "agentpass_"
            + uuid.uuid4().hex[:12]
        )

        razorpay_order = client.order.create({
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": receipt,
            "notes": {
                "source": "agentpass-commerce",
                "mode": "buildathon-test",
                "quote_id": (
                    quote.quote_id
                    if quote
                    else "legacy"
                ),
            }
        })

        payment_session_id = (
            "pay_session_"
            + uuid.uuid4().hex
        )

        # -----------------------------
        # Save persistent payment session
        # -----------------------------

        persistent_session = models.PaymentSession(
            payment_session_id=payment_session_id,
            approval_id=request.approval_id,
            razorpay_order_id=razorpay_order["id"],
            razorpay_payment_id=None,
            amount_paise=razorpay_order["amount"],
            currency=razorpay_order["currency"],
            receipt=receipt,
            status="CREATED",
        )

        db.add(persistent_session)

        # -----------------------------
        # Save transaction permanently
        # -----------------------------

        transaction = models.PaymentTransaction(
            payment_session_id=payment_session_id,
            approval_id=request.approval_id,
            razorpay_order_id=razorpay_order["id"],
            razorpay_payment_id=None,
            amount_paise=razorpay_order["amount"],
            currency=razorpay_order["currency"],
            receipt=receipt,
            status="CREATED",
            items=approval_items,
            max_budget=approval.max_budget,
            fulfilled=False,
            failure_reason=None,
        )

        db.add(transaction)

        # -----------------------------
        # Mark approval as consumed
        # -----------------------------

        approval.used = True

        db.commit()
        db.refresh(persistent_session)
        db.refresh(transaction)
        create_audit_log(
            event_type="PAYMENT_ORDER_CREATED",
            status="CREATED",
            reference_id=payment_session_id,
            message=(
                "Razorpay Test payment order "
                "was created successfully."
            ),
            details={
                "approval_id":
                    request.approval_id,
                "razorpay_order_id":
                    razorpay_order["id"],
                "amount":
                    razorpay_order["amount"],
                "currency":
                    razorpay_order["currency"],
                "receipt":
                    receipt,
                "persistent_session":
                    True,
            },
        )

        return {
            "message":
                "Razorpay Test order created",
            "payment_session_id":
                payment_session_id,
            "key_id":
                key_id,
            "order_id":
                razorpay_order["id"],
            "amount":
                razorpay_order["amount"],
            "currency":
                razorpay_order["currency"],
        }

    except razorpay.errors.BadRequestError:
        db.rollback()

        create_audit_log(
            event_type="ORDER_CREATION_FAILED",
            status="FAILED",
            reference_id=request.approval_id,
            message=(
                "Razorpay rejected the "
                "Test order creation request."
            ),
            details={
                "reason": "RAZORPAY_BAD_REQUEST"
            },
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "Razorpay Test order "
                "could not be created"
            )
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()
@app.post("/payment/failure")
def record_payment_failure(request: PaymentFailureRequest):
    allowed_statuses = {
        "FAILED",
        "CANCELLED",
    }

    normalized_status = (
        request.status
        .strip()
        .upper()
    )

    if normalized_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid payment failure status"
        )

    db = SessionLocal()

    try:
        payment_session = (
            db.query(models.PaymentSession)
            .filter(
                models.PaymentSession.payment_session_id
                == request.payment_session_id
            )
            .first()
        )

        transaction = (
            db.query(models.PaymentTransaction)
            .filter(
                models.PaymentTransaction.payment_session_id
                == request.payment_session_id
            )
            .first()
        )

        if not payment_session or not transaction:
            raise HTTPException(
                status_code=404,
                detail="Payment session not found"
            )

        # Never overwrite a completed payment.
        if transaction.fulfilled:
            raise HTTPException(
                status_code=409,
                detail=(
                    "A fulfilled transaction cannot "
                    "be marked as failed or cancelled"
                )
            )

        safe_reason = (
            request.reason.strip()[:200]
            if request.reason
            else None
        )

        payment_session.status = normalized_status

        transaction.status = normalized_status
        transaction.failure_reason = safe_reason

        db.commit()

        event_type = (
            "PAYMENT_FAILED"
            if normalized_status == "FAILED"
            else "PAYMENT_CANCELLED"
        )

        create_audit_log(
            event_type=event_type,
            status=normalized_status,
            reference_id=request.payment_session_id,
            message=(
                "Razorpay Test payment failed."
                if normalized_status == "FAILED"
                else
                "Razorpay Test payment was cancelled."
            ),
            details={
                "reason": safe_reason,
            },
        )

        return {
            "recorded": True,
            "payment_session_id":
                request.payment_session_id,
            "status":
                normalized_status,
            "message":
                "Payment status recorded successfully",
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

@app.post("/payment/verify")
def verify_payment(request: PaymentVerifyRequest):
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")

    # -----------------------------
    # Test credential validation
    # -----------------------------

    if not key_id or not key_secret:
        create_audit_log(
            event_type="PAYMENT_VERIFICATION_FAILED",
            status="FAILED",
            reference_id=request.payment_session_id,
            message=(
                "Payment verification failed because "
                "Test credentials were unavailable."
            ),
            details={
                "reason": "TEST_CREDENTIALS_NOT_LOADED"
            },
        )

        raise HTTPException(
            status_code=500,
            detail="Razorpay Test credentials are not loaded"
        )

    if not key_id.startswith("rzp_test_"):
        create_audit_log(
            event_type="PAYMENT_VERIFICATION_FAILED",
            status="BLOCKED",
            reference_id=request.payment_session_id,
            message=(
                "Payment verification blocked because "
                "Test Mode was not detected."
            ),
            details={
                "reason": "NON_TEST_KEY"
            },
        )

        raise HTTPException(
            status_code=400,
            detail="Only Razorpay Test Mode is allowed"
        )

    db = SessionLocal()

    try:
        # -----------------------------
        # Load persistent payment session
        # -----------------------------

        session = (
            db.query(models.PaymentSession)
            .filter(
                models.PaymentSession.payment_session_id
                == request.payment_session_id
            )
            .first()
        )

        if not session:
            create_audit_log(
                event_type="PAYMENT_VERIFICATION_FAILED",
                status="BLOCKED",
                reference_id=request.payment_session_id,
                message=(
                    "Payment verification blocked because "
                    "the persistent payment session was not found."
                ),
                details={
                    "reason": "PAYMENT_SESSION_NOT_FOUND"
                },
            )

            raise HTTPException(
                status_code=404,
                detail="Payment session not found"
            )

        # -----------------------------
        # Load persistent transaction
        # -----------------------------

        transaction = (
            db.query(models.PaymentTransaction)
            .filter(
                models.PaymentTransaction.payment_session_id
                == request.payment_session_id
            )
            .first()
        )

        if not transaction:
            create_audit_log(
                event_type="PAYMENT_VERIFICATION_FAILED",
                status="BLOCKED",
                reference_id=request.payment_session_id,
                message=(
                    "Payment verification blocked because "
                    "the transaction record was not found."
                ),
                details={
                    "reason": "TRANSACTION_NOT_FOUND"
                },
            )

            raise HTTPException(
                status_code=404,
                detail="Payment transaction not found"
            )

        # Never trust browser order ID.
        server_order_id = session.razorpay_order_id

        # -----------------------------
        # Order ID validation
        # -----------------------------

        if (
            request.razorpay_order_id
            != server_order_id
        ):
            create_audit_log(
                event_type="PAYMENT_VERIFICATION_FAILED",
                status="BLOCKED",
                reference_id=request.payment_session_id,
                message=(
                    "Payment verification blocked because "
                    "the order ID did not match "
                    "the server record."
                ),
                details={
                    "reason": "ORDER_ID_MISMATCH"
                },
            )

            raise HTTPException(
                status_code=400,
                detail="Order ID mismatch"
            )

        # -----------------------------
        # Persistent replay protection
        # -----------------------------

        other_session = (
            db.query(models.PaymentSession)
            .filter(
                models.PaymentSession.razorpay_payment_id
                == request.razorpay_payment_id,
                models.PaymentSession.payment_session_id
                != request.payment_session_id,
            )
            .first()
        )

        other_transaction = (
            db.query(models.PaymentTransaction)
            .filter(
                models.PaymentTransaction.razorpay_payment_id
                == request.razorpay_payment_id,
                models.PaymentTransaction.payment_session_id
                != request.payment_session_id,
            )
            .first()
        )

        if other_session or other_transaction:
            create_audit_log(
                event_type="PAYMENT_REPLAY_BLOCKED",
                status="BLOCKED",
                reference_id=request.payment_session_id,
                message=(
                    "Payment verification blocked because "
                    "the payment ID had already been used "
                    "for another payment session."
                ),
                details={
                    "reason": "PAYMENT_ID_ALREADY_USED"
                },
            )

            raise HTTPException(
                status_code=409,
                detail="Payment ID has already been used"
            )

        # -----------------------------
        # Prevent different payment ID
        # replacing an existing one
        # -----------------------------

        if (
            session.razorpay_payment_id
            and session.razorpay_payment_id
            != request.razorpay_payment_id
        ):
            create_audit_log(
                event_type="PAYMENT_REPLAY_BLOCKED",
                status="BLOCKED",
                reference_id=request.payment_session_id,
                message=(
                    "Payment session was already linked "
                    "to a different payment ID."
                ),
                details={
                    "reason":
                        "PAYMENT_SESSION_ALREADY_LINKED"
                },
            )

            raise HTTPException(
                status_code=409,
                detail=(
                    "Payment session is already linked "
                    "to another payment"
                )
            )

        # -----------------------------
        # Completed idempotent retry
        # -----------------------------

        if (
            transaction.fulfilled
            and transaction.razorpay_payment_id
            == request.razorpay_payment_id
        ):
            create_audit_log(
                event_type="PAYMENT_ALREADY_VERIFIED",
                status="VERIFIED",
                reference_id=request.payment_session_id,
                message=(
                    "Duplicate verification request safely "
                    "returned the existing fulfilled result."
                ),
                details={
                    "reason": "IDEMPOTENT_RETRY"
                },
            )

            return {
                "verified": True,
                "already_verified": True,
                "payment_id":
                    request.razorpay_payment_id,
                "order_id":
                    server_order_id,
                "razorpay_status":
                    "captured",
                "fulfillment_allowed": True,
                "fulfillment_completed": True,
                "message":
                    "Payment was already verified and fulfilled",
            }

        # -----------------------------
        # Signature verification
        # -----------------------------

        message = (
            server_order_id
            + "|"
            + request.razorpay_payment_id
        )

        expected_signature = hmac.new(
            key_secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        signature_valid = hmac.compare_digest(
            expected_signature,
            request.razorpay_signature
        )

        if not signature_valid:
            create_audit_log(
                event_type="PAYMENT_VERIFICATION_FAILED",
                status="BLOCKED",
                reference_id=request.payment_session_id,
                message=(
                    "Payment verification blocked because "
                    "signature verification failed."
                ),
                details={
                    "reason": "INVALID_SIGNATURE"
                },
            )

            raise HTTPException(
                status_code=400,
                detail="Payment signature verification failed"
            )

        # -----------------------------
        # Fetch payment from Razorpay
        # -----------------------------

        client = razorpay.Client(
            auth=(key_id, key_secret)
        )

        try:
            payment = client.payment.fetch(
                request.razorpay_payment_id
            )

        except razorpay.errors.BadRequestError:
            create_audit_log(
                event_type="PAYMENT_VERIFICATION_FAILED",
                status="FAILED",
                reference_id=request.payment_session_id,
                message=(
                    "Payment could not be validated "
                    "with Razorpay."
                ),
                details={
                    "reason":
                        "RAZORPAY_PAYMENT_FETCH_FAILED"
                },
            )

            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not validate payment "
                    "with Razorpay"
                )
            )

        # -----------------------------
        # Server-to-server verification
        # -----------------------------

        if payment.get("order_id") != server_order_id:
            create_audit_log(
                event_type="PAYMENT_VERIFICATION_FAILED",
                status="BLOCKED",
                reference_id=request.payment_session_id,
                message=(
                    "Razorpay payment did not belong "
                    "to the expected order."
                ),
                details={
                    "reason": "RAZORPAY_ORDER_MISMATCH"
                },
            )

            raise HTTPException(
                status_code=400,
                detail=(
                    "Razorpay payment does not belong "
                    "to this order"
                )
            )

        if payment.get("amount") != session.amount_paise:
            create_audit_log(
                event_type="PAYMENT_VERIFICATION_FAILED",
                status="BLOCKED",
                reference_id=request.payment_session_id,
                message=(
                    "Payment verification blocked because "
                    "the amount did not match."
                ),
                details={
                    "reason": "AMOUNT_MISMATCH",
                    "expected_amount":
                        session.amount_paise,
                    "received_amount":
                        payment.get("amount"),
                },
            )

            raise HTTPException(
                status_code=400,
                detail="Payment amount mismatch"
            )

        if payment.get("currency") != session.currency:
            create_audit_log(
                event_type="PAYMENT_VERIFICATION_FAILED",
                status="BLOCKED",
                reference_id=request.payment_session_id,
                message=(
                    "Payment verification blocked because "
                    "the currency did not match."
                ),
                details={
                    "reason": "CURRENCY_MISMATCH",
                    "expected_currency":
                        session.currency,
                    "received_currency":
                        payment.get("currency"),
                },
            )

            raise HTTPException(
                status_code=400,
                detail="Payment currency mismatch"
            )

        # -----------------------------
        # Razorpay payment status
        # -----------------------------

        razorpay_status = payment.get("status")

        fulfillment_completed = False
        fulfillment_error = None

        # Persistent payment IDs
        session.razorpay_payment_id = (
            request.razorpay_payment_id
        )

        transaction.razorpay_payment_id = (
            request.razorpay_payment_id
        )

        # -----------------------------
        # Captured payment
        # -----------------------------

        if razorpay_status == "captured":
            transaction_items = (
                transaction.items or []
            )

            if not transaction_items:
                fulfillment_error = (
                    "EMPTY_TRANSACTION_ITEMS"
                )

            else:
                products_to_update = []

                # Validate all inventory first
                for item in transaction_items:
                    product_id = item.get(
                        "product_id"
                    )

                    quantity = int(
                        item.get("quantity", 0)
                    )

                    if quantity <= 0:
                        fulfillment_error = (
                            "INVALID_QUANTITY"
                        )
                        break

                    product = (
                        db.query(models.Product)
                        .filter(
                            models.Product.id
                            == product_id
                        )
                        .first()
                    )

                    if not product:
                        fulfillment_error = (
                            "PRODUCT_NOT_FOUND"
                        )
                        break

                    if product.stock < quantity:
                        fulfillment_error = (
                            "INSUFFICIENT_STOCK"
                        )
                        break

                    products_to_update.append(
                        (product, quantity)
                    )

            # -------------------------
            # Fulfilment blocked
            # -------------------------

            if fulfillment_error:
                session.status = "CAPTURED"

                transaction.status = (
                    "FULFILLMENT_BLOCKED"
                )

                transaction.failure_reason = (
                    fulfillment_error
                )

                db.commit()

                create_audit_log(
                    event_type="PAYMENT_VERIFIED",
                    status="CAPTURED",
                    reference_id=request.payment_session_id,
                    message=(
                        "Razorpay Test payment was "
                        "authenticated and captured."
                    ),
                    details={
                        "razorpay_status":
                            razorpay_status,
                        "amount":
                            session.amount_paise,
                        "currency":
                            session.currency,
                        "fulfillment_allowed":
                            True,
                    },
                )

                create_audit_log(
                    event_type="FULFILLMENT_BLOCKED",
                    status="BLOCKED",
                    reference_id=request.payment_session_id,
                    message=(
                        "Order fulfilment was blocked "
                        "after payment verification."
                    ),
                    details={
                        "reason": fulfillment_error
                    },
                )

            # -------------------------
            # Successful fulfilment
            # -------------------------

            else:
                for (
                    product,
                    quantity,
                ) in products_to_update:
                    product.stock -= quantity

                transaction.fulfilled = True
                transaction.status = "FULFILLED"
                transaction.failure_reason = None

                session.status = "FULFILLED"

                db.commit()

                fulfillment_completed = True

                create_audit_log(
                    event_type="PAYMENT_VERIFIED",
                    status="CAPTURED",
                    reference_id=request.payment_session_id,
                    message=(
                        "Razorpay Test payment was "
                        "authenticated and captured "
                        "successfully."
                    ),
                    details={
                        "razorpay_status":
                            razorpay_status,
                        "amount":
                            session.amount_paise,
                        "currency":
                            session.currency,
                        "fulfillment_allowed":
                            True,
                    },
                )

                create_audit_log(
                    event_type="ORDER_FULFILLED",
                    status="FULFILLED",
                    reference_id=request.payment_session_id,
                    message=(
                        "Verified Test payment was "
                        "fulfilled and inventory was "
                        "updated successfully."
                    ),
                    details={
                        "item_count":
                            len(transaction_items)
                    },
                )

        # -----------------------------
        # Verified but not captured
        # -----------------------------

        else:
            session.status = (
                "VERIFIED_NOT_CAPTURED"
            )

            transaction.status = (
                "VERIFIED_NOT_CAPTURED"
            )

            transaction.failure_reason = None

            db.commit()

            create_audit_log(
                event_type="PAYMENT_STATUS_NOT_CAPTURED",
                status="PENDING",
                reference_id=request.payment_session_id,
                message=(
                    "Payment was authenticated but "
                    "was not in captured status."
                ),
                details={
                    "razorpay_status":
                        razorpay_status,
                    "amount":
                        session.amount_paise,
                    "currency":
                        session.currency,
                    "fulfillment_allowed":
                        False,
                },
            )

        return {
            "verified": True,
            "payment_id":
                request.razorpay_payment_id,
            "order_id":
                server_order_id,
            "razorpay_status":
                razorpay_status,
            "fulfillment_allowed":
                razorpay_status == "captured",
            "fulfillment_completed":
                fulfillment_completed,
            "message":
                "Razorpay Test payment authenticated successfully",
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()
@app.post("/growth/suggestions")
def get_growth_suggestions(request: PolicyRequest):
    db = SessionLocal()

    try:
        if not request.items:
            return {
                "suggestions": [],
                "remaining_budget": request.max_budget,
                "message": "Add products to the cart to receive suggestions."
            }

        selected_products = []
        selected_ids = set()
        cart_total = 0.0

        # --------------------------------
        # Read selected cart products
        # --------------------------------

        for item in request.items:
            product = (
                db.query(models.Product)
                .filter(
                    models.Product.id == item.product_id
                )
                .first()
            )

            if not product:
                continue

            if item.quantity <= 0:
                continue

            selected_products.append(product)
            selected_ids.add(product.id)

            cart_total += (
                float(product.price)
                * item.quantity
            )

        if not selected_products:
            return {
                "suggestions": [],
                "remaining_budget": request.max_budget,
                "message": "No valid catalogue products were found in the cart."
            }

        # --------------------------------
        # Calculate remaining budget
        # --------------------------------

        remaining_budget = None

        if request.max_budget is not None:
            remaining_budget = max(
                0,
                request.max_budget - cart_total
            )

        ignored_growth_tags = {
            "budget",
            "affordable",
            "cheap",
            "value",
            "popular",
            "bestseller",
            "everyday",
        }

        selected_tags = set()

        for product in selected_products:
            for tag in product.tags or []:
                normalized_tag = str(tag).strip().lower()

                if normalized_tag not in ignored_growth_tags:
                    selected_tags.add(normalized_tag)

        # --------------------------------
        # Find available catalogue products
        # --------------------------------

        candidates = (
            db.query(models.Product)
            .filter(models.Product.stock > 0)
            .all()
        )

        scored_candidates = []

        for candidate in candidates:

            # Never recommend item already in cart
            if candidate.id in selected_ids:
                continue

            candidate_price = float(candidate.price)

            # Respect remaining customer budget
            if (
                remaining_budget is not None
                and candidate_price > remaining_budget
            ):
                continue

            candidate_tags = {
    str(tag).strip().lower()
    for tag in (candidate.tags or [])
    if str(tag).strip().lower()
    not in ignored_growth_tags
}

            shared_tags = (
                selected_tags
                & candidate_tags
            )

            score = len(shared_tags) * 2

            same_category = False

            for selected in selected_products:
                if (
                    candidate.category
                    and selected.category
                    and candidate.category.lower()
                    == selected.category.lower()
                ):
                    same_category = True
                    score += 1

            # Do not suggest unrelated catalogue items
            if score <= 0:
                continue

            reasons = []

            if shared_tags:
                reasons.append(
                    "Related to your selected products"
                )

            if same_category:
                reasons.append(
                    "Relevant catalogue category match"
                )

            if remaining_budget is not None:
                reasons.append(
                    "Fits within your remaining budget"
                )

            reasons.append(
                "Currently available in stock"
            )

            scored_candidates.append({
                "id": candidate.id,
                "productName": candidate.productName,
                "category": candidate.category,
                "subcategory": candidate.subcategory,
                "brand": candidate.brand,
                "price": candidate_price,
                "stock": candidate.stock,
                "tags": candidate.tags or [],
                "attributes": candidate.attributes or {},
                "growth_score": score,
                "reasons": reasons,
            })

        scored_candidates.sort(
            key=lambda product: (
                -product["growth_score"],
                product["price"]
            )
        )

        suggestions = scored_candidates[:3]

        # --------------------------------
        # Audit event
        # --------------------------------

        create_audit_log(
            event_type="GROWTH_SUGGESTIONS_GENERATED",
            status="COMPLETED",
            message="Revenue growth suggestions were generated from the current cart.",
            details={
                "cart_total": round(cart_total, 2),
                "remaining_budget": (
                    round(remaining_budget, 2)
                    if remaining_budget is not None
                    else None
                ),
                "suggestion_count": len(suggestions),
            },
        )

        return {
            "cart_total": round(cart_total, 2),
            "remaining_budget": (
                round(remaining_budget, 2)
                if remaining_budget is not None
                else None
            ),
            "suggestions": suggestions,
            "message": (
                "Relevant add-on opportunities found."
                if suggestions
                else "No relevant add-on fits the current cart and budget."
            )
        }

    finally:
        db.close()

class RecommendationRequest(BaseModel):
    query: str


@app.post("/recommend")
def recommend(request: RecommendationRequest):
    query = request.query.strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty"
        )

    query_lower = query.lower()
    db = SessionLocal()

    try:
        # =====================================================
        # 1. LOAD AVAILABLE PRODUCTS
        # =====================================================

        products = (
            db.query(models.Product)
            .filter(models.Product.stock > 0)
            .all()
        )

        if not products:
            return {
                "query": query,
                "max_budget": None,
                "recommendations": [],
                "message": "No products are currently available in the catalogue.",
                "closest_match": None,
            }

        # =====================================================
        # 2. DETECT CUSTOMER BUDGET
        # =====================================================

        max_budget = None

        budget_patterns = [
            # under 1000
            # below ₹5000
            # within 2000
            # up to 10000
            # less than 5000
            r"(?:under|below|within|upto|up\s+to|less\s+than|max(?:imum)?)"
            r"(?:\s+my)?(?:\s+budget)?(?:\s+of)?"
            r"\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)",

            # 1000 ke under
            # ₹5000 se kam
            r"(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)"
            r"\s*(?:ke\s+under|ke\s+niche|se\s+kam|or\s+less)",

            # budget 5000
            # budget of ₹5000
            # budget is 5000
            r"budget\s*(?:is|of|around|=|:)?\s*"
            r"(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d+)?)",
        ]

        for pattern in budget_patterns:
            match = re.search(
                pattern,
                query_lower,
                flags=re.IGNORECASE,
            )

            if match:
                try:
                    detected = float(
                        match.group(1).replace(",", "")
                    )

                    if detected > 0:
                        max_budget = detected
                        break

                except (ValueError, IndexError):
                    pass

        # =====================================================
        # 3. CLEAN CUSTOMER QUERY
        # =====================================================

        stop_words = {
            "i",
            "me",
            "my",
            "we",
            "our",
            "need",
            "needs",
            "want",
            "wants",
            "looking",
            "searching",
            "find",
            "show",
            "give",
            "suggest",
            "recommend",
            "something",
            "anything",
            "product",
            "products",
            "item",
            "items",
            "under",
            "below",
            "within",
            "upto",
            "less",
            "than",
            "maximum",
            "max",
            "budget",
            "price",
            "cost",
            "rupee",
            "rupees",
            "rs",
            "inr",
            "please",
            "for",
            "a",
            "an",
            "the",
            "of",
            "to",
            "in",
            "on",
            "with",
            "and",
            "or",
            "is",
            "are",
            "be",
            "up",
            "good",
            "best",
            "useful",
            "option",
            "options",
            "cheap",
            "cheaper",
            "affordable",
            "ke",
            "se",
            "kam",
            "niche",
            "chahiye",
            "mujhe",
            "koi",
        }

        raw_words = re.findall(
            r"[a-zA-Z]+",
            query_lower,
        )

        intent_terms = [
            word
            for word in raw_words
            if len(word) > 2
            and word not in stop_words
        ]

        # =====================================================
        # 4. NORMALIZE CATALOGUE
        # =====================================================

        product_data = []

        for product in products:
            name = (
                product.productName or ""
            ).lower().strip()

            category = (
                product.category or ""
            ).lower().strip()

            subcategory = (
                product.subcategory or ""
            ).lower().strip()

            description = (
                product.description or ""
            ).lower().strip()

            brand = (
                product.brand or ""
            ).lower().strip()

            tags = product.tags or []

            if isinstance(tags, list):
                tag_values = [
                    str(tag).lower().strip()
                    for tag in tags
                    if str(tag).strip()
                ]

            elif isinstance(tags, str):
                tag_values = [
                    tag.strip().lower()
                    for tag in re.split(
                        r"[,|]",
                        tags
                    )
                    if tag.strip()
                ]

            else:
                tag_values = [
                    str(tags).lower().strip()
                ]

            tag_text = " ".join(tag_values)

            attributes = (
                product.attributes or {}
            )

            if isinstance(attributes, dict):
                attribute_text = " ".join(
                    f"{key} {value}".lower()
                    for key, value
                    in attributes.items()
                )
            else:
                attribute_text = str(
                    attributes
                ).lower()

            search_text = " ".join([
                name,
                category,
                subcategory,
                description,
                brand,
                tag_text,
                attribute_text,
            ])

            product_data.append({
                "product": product,
                "name": name,
                "category": category,
                "subcategory": subcategory,
                "description": description,
                "brand": brand,
                "tag_values": tag_values,
                "tag_text": tag_text,
                "attribute_text": attribute_text,
                "search_text": search_text,
            })

        # =====================================================
        # 5. DETECT EXPLICIT CATALOGUE INTENT
        #
        # No hardcoded laptop/watch/backpack list.
        # Everything comes from merchant catalogue.
        # =====================================================

        explicit_matches = []

        for data in product_data:
            direct_score = 0.0
            direct_reasons = []

            # Exact product name
            if (
                data["name"]
                and data["name"] in query_lower
            ):
                direct_score += 150
                direct_reasons.append(
                    data["name"]
                )

            # Exact subcategory
            if (
                data["subcategory"]
                and re.search(
                    rf"\b{re.escape(data['subcategory'])}\b",
                    query_lower,
                )
            ):
                direct_score += 120
                direct_reasons.append(
                    data["subcategory"]
                )

            # Exact category
            if (
                data["category"]
                and re.search(
                    rf"\b{re.escape(data['category'])}\b",
                    query_lower,
                )
            ):
                direct_score += 90
                direct_reasons.append(
                    data["category"]
                )

            # Tags/context
            for tag in data["tag_values"]:
                if (
                    len(tag) >= 3
                    and re.search(
                        rf"\b{re.escape(tag)}\b",
                        query_lower,
                    )
                ):
                    direct_score += 20
                    direct_reasons.append(tag)

            # Individual catalogue terms
            catalogue_terms = set(
                re.findall(
                    r"[a-zA-Z]+",
                    " ".join([
                        data["name"],
                        data["category"],
                        data["subcategory"],
                    ]),
                )
            )

            for term in intent_terms:
                if term in catalogue_terms:
                    direct_score += 35
                    direct_reasons.append(term)

            if direct_score > 0:
                explicit_matches.append({
                    "product_id":
                        data["product"].id,

                    "score":
                        direct_score,

                    "reasons":
                        list(
                            dict.fromkeys(
                                direct_reasons
                            )
                        ),
                })

        # =====================================================
        # 6. GENERIC BUDGET QUERY
        #
        # anything under 1000
        # products below 5000
        # =====================================================

        generic_budget_query = (
            max_budget is not None
            and len(intent_terms) == 0
        )

        # =====================================================
        # 7. SEMANTIC SCORES
        # =====================================================

        semantic_scores = get_semantic_scores(
            query,
            products,
        )

        # =====================================================
        # 8. SCORE PRODUCTS
        # =====================================================

        scored_products = []

        for index, data in enumerate(product_data):
            product = data["product"]

            try:
                if isinstance(semantic_scores, dict):
                    raw_score = semantic_scores.get(
                        product.id,
                        semantic_scores.get(
                            str(product.id),
                            0.0
                        )
                    )
                else:
                    raw_score = semantic_scores[index]

                semantic_score = float(raw_score)

            except (
                TypeError,
                ValueError,
                IndexError,
                KeyError,
            ):
                semantic_score = 0.0

            keyword_score = 0.0
            matched_terms = []

            for term in intent_terms:
                matched = False

                if re.search(
                    rf"\b{re.escape(term)}\b",
                    data["name"],
                ):
                    keyword_score += 10
                    matched = True

                if re.search(
                    rf"\b{re.escape(term)}\b",
                    data["subcategory"],
                ):
                    keyword_score += 9
                    matched = True

                if re.search(
                    rf"\b{re.escape(term)}\b",
                    data["category"],
                ):
                    keyword_score += 8
                    matched = True

                if re.search(
                    rf"\b{re.escape(term)}\b",
                    data["tag_text"],
                ):
                    keyword_score += 6
                    matched = True

                if re.search(
                    rf"\b{re.escape(term)}\b",
                    data["attribute_text"],
                ):
                    keyword_score += 4
                    matched = True

                if re.search(
                    rf"\b{re.escape(term)}\b",
                    data["description"],
                ):
                    keyword_score += 3
                    matched = True

                if re.search(
                    rf"\b{re.escape(term)}\b",
                    data["brand"],
                ):
                    keyword_score += 2
                    matched = True

                if matched:
                    matched_terms.append(term)

            explicit_score = 0.0

            for explicit in explicit_matches:
                if (
                    explicit["product_id"]
                    == product.id
                ):
                    explicit_score = (
                        explicit["score"]
                    )

                    matched_terms.extend(
                        explicit["reasons"]
                    )

                    break

            match_score = (
                keyword_score
                + (semantic_score * 20)
                + explicit_score
            )

            scored_products.append({
                "db_product":
                    product,

                "semantic_score":
                    semantic_score,

                "keyword_score":
                    keyword_score,

                "explicit_score":
                    explicit_score,

                "match_score":
                    match_score,

                "matched_terms":
                    list(
                        dict.fromkeys(
                            matched_terms
                        )
                    ),
            })

        # =====================================================
        # 9. SERIALIZER
        # =====================================================

        def serialize_product(
            scored,
            budget=None,
            over_budget=False,
        ):
            product = scored[
                "db_product"
            ]

            price = float(
                product.price
            )

            reasons = []

            if (
                budget is not None
                and price <= budget
            ):
                reasons.append(
                    f"Within your budget of ₹{budget:,.0f}"
                )

            if (
                budget is not None
                and over_budget
                and price > budget
            ):
                difference = (
                    price - budget
                )

                reasons.append(
                    (
                        "Closest relevant option, "
                        f"but ₹{difference:,.0f} "
                        "above your budget"
                    )
                )

            if scored["matched_terms"]:
                reasons.append(
                    (
                        "Matches request signals: "
                        + ", ".join(
                            scored[
                                "matched_terms"
                            ][:3]
                        )
                    )
                )

            if (
                scored["semantic_score"]
                >= 0.20
            ):
                reasons.append(
                    (
                        "Semantically relevant to "
                        "your natural-language requirement"
                    )
                )

            if product.stock > 0:
                reasons.append(
                    "Currently available in stock"
                )

            return {
                "id":
                    product.id,

                "productName":
                    product.productName,

                "category":
                    product.category,

                "subcategory":
                    product.subcategory,

                "description":
                    product.description,

                "brand":
                    product.brand,

                "price":
                    price,

                "stock":
                    product.stock,

                "tags":
                    product.tags,

                "attributes":
                    product.attributes,

                "match_score":
                    round(
                        scored["match_score"],
                        4,
                    ),

                "semantic_score":
                    round(
                        scored[
                            "semantic_score"
                        ],
                        4,
                    ),

                "keyword_score":
                    round(
                        scored[
                            "keyword_score"
                        ],
                        2,
                    ),

                "matched_terms":
                    scored[
                        "matched_terms"
                    ],

                "reasons":
                    reasons,
            }

        # =====================================================
        # MODE A — GENERIC BUDGET SEARCH
        #
        # Example:
        # anything under 1000
        # =====================================================

        if generic_budget_query:
            eligible = [
                item
                for item
                in scored_products
                if float(
                    item[
                        "db_product"
                    ].price
                ) <= max_budget
            ]

            eligible.sort(
                key=lambda item: (
                    float(
                        item[
                            "db_product"
                        ].price
                    ),
                    -item[
                        "semantic_score"
                    ],
                )
            )

            if eligible:
                return {
                    "query": query,

                    "max_budget":
                        max_budget,

                    "recommendations": [
                        serialize_product(
                            item,
                            max_budget,
                        )
                        for item
                        in eligible[:5]
                    ],

                    "message":
                        (
                            f"Found {len(eligible)} "
                            f"available product"
                            f"{'s' if len(eligible) != 1 else ''} "
                            f"within ₹{max_budget:,.0f}."
                        ),

                    "closest_match":
                        None,
                }

            cheapest = min(
                scored_products,
                key=lambda item: float(
                    item[
                        "db_product"
                    ].price
                ),
            )

            cheapest_product = (
                cheapest[
                    "db_product"
                ]
            )

            cheapest_price = float(
                cheapest_product.price
            )

            return {
                "query":
                    query,

                "max_budget":
                    max_budget,

                "recommendations":
                    [],

                "message":
                    (
                        f"No product is currently available "
                        f"within ₹{max_budget:,.0f}. "
                        f"The lowest-priced available product "
                        f"is {cheapest_product.productName} "
                        f"at ₹{cheapest_price:,.0f}."
                    ),

                "closest_match":
                    serialize_product(
                        cheapest,
                        max_budget,
                        over_budget=True,
                    ),
            }

        # =====================================================
        # 10. SELECT RELEVANT PRODUCTS
        # =====================================================

        if explicit_matches:
            highest_explicit_score = max(
                match["score"]
                for match in explicit_matches
            )

            # If strong product/category intent exists,
            # ignore weak contextual matches.
            if highest_explicit_score >= 80:
                minimum_allowed_score = (
                    highest_explicit_score
                    * 0.5
                )

                allowed_ids = {
                    match["product_id"]
                    for match
                    in explicit_matches
                    if (
                        match["score"]
                        >= minimum_allowed_score
                    )
                }

            else:
                # Only contextual/tag matches
                allowed_ids = {
                    match["product_id"]
                    for match
                    in explicit_matches
                }

            relevant = [
                item
                for item
                in scored_products
                if (
                    item[
                        "db_product"
                    ].id
                    in allowed_ids
                )
            ]

        else:
            # Natural language requirement
            relevant = [
                item
                for item
                in scored_products
                if (
                    item[
                        "keyword_score"
                    ] > 0
                    or item[
                        "semantic_score"
                    ] >= 0.30
                )
            ]

        relevant.sort(
            key=lambda item:
                item["match_score"],
            reverse=True,
        )

        # =====================================================
        # NO RELEVANT PRODUCT
        # =====================================================

        if not relevant:
            return {
                "query":
                    query,

                "max_budget":
                    max_budget,

                "recommendations":
                    [],

                "message":
                    (
                        "No suitable product matching "
                        "your requirement is currently "
                        "available in the catalogue."
                    ),

                "closest_match":
                    None,
            }

        # =====================================================
        # MODE B — REQUIREMENT + BUDGET
        #
        # laptop under 10000
        # =====================================================

        if max_budget is not None:
            eligible = [
                item
                for item
                in relevant
                if float(
                    item[
                        "db_product"
                    ].price
                ) <= max_budget
            ]

            if eligible:
                eligible.sort(
                    key=lambda item: (
                        -item[
                            "match_score"
                        ],
                        float(
                            item[
                                "db_product"
                            ].price
                        ),
                    )
                )

                return {
                    "query":
                        query,

                    "max_budget":
                        max_budget,

                    "recommendations": [
                        serialize_product(
                            item,
                            max_budget,
                        )
                        for item
                        in eligible[:5]
                    ],

                    "message":
                        None,

                    "closest_match":
                        None,
                }

            # =================================================
            # MATCH EXISTS, BUT BUDGET TOO LOW
            # =================================================

            cheapest_relevant = min(
                relevant,
                key=lambda item: float(
                    item[
                        "db_product"
                    ].price
                ),
            )

            closest_product = (
                cheapest_relevant[
                    "db_product"
                ]
            )

            closest_price = float(
                closest_product.price
            )

            difference = (
                closest_price
                - max_budget
            )

            product_type = (
                closest_product.subcategory
                or closest_product.category
                or "product"
            )

            return {
                "query":
                    query,

                "max_budget":
                    max_budget,

                # Do not recommend it as purchasable
                # because it violates customer's budget.
                "recommendations":
                    [],

                "message":
                    (
                        f"No suitable {product_type} is "
                        f"currently available within "
                        f"₹{max_budget:,.0f}. "
                        f"The lowest-priced relevant option "
                        f"is {closest_product.productName} "
                        f"at ₹{closest_price:,.0f}, "
                        f"which is ₹{difference:,.0f} "
                        f"above your budget."
                    ),

                "closest_match":
                    serialize_product(
                        cheapest_relevant,
                        max_budget,
                        over_budget=True,
                    ),
            }

        # =====================================================
        # MODE C — REQUIREMENT WITHOUT BUDGET
        # =====================================================

        return {
            "query":
                query,

            "max_budget":
                None,

            "recommendations": [
                serialize_product(item)
                for item
                in relevant[:5]
            ],

            "message":
                None,

            "closest_match":
                None,
        }

    finally:
        db.close()
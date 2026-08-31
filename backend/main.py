from urllib import request

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import re
import models
from datetime import datetime, timedelta, timezone
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


class PaymentApprovalRequest(BaseModel):
    items: list[CartItemRequest]
    max_budget: float | None = None


class PaymentOrderRequest(BaseModel):
    approval_id: str


class PaymentVerifyRequest(BaseModel):
    payment_session_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

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

@app.post("/policy/check")
def check_policy(request: PolicyRequest):
    db = SessionLocal()

    # Every policy decision gets its own reference ID
    policy_reference_id = f"policy_{uuid.uuid4().hex[:12]}"

    try:
        checks = []
        server_total = 0.0

        stock_passed = True
        quantity_passed = True
        catalogue_passed = True

        # -----------------------------
        # Empty cart check
        # -----------------------------

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
                },
            )

            return {
                "passed": False,
                "decision": "BLOCKED",
                "server_total": 0,
                "reference_id": policy_reference_id,
                "checks": [
                    {
                        "name": "Cart Check",
                        "passed": False,
                        "message": "Cart is empty"
                    }
                ]
            }

        # -----------------------------
        # Validate every cart item
        # -----------------------------

        for item in request.items:
            product = (
                db.query(models.Product)
                .filter(
                    models.Product.id
                    == item.product_id
                )
                .first()
            )

            # Product must exist
            if not product:
                catalogue_passed = False
                continue

            # Quantity must be valid
            if item.quantity <= 0:
                quantity_passed = False
                continue

            # Quantity cannot exceed stock
            if item.quantity > product.stock:
                stock_passed = False

            server_total += (
                float(product.price)
                * item.quantity
            )

        # -----------------------------
        # Catalogue check
        # -----------------------------

        checks.append({
            "name": "Catalogue Check",
            "passed": catalogue_passed,
            "message":
                "All products exist in the merchant catalogue"
                if catalogue_passed
                else "One or more products no longer exist"
        })

        # -----------------------------
        # Quantity check
        # -----------------------------

        checks.append({
            "name": "Quantity Check",
            "passed": quantity_passed,
            "message":
                "All quantities are valid"
                if quantity_passed
                else "One or more quantities are invalid"
        })

        # -----------------------------
        # Stock check
        # -----------------------------

        checks.append({
            "name": "Stock Check",
            "passed": stock_passed,
            "message":
                "Requested quantities are available"
                if stock_passed
                else "Requested quantity exceeds available stock"
        })

        # -----------------------------
        # Budget check
        # -----------------------------

        budget_passed = True

        if request.max_budget is not None:
            budget_passed = (
                server_total
                <= request.max_budget
            )

            checks.append({
                "name": "Budget Check",
                "passed": budget_passed,
                "message":
                    (
                        f"Cart total ₹{server_total:,.0f} "
                        f"is within budget ₹{request.max_budget:,.0f}"
                    )
                    if budget_passed
                    else
                    (
                        f"Cart total ₹{server_total:,.0f} "
                        f"exceeds budget ₹{request.max_budget:,.0f}"
                    )
            })
        else:
            checks.append({
                "name": "Budget Check",
                "passed": True,
                "message": "No maximum budget was specified"
            })

        # -----------------------------
        # Final decision
        # -----------------------------

        passed = (
            catalogue_passed
            and quantity_passed
            and stock_passed
            and budget_passed
        )

        decision = (
            "APPROVED"
            if passed
            else "BLOCKED"
        )

        # -----------------------------
        # Audit Trail
        # -----------------------------

        create_audit_log(
            event_type=(
                "POLICY_APPROVED"
                if passed
                else "POLICY_BLOCKED"
            ),
            status=decision,
            reference_id=policy_reference_id,
            message=(
                "Policy engine approved the cart."
                if passed
                else "Policy engine blocked the cart."
            ),
            details={
                "items": [
                    {
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                    }
                    for item in request.items
                ],
                "server_total": round(server_total, 2),
                "max_budget": request.max_budget,
                "catalogue_passed": catalogue_passed,
                "quantity_passed": quantity_passed,
                "stock_passed": stock_passed,
                "budget_passed": budget_passed,
            },
        )

        return {
            "passed": passed,
            "decision": decision,
            "reference_id": policy_reference_id,
            "server_total": round(
                server_total,
                2
            ),
            "max_budget":
                request.max_budget,
            "checks": checks
        }

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
        # -----------------------------
        # Empty cart
        # -----------------------------

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
                },
            )

            raise HTTPException(
                status_code=400,
                detail="Cart is empty"
            )

        validated_items = []
        server_total = 0.0

        # -----------------------------
        # Validate items
        # -----------------------------

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
                    },
                )

                raise HTTPException(
                    status_code=404,
                    detail="Product not found"
                )

            if item.quantity <= 0:
                create_audit_log(
                    event_type="APPROVAL_BLOCKED",
                    status="BLOCKED",
                    reference_id=approval_attempt_id,
                    message=(
                        "Purchase approval blocked "
                        "because quantity was invalid."
                    ),
                    details={
                        "reason": "INVALID_QUANTITY",
                        "product_id": product.id,
                        "quantity": item.quantity,
                    },
                )

                raise HTTPException(
                    status_code=400,
                    detail="Invalid quantity"
                )

            if item.quantity > product.stock:
                create_audit_log(
                    event_type="APPROVAL_BLOCKED",
                    status="BLOCKED",
                    reference_id=approval_attempt_id,
                    message=(
                        "Purchase approval blocked "
                        "because stock was insufficient."
                    ),
                    details={
                        "reason": "INSUFFICIENT_STOCK",
                        "product_id": product.id,
                        "requested_quantity":
                            item.quantity,
                        "available_stock":
                            product.stock,
                    },
                )

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Insufficient stock for "
                        f"{product.productName}"
                    )
                )

            item_total = (
                float(product.price)
                * item.quantity
            )

            server_total += item_total

            validated_items.append({
                "product_id": product.id,
                "product_name":
                    product.productName,
                "quantity": item.quantity,
                "unit_price":
                    float(product.price),
            })

        # -----------------------------
        # Budget validation
        # -----------------------------

        if (
            request.max_budget is not None
            and server_total > request.max_budget
        ):
            create_audit_log(
                event_type="APPROVAL_BLOCKED",
                status="BLOCKED",
                reference_id=approval_attempt_id,
                message=(
                    "Purchase approval blocked "
                    "because the cart exceeded "
                    "the budget."
                ),
                details={
                    "reason": "BUDGET_EXCEEDED",
                    "server_total":
                        round(server_total, 2),
                    "max_budget":
                        request.max_budget,
                },
            )

            raise HTTPException(
                status_code=400,
                detail="Cart exceeds approved budget"
            )

        # -----------------------------
        # Create persistent approval
        # -----------------------------

        approval_id = (
            "approval_"
            + uuid.uuid4().hex
        )

        created_at = (
            datetime.now(timezone.utc)
            .replace(tzinfo=None)
        )

        expires_at = (
            created_at
            + timedelta(minutes=10)
        )

        persistent_approval = (
            models.PurchaseApproval(
                approval_id=approval_id,
                items=validated_items,
                amount_rupees=round(
                    server_total,
                    2
                ),
                max_budget=request.max_budget,
                used=False,
                created_at=created_at,
                expires_at=expires_at,
            )
        )

        db.add(persistent_approval)
        db.commit()
        db.refresh(persistent_approval)

        # -----------------------------
        # Temporary memory cache
        # -----------------------------
        # Kept only while create-order
        # is migrated to database storage.
        # -----------------------------
        # Audit successful approval
        # -----------------------------

        create_audit_log(
            event_type="USER_APPROVED",
            status="APPROVED",
            reference_id=approval_id,
            message="User approved the purchase.",
            details={
                "items": validated_items,
                "amount":
                    round(server_total, 2),
                "max_budget":
                    request.max_budget,
                "expires_in_seconds": 600,
                "persistent": True,
            },
        )

        return {
            "approved": True,
            "approval_id": approval_id,
            "amount": round(
                server_total,
                2
            ),
            "expires_in_seconds": 600,
            "message":
                "Purchase approval recorded"
        }

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

        current_total = 0.0

        approval_items = approval.items or []

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

            current_total += (
                float(product.price)
                * item["quantity"]
            )

        # -----------------------------
        # Price revalidation
        # -----------------------------

        approved_amount = float(
            approval.amount_rupees
        )

        if round(current_total, 2) != round(
            approved_amount,
            2
        ):
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
                        round(current_total, 2),
                },
            )

            raise HTTPException(
                status_code=409,
                detail=(
                    "Product pricing changed. "
                    "Approval must be repeated."
                )
            )

        # -----------------------------
        # Create Razorpay Test order
        # -----------------------------

        amount_in_paise = int(
            round(current_total * 100)
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
                "mode": "buildathon-test"
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
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    JSON,
    DateTime,
    Boolean,
    func,
)

from database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    productName = Column(
        String,
        nullable=False
    )

    category = Column(
        String,
        nullable=False
    )

    subcategory = Column(
        String,
        nullable=True
    )

    description = Column(
        String,
        nullable=False
    )

    brand = Column(
        String,
        nullable=True
    )

    price = Column(
        Float,
        nullable=False
    )

    stock = Column(
        Integer,
        nullable=False
    )

    tags = Column(
        JSON,
        nullable=True
    )

    attributes = Column(
        JSON,
        nullable=True
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    event_type = Column(
        String,
        nullable=False,
        index=True
    )

    status = Column(
        String,
        nullable=False,
        index=True
    )

    reference_id = Column(
        String,
        nullable=True,
        index=True
    )

    message = Column(
        String,
        nullable=False
    )

    details = Column(
        JSON,
        nullable=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )


class PurchaseApproval(Base):
    __tablename__ = "purchase_approvals"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    approval_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    items = Column(
        JSON,
        nullable=False
    )

    amount_rupees = Column(
        Float,
        nullable=False
    )

    max_budget = Column(
        Float,
        nullable=True
    )

    used = Column(
        Boolean,
        nullable=False,
        default=False
    )

    created_at = Column(
        DateTime,
        nullable=False
    )

    expires_at = Column(
        DateTime,
        nullable=False,
        index=True
    )


class PaymentSession(Base):
    __tablename__ = "payment_sessions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    payment_session_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    approval_id = Column(
        String,
        nullable=False,
        index=True
    )

    razorpay_order_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    razorpay_payment_id = Column(
        String,
        unique=True,
        nullable=True,
        index=True
    )

    amount_paise = Column(
        Integer,
        nullable=False
    )

    currency = Column(
        String,
        nullable=False,
        default="INR"
    )

    receipt = Column(
        String,
        nullable=True
    )

    status = Column(
        String,
        nullable=False,
        default="CREATED",
        index=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    payment_session_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    approval_id = Column(
        String,
        nullable=False,
        index=True
    )

    razorpay_order_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    razorpay_payment_id = Column(
        String,
        unique=True,
        nullable=True,
        index=True
    )

    amount_paise = Column(
        Integer,
        nullable=False
    )

    currency = Column(
        String,
        nullable=False,
        default="INR"
    )

    receipt = Column(
        String,
        nullable=True
    )

    status = Column(
        String,
        nullable=False,
        default="CREATED",
        index=True
    )

    items = Column(
        JSON,
        nullable=False
    )

    max_budget = Column(
        Float,
        nullable=True
    )

    fulfilled = Column(
        Boolean,
        nullable=False,
        default=False
    )

    failure_reason = Column(
        String,
        nullable=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )


# =========================================================
# PRICING / OFFER LAYER
# =========================================================


class OfferCampaign(Base):
    __tablename__ = "offer_campaigns"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    # Offer can target one product, brand, category,
    # or a combination of these filters.
    product_id = Column(
        Integer,
        nullable=True,
        index=True
    )

    brand = Column(
        String,
        nullable=True,
        index=True
    )

    category = Column(
        String,
        nullable=True,
        index=True
    )

    discount_type = Column(
        String,
        nullable=False
    )
    # Supported values will be validated in backend:
    # PERCENTAGE / FLAT

    discount_value = Column(
        Float,
        nullable=False
    )

    min_order_value = Column(
        Float,
        nullable=True
    )

    max_discount = Column(
        Float,
        nullable=True
    )

    starts_at = Column(
        DateTime,
        nullable=False,
        index=True
    )

    ends_at = Column(
        DateTime,
        nullable=False,
        index=True
    )

    active = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )


class TaxRule(Base):
    __tablename__ = "tax_rules"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    category = Column(
        String,
        nullable=True,
        index=True
    )

    subcategory = Column(
        String,
        nullable=True,
        index=True
    )

    rate_percent = Column(
        Float,
        nullable=False
    )

    active = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True
    )

    effective_from = Column(
        DateTime,
        nullable=True,
        index=True
    )

    effective_to = Column(
        DateTime,
        nullable=True,
        index=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )


class CheckoutQuote(Base):
    __tablename__ = "checkout_quotes"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    quote_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    # Filled when user explicitly approves the quote.
    approval_id = Column(
        String,
        unique=True,
        nullable=True,
        index=True
    )

    items = Column(
        JSON,
        nullable=False
    )

    subtotal_rupees = Column(
        Float,
        nullable=False
    )

    discount_rupees = Column(
        Float,
        nullable=False,
        default=0.0
    )

    tax_rupees = Column(
        Float,
        nullable=False,
        default=0.0
    )

    shipping_rupees = Column(
        Float,
        nullable=False,
        default=0.0
    )

    social_contribution_rupees = Column(
        Float,
        nullable=False,
        default=0.0
    )

    social_cause = Column(
        String,
        nullable=True
    )

    grand_total_rupees = Column(
        Float,
        nullable=False
    )

    max_budget = Column(
        Float,
        nullable=True
    )

    # Stores offer IDs, tax lines, per-item pricing,
    # and other explainable calculation details.
    pricing_details = Column(
        JSON,
        nullable=True
    )

    status = Column(
        String,
        nullable=False,
        default="QUOTED",
        index=True
    )

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    expires_at = Column(
        DateTime,
        nullable=False,
        index=True
    )

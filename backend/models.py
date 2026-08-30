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
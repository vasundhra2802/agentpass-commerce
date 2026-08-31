from fastapi.testclient import TestClient
from main import app
import pytest
import main
import models

from database import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


client = TestClient(app)


@pytest.fixture
def isolated_db(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={
            "check_same_thread": False
        },
        poolclass=StaticPool,
    )

    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )

    Base.metadata.create_all(bind=engine)

    monkeypatch.setattr(
        main,
        "SessionLocal",
        TestingSessionLocal,
    )

    yield TestingSessionLocal

    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def create_test_product(
    isolated_db,
    price=399.0,
    stock=10,
):
    db = isolated_db()

    product = models.Product(
        productName="Test Power Cable",
        category="Electronics",
        subcategory="Charging Cable",
        description=(
            "Compact charging cable suitable "
            "for phones and everyday use."
        ),
        brand="TestBrand",
        price=price,
        stock=stock,
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    product_id = product.id

    db.close()

    return product_id

def add_five_percent_tax(isolated_db):
    db = isolated_db()

    tax_rule = models.TaxRule(
        name="Automated Test Tax",
        rate_percent=5.0,
        active=True,
    )

    db.add(tax_rule)
    db.commit()
    db.close()

def create_test_product(
    isolated_db,
    price=399.0,
    stock=10,
):
    db = isolated_db()

    product = models.Product(
        productName="Test Power Cable",
        category="Electronics",
        subcategory="Charging Cable",
        description=(
            "Compact charging cable suitable "
            "for phones and everyday use."
        ),
        brand="TestBrand",
        price=price,
        stock=stock,
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    product_id = product.id

    db.close()

    return product_id
def test_payment_failure_route_is_registered():
    route = next(
        (
            route
            for route in app.routes
            if route.path == "/payment/failure"
        ),
        None,
    )

    assert route is not None
    assert "POST" in route.methods


def test_checkout_quote_route_is_registered():
    route = next(
        (
            route
            for route in app.routes
            if route.path == "/checkout/quote"
        ),
        None,
    )

    assert route is not None
    assert "POST" in route.methods


def test_payment_failure_rejects_invalid_status():
    response = client.post(
        "/payment/failure",
        json={
            "payment_session_id": "test_session",
            "status": "PENDING",
            "reason": "Automated test",
        },
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Invalid payment failure status"
    )


def test_payment_failure_returns_404_for_missing_session(
    isolated_db,
):
    response = client.post(
        "/payment/failure",
        json={
            "payment_session_id":
                "nonexistent_payment_session",
            "status": "FAILED",
            "reason": "Automated test",
        },
    )

    assert response.status_code == 404


def test_checkout_quote_calculates_final_amount_correctly(
    isolated_db,
):
    product_id = create_test_product(
        isolated_db,
        price=399.0,
        stock=10,
    )

    add_five_percent_tax(isolated_db)

    response = client.post(
        "/checkout/quote",
        json={
            "items": [
                {
                    "product_id": product_id,
                    "quantity": 1,
                }
            ],
            "max_budget": 500,
            "social_contribution_rupees": 1,
            "social_cause": "EDUCATION",
            "delivery_zone": "FAR",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["subtotal"] == 399.0
    assert data["discount"] == 0.0
    assert data["tax"] == 19.95
    assert data["shipping"] == 100.0
    assert data["social_contribution"] == 1.0
    assert data["grand_total"] == 519.95
    assert data["budget_passed"] is False

    assert data["quote_id"]


def test_budget_exceeded_is_blocked_by_policy(
    isolated_db,
):
    product_id = create_test_product(
        isolated_db,
        price=399.0,
        stock=10,
    )

    add_five_percent_tax(isolated_db)

    quote_response = client.post(
        "/checkout/quote",
        json={
            "items": [
                {
                    "product_id": product_id,
                    "quantity": 1,
                }
            ],
            "max_budget": 500,
            "social_contribution_rupees": 1,
            "social_cause": "EDUCATION",
            "delivery_zone": "FAR",
        },
    )

    assert quote_response.status_code == 200

    quote = quote_response.json()

    assert quote["grand_total"] == 519.95
    assert quote["budget_passed"] is False

    policy_response = client.post(
        "/policy/check",
        json={
            "items": [
                {
                    "product_id": product_id,
                    "quantity": 1,
                }
            ],
            "max_budget": 500,
            "quote_id": quote["quote_id"],
        },
    )

    assert policy_response.status_code == 200

    db = isolated_db()

    blocked_log = (
        db.query(models.AuditLog)
        .filter(
            models.AuditLog.event_type
            == "POLICY_BLOCKED"
        )
        .order_by(models.AuditLog.id.desc())
        .first()
    )

    assert blocked_log is not None
    assert blocked_log.status == "BLOCKED"

    assert (
        blocked_log.details["budget_passed"]
        is False
    )

    assert (
        blocked_log.details["server_total"]
        == 519.95
    )

    assert (
        blocked_log.details["max_budget"]
        == 500
    )

    db.close()


def test_invalid_delivery_zone_is_rejected(
    isolated_db,
):
    product_id = create_test_product(
        isolated_db,
    )

    response = client.post(
        "/checkout/quote",
        json={
            "items": [
                {
                    "product_id": product_id,
                    "quantity": 1,
                }
            ],
            "max_budget": 1000,
            "delivery_zone": "UNKNOWN",
            "social_contribution_rupees": 0,
            "social_cause": None,
        },
    )

    assert response.status_code == 400


def test_fulfilled_transaction_cannot_be_marked_failed(
    isolated_db,
):
    db = isolated_db()

    payment_session_id = (
        "pay_session_fulfilled_test"
    )

    session = models.PaymentSession(
        payment_session_id=payment_session_id,
        approval_id="approval_test",
        razorpay_order_id=(
            "order_fulfilled_test"
        ),
        amount_paise=39900,
        currency="INR",
        status="FULFILLED",
    )

    transaction = models.PaymentTransaction(
        payment_session_id=payment_session_id,
        approval_id="approval_test",
        razorpay_order_id=(
            "order_fulfilled_test"
        ),
        amount_paise=39900,
        currency="INR",
        status="FULFILLED",
        items=[
            {
                "product_id": 1,
                "quantity": 1,
            }
        ],
        fulfilled=True,
    )

    db.add(session)
    db.add(transaction)
    db.commit()
    db.close()

    response = client.post(
        "/payment/failure",
        json={
            "payment_session_id":
                payment_session_id,
            "status": "FAILED",
            "reason":
                "Automated overwrite attempt",
        },
    )

    assert response.status_code == 409

    assert response.json()["detail"] == (
        "A fulfilled transaction cannot "
        "be marked as failed or cancelled"
    )

    db = isolated_db()

    saved_transaction = (
        db.query(models.PaymentTransaction)
        .filter(
            models.PaymentTransaction
            .payment_session_id
            == payment_session_id
        )
        .first()
    )

    assert (
        saved_transaction.status
        == "FULFILLED"
    )

    assert saved_transaction.fulfilled is True

    db.close()
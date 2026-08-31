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
def test_payment_failure_returns_404_for_missing_session():
    response = client.post(
        "/payment/failure",
        json={
            "payment_session_id": "nonexistent_fulfilled_test",
            "status": "FAILED",
            "reason": "Automated test",
        },
    )

    # Nonexistent sessions should fail safely.
    assert response.status_code == 404
def test_fulfilled_transaction_cannot_be_marked_failed(
    isolated_db,
):
    db = isolated_db()

    payment_session_id = "pay_session_fulfilled_test"

    session = models.PaymentSession(
        payment_session_id=payment_session_id,
        approval_id="approval_test",
        razorpay_order_id="order_fulfilled_test",
        amount_paise=39900,
        currency="INR",
        status="FULFILLED",
    )

    transaction = models.PaymentTransaction(
        payment_session_id=payment_session_id,
        approval_id="approval_test",
        razorpay_order_id="order_fulfilled_test",
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
            "reason": "Automated overwrite attempt",
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
            models.PaymentTransaction.payment_session_id
            == payment_session_id
        )
        .first()
    )

    assert saved_transaction.status == "FULFILLED"
    assert saved_transaction.fulfilled is True

    db.close()
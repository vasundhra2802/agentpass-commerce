from sqlalchemy import Column, Integer, String, Float, JSON
from database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)

    productName = Column(String, nullable=False)

    category = Column(String, nullable=False)

    subcategory = Column(String, nullable=True)

    description = Column(String, nullable=False)

    brand = Column(String, nullable=True)

    price = Column(Float, nullable=False)

    stock = Column(Integer, nullable=False)

    tags = Column(JSON, nullable=True)

    attributes = Column(JSON, nullable=True)
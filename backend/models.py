from sqlalchemy import Column, Integer, String, Float
from database import Base



class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    productName = Column(String, nullable=False)
    category = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    colour = Column(String, nullable=False)
    size = Column(String, nullable=False)
    stock = Column(Integer, nullable=False)

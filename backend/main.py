from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import models
from database import SessionLocal, engine,SessionLocal
models.Base.metadata.create_all(bind=engine)
class Product(BaseModel):
    productName: str
    category: str
    price: float
    colour: str
    size: str
    stock: int

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
        price=product.price,
        colour=product.colour,
        size=product.size,
        stock=product.stock
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    db.close()
    return{
        "message": "Product saved successfully",
        "product": {
            "id": db_product.id,
            "productName": db_product.productName,
            "category": db_product.category,
            "price": db_product.price,
            "colour": db_product.colour,
            "size": db_product.size,
            "stock": db_product.stock
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
                "price": product.price,
                "colour": product.colour,
                "size": product.size,
                "stock": product.stock
            })
            db.close()

            return result
    
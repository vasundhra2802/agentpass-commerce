from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

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
    return {
        "message": "Product received successfully",
        "product":product
    }
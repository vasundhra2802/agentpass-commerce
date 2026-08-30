from database import SessionLocal, engine
import models


# Create tables if they do not already exist
models.Base.metadata.create_all(bind=engine)


DEMO_PRODUCTS = [
    {
        "productName": "UrbanTime Classic",
        "category": "Accessories",
        "subcategory": "Watch",
        "description": "A classic wrist watch designed for office and everyday use.",
        "brand": "UrbanTime",
        "price": 5999,
        "stock": 12,
        "tags": [
            "watch",
            "office",
            "classic",
            "wrist",
            "formal",
        ],
        "attributes": {
            "style": "classic",
            "use_case": "office",
        },
    },
    {
        "productName": "TrailPack Lite",
        "category": "Bags",
        "subcategory": "Backpack",
        "description": "A lightweight backpack suitable for travel and daily carrying.",
        "brand": "TrailPack",
        "price": 2499,
        "stock": 14,
        "tags": [
            "travel",
            "backpack",
            "lightweight",
            "daily",
        ],
        "attributes": {
            "type": "backpack",
            "use_case": "travel",
        },
    },
    {
        "productName": "Pocket Power Cable",
        "category": "Electronics",
        "subcategory": "Charging Cable",
        "description": "A compact charging cable useful for travel and everyday device charging.",
        "brand": "PocketTech",
        "price": 399,
        "stock": 25,
        "tags": [
            "charging",
            "cable",
            "travel",
            "electronics",
        ],
        "attributes": {
            "type": "charging cable",
            "portable": "yes",
        },
    },
    {
        "productName": "Minimal Wrist Band",
        "category": "Accessories",
        "subcategory": "Wrist Band",
        "description": "A simple lightweight wrist accessory for casual everyday wear.",
        "brand": "Minimal",
        "price": 599,
        "stock": 20,
        "tags": [
            "wrist",
            "accessory",
            "casual",
        ],
        "attributes": {
            "style": "minimal",
            "use_case": "casual",
        },
    },
    {
        "productName": "Mini Travel Pouch",
        "category": "Bags",
        "subcategory": "Travel Pouch",
        "description": "A compact pouch for carrying small travel essentials and accessories.",
        "brand": "TrailPack",
        "price": 749,
        "stock": 18,
        "tags": [
            "travel",
            "pouch",
            "portable",
            "accessories",
        ],
        "attributes": {
            "type": "travel pouch",
            "use_case": "travel",
        },
    },
    {
        "productName": "Everyday Digital Watch",
        "category": "Accessories",
        "subcategory": "Watch",
        "description": "An affordable digital watch designed for everyday use.",
        "brand": "Everyday",
        "price": 899,
        "stock": 16,
        "tags": [
            "watch",
            "digital",
            "wrist",
            "casual",
        ],
        "attributes": {
            "style": "digital",
            "use_case": "everyday",
        },
    },
]


def seed_products():
    db = SessionLocal()

    try:
        added_count = 0

        for product_data in DEMO_PRODUCTS:
            existing_product = (
                db.query(models.Product)
                .filter(
                    models.Product.productName
                    == product_data["productName"]
                )
                .first()
            )

            if existing_product:
                print(
                    f"Skipping existing product: "
                    f"{product_data['productName']}"
                )
                continue

            product = models.Product(**product_data)

            db.add(product)
            added_count += 1

        db.commit()

        print()
        print("Seed completed successfully.")
        print(f"New products added: {added_count}")

    except Exception as error:
        db.rollback()
        print("Seed failed:")
        print(error)

    finally:
        db.close()


if __name__ == "__main__":
    seed_products()
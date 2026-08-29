from sentence_transformers import SentenceTransformer, util
import torch



model = SentenceTransformer("all-MiniLM-L6-v2")
product_embedding_cache = {}

def product_to_text(product):
    tags = product.tags or []
    attributes = product.attributes or {}

    tags_text = " ".join(str(tag) for tag in tags)

    attributes_text = " ".join(
        f"{key} {value}"
        for key, value in attributes.items()
    )

    product_text = f"""
    Product Name: {product.productName}
    Category: {product.category}
    Subcategory: {product.subcategory or ""}
    Description: {product.description or ""}
    Brand: {product.brand or ""}
    Tags: {tags_text}
    Attributes: {attributes_text}
    """

    return product_text.strip()


def get_semantic_scores(query, products):
    if not products:
        return {}

    query_embedding = model.encode(
        query,
        convert_to_tensor=True
    )

    product_embeddings = []

    for product in products:
        product_text = product_to_text(product)

        cached_product = product_embedding_cache.get(product.id)

        if (
            cached_product is not None
            and cached_product["text"] == product_text
        ):
            product_embedding = cached_product["embedding"]

        else:
            product_embedding = model.encode(
                product_text,
                convert_to_tensor=True
            )

            product_embedding_cache[product.id] = {
                "text": product_text,
                "embedding": product_embedding
            }

        product_embeddings.append(product_embedding)

    product_embeddings_tensor = torch.stack(
        product_embeddings
    )

    similarities = util.cos_sim(
        query_embedding,
        product_embeddings_tensor
    )[0]

    scores = {}

    for index, product in enumerate(products):
        scores[product.id] = float(
            similarities[index]
        )

    return scores
import { useEffect, useState } from "react";

function App() {
  const [products, setProducts] = useState([]);

  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [tags, setTags] = useState("");

  const [attributes, setAttributes] = useState([
    { key: "", value: "" },
  ]);

  const [message, setMessage] = useState("");

  const [customerQuery, setCustomerQuery] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationLoading, setRecommendationLoading] =
    useState(false);
  const [recommendationMessage, setRecommendationMessage] =
    useState("");

  const fetchProducts = () => {
    fetch("http://127.0.0.1:8000/products")
      .then((response) => response.json())
      .then((data) => {
        setProducts(data);
      })
      .catch((error) => {
        console.error("Could not load products:", error);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAttributeChange = (index, field, value) => {
    const updatedAttributes = [...attributes];

    updatedAttributes[index][field] = value;

    setAttributes(updatedAttributes);
  };

  const addAttributeField = () => {
    setAttributes([
      ...attributes,
      { key: "", value: "" },
    ]);
  };

  const removeAttributeField = (index) => {
    const updatedAttributes = attributes.filter(
      (_, currentIndex) => currentIndex !== index
    );

    if (updatedAttributes.length === 0) {
      setAttributes([
        { key: "", value: "" },
      ]);
    } else {
      setAttributes(updatedAttributes);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const attributesObject = {};

    attributes.forEach((attribute) => {
      const key = attribute.key.trim();
      const value = attribute.value.trim();

      if (key && value) {
        attributesObject[key] = value;
      }
    });

    const tagsArray = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");

    const product = {
      productName,
      category,
      subcategory: subcategory.trim() || null,
      description,
      brand: brand.trim() || null,
      price: Number(price),
      stock: Number(stock),
      tags: tagsArray,
      attributes: attributesObject,
    };

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(product),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        setMessage("Could not save product.");
        return;
      }

      setMessage(data.message || "Product saved successfully.");

      fetchProducts();

      setProductName("");
      setCategory("");
      setSubcategory("");
      setDescription("");
      setBrand("");
      setPrice("");
      setStock("");
      setTags("");

      setAttributes([
        { key: "", value: "" },
      ]);
    } catch (error) {
      console.error(error);
      setMessage("Backend connection failed.");
    }
  };

  const handleRecommend = async () => {
    if (!customerQuery.trim()) {
      setRecommendationMessage(
        "Please describe what you are looking for."
      );
      return;
    }

    setRecommendationLoading(true);
    setRecommendationMessage("");
    setRecommendations([]);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/recommend",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: customerQuery,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setRecommendationMessage(
          "Could not get recommendations."
        );
        return;
      }

      const results = data.recommendations || [];

      setRecommendations(results);

      if (results.length === 0) {
        setRecommendationMessage(
          "No suitable products found."
        );
      }
    } catch (error) {
      console.error(error);

      setRecommendationMessage(
        "AI recommendation service unavailable."
      );
    } finally {
      setRecommendationLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

  const labelClass =
    "mb-1.5 block text-sm font-medium text-slate-700";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* Header */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              AgentPass Commerce
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              AI powered merchant catalogue and product discovery
            </p>
          </div>

          <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            AI Engine Active
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-6 py-10">

        {/* Merchant Catalogue */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-8 py-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Merchant Dashboard
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Add Product
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Add products from any category using flexible attributes.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-8 p-8"
          >
            <div className="grid gap-6 md:grid-cols-2">

              <div>
                <label className={labelClass}>
                  Product Name
                </label>

                <input
                  className={inputClass}
                  type="text"
                  value={productName}
                  onChange={(e) =>
                    setProductName(e.target.value)
                  }
                  placeholder="e.g. CodeBook Pro"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>
                  Brand
                </label>

                <input
                  className={inputClass}
                  type="text"
                  value={brand}
                  onChange={(e) =>
                    setBrand(e.target.value)
                  }
                  placeholder="e.g. TechNova"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Category
                </label>

                <input
                  className={inputClass}
                  type="text"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value)
                  }
                  placeholder="e.g. Electronics"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>
                  Subcategory
                </label>

                <input
                  className={inputClass}
                  type="text"
                  value={subcategory}
                  onChange={(e) =>
                    setSubcategory(e.target.value)
                  }
                  placeholder="e.g. Laptop"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Price
                </label>

                <input
                  className={inputClass}
                  type="number"
                  value={price}
                  onChange={(e) =>
                    setPrice(e.target.value)
                  }
                  min="0"
                  placeholder="64999"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>
                  Stock
                </label>

                <input
                  className={inputClass}
                  type="number"
                  value={stock}
                  onChange={(e) =>
                    setStock(e.target.value)
                  }
                  min="0"
                  placeholder="10"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>
                  Description
                </label>

                <textarea
                  className={`${inputClass} min-h-28 resize-none`}
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Describe the product, its purpose and important characteristics..."
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>
                  Tags
                </label>

                <input
                  className={inputClass}
                  type="text"
                  value={tags}
                  onChange={(e) =>
                    setTags(e.target.value)
                  }
                  placeholder="coding, development, productivity"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Separate tags using commas
                </p>
              </div>
            </div>

            {/* Dynamic Attributes */}

            <div className="rounded-2xl bg-slate-50 p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Dynamic Attributes
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Add specifications relevant to this product.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addAttributeField}
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  + Add Attribute
                </button>
              </div>

              <div className="space-y-3">
                {attributes.map((attribute, index) => (
                  <div
                    key={index}
                    className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                  >
                    <input
                      className={inputClass}
                      type="text"
                      placeholder="e.g. RAM"
                      value={attribute.key}
                      onChange={(e) =>
                        handleAttributeChange(
                          index,
                          "key",
                          e.target.value
                        )
                      }
                    />

                    <input
                      className={inputClass}
                      type="text"
                      placeholder="e.g. 16GB"
                      value={attribute.value}
                      onChange={(e) =>
                        handleAttributeChange(
                          index,
                          "value",
                          e.target.value
                        )
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeAttributeField(index)
                      }
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-emerald-600">
                {message}
              </p>

              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Add Product
              </button>
            </div>
          </form>
        </section>

        {/* AI Shopping Assistant */}

        <section className="rounded-3xl bg-slate-900 px-8 py-10 text-white shadow-xl">
          <div className="mx-auto max-w-3xl text-center">

            <span className="inline-flex rounded-full bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-200">
              Semantic AI Search
            </span>

            <h2 className="mt-5 text-3xl font-bold tracking-tight">
              AI Shopping Assistant
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Describe what you need naturally. The AI will understand
              your intent, budget and product requirements.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={customerQuery}
                onChange={(e) =>
                  setCustomerQuery(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRecommend();
                  }
                }}
                placeholder="e.g. I need a device for building applications under ₹70000"
                className="flex-1 rounded-2xl border border-white/10 bg-white px-5 py-4 text-sm text-slate-900 outline-none ring-indigo-500 transition focus:ring-4"
              />

              <button
                type="button"
                onClick={handleRecommend}
                disabled={recommendationLoading}
                className="rounded-2xl bg-indigo-500 px-7 py-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {recommendationLoading
                  ? "Finding..."
                  : "Find Products"}
              </button>
            </div>

            {recommendationMessage && (
              <p className="mt-4 text-sm text-slate-300">
                {recommendationMessage}
              </p>
            )}
          </div>
        </section>

        {/* Recommendations */}

        {recommendations.length > 0 && (
          <section>
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                AI Results
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Recommended Products
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((product, index) => (
                <article
                  key={product.id}
                  className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="absolute right-5 top-5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                    #{index + 1}
                  </div>

                  <div className="pr-12">
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                      {product.category}
                    </p>

                    <h3 className="mt-2 text-xl font-bold text-slate-900">
                      {product.productName}
                    </h3>

                    {product.subcategory && (
                      <p className="mt-1 text-sm text-slate-500">
                        {product.subcategory}
                      </p>
                    )}
                  </div>

                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-600">
                    {product.description}
                  </p>

                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-400">
                        Price
                      </p>

                      <p className="text-2xl font-bold text-slate-900">
                        ₹{product.price}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        Stock
                      </p>

                      <p className="font-semibold text-slate-700">
                        {product.stock}
                      </p>
                    </div>
                  </div>

                  {product.attributes &&
                    Object.keys(product.attributes).length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {Object.entries(product.attributes).map(
                          ([key, value]) => (
                            <span
                              key={key}
                              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600"
                            >
                              {key}: {String(value)}
                            </span>
                          )
                        )}
                      </div>
                    )}

                  <div className="mt-6 rounded-2xl bg-indigo-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-700">
                        AI Match Score
                      </span>

                      <span className="text-lg font-bold text-indigo-700">
                        {product.match_score}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Saved Products */}

        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                Catalogue
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Saved Products
              </h2>
            </div>

            <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm">
              {products.length} products
            </span>
          </div>

          {products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-slate-500">
                No products added yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {product.category}
                      </span>

                      <h3 className="mt-3 text-lg font-bold text-slate-900">
                        {product.productName}
                      </h3>

                      {product.subcategory && (
                        <p className="mt-1 text-sm text-slate-500">
                          {product.subcategory}
                        </p>
                      )}
                    </div>

                    <p className="text-lg font-bold text-slate-900">
                      ₹{product.price}
                    </p>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                    {product.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-sm text-slate-500">
                      {product.brand || "No brand"}
                    </span>

                    <span className="text-sm font-medium text-emerald-600">
                      Stock: {product.stock}
                    </span>
                  </div>

                  {product.tags &&
                    product.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {product.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                  {product.attributes &&
                    Object.keys(product.attributes).length > 0 && (
                      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Specifications
                        </p>

                        <div className="space-y-2">
                          {Object.entries(product.attributes).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="flex justify-between gap-4 text-sm"
                              >
                                <span className="capitalize text-slate-500">
                                  {key.replaceAll("_", " ")}
                                </span>

                                <span className="font-medium text-slate-700">
                                  {String(value)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-14 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-400">
          AgentPass Commerce • AI Powered Product Discovery
        </div>
      </footer>
    </div>
  );
}

export default App;
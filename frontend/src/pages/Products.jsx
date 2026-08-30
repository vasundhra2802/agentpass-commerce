import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  getProducts,
  deleteProduct,
  updateProduct,
} from "../services/api";

function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [updating, setUpdating] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

  const labelClass =
    "mb-1.5 block text-sm font-medium text-slate-700";

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        setError(
          err.message || "Could not load products."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // ---------------------------------
  // Delete Product
  // ---------------------------------

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.productName}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteProduct(product.id);

      setProducts((currentProducts) =>
        currentProducts.filter(
          (currentProduct) =>
            currentProduct.id !== product.id
        )
      );
    } catch (error) {
      alert(
        error.message || "Could not delete product."
      );
    }
  };

  // ---------------------------------
  // Open Edit Modal
  // ---------------------------------

  const handleEditClick = (product) => {
    setEditingProduct(product);

    const productAttributes = Object.entries(
      product.attributes || {}
    ).map(([key, value]) => ({
      key,
      value: String(value),
    }));

    setEditForm({
      productName: product.productName || "",
      category: product.category || "",
      subcategory: product.subcategory || "",
      description: product.description || "",
      brand: product.brand || "",
      price: product.price ?? "",
      stock: product.stock ?? "",
      tags: (product.tags || []).join(", "),
      attributes:
        productAttributes.length > 0
          ? productAttributes
          : [{ key: "", value: "" }],
    });
  };

  // ---------------------------------
  // Close Edit Modal
  // ---------------------------------

  const handleCloseEdit = () => {
    if (updating) {
      return;
    }

    setEditingProduct(null);
    setEditForm(null);
  };

  // ---------------------------------
  // Edit Form Change
  // ---------------------------------

  const handleEditChange = (field, value) => {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // ---------------------------------
  // Dynamic Attribute Editing
  // ---------------------------------

  const handleEditAttributeChange = (
    index,
    field,
    value
  ) => {
    const updatedAttributes = [
      ...editForm.attributes,
    ];

    updatedAttributes[index] = {
      ...updatedAttributes[index],
      [field]: value,
    };

    setEditForm((current) => ({
      ...current,
      attributes: updatedAttributes,
    }));
  };

  const addEditAttribute = () => {
    setEditForm((current) => ({
      ...current,
      attributes: [
        ...current.attributes,
        {
          key: "",
          value: "",
        },
      ],
    }));
  };

  const removeEditAttribute = (index) => {
    const updatedAttributes =
      editForm.attributes.filter(
        (_, currentIndex) =>
          currentIndex !== index
      );

    setEditForm((current) => ({
      ...current,
      attributes:
        updatedAttributes.length > 0
          ? updatedAttributes
          : [
              {
                key: "",
                value: "",
              },
            ],
    }));
  };

  // ---------------------------------
  // Update Product
  // ---------------------------------

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingProduct || !editForm) {
      return;
    }

    const attributesObject = {};

    editForm.attributes.forEach((attribute) => {
      const key = attribute.key.trim();
      const value = attribute.value.trim();

      if (key && value) {
        attributesObject[key] = value;
      }
    });

    const tagsArray = editForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload = {
      productName: editForm.productName.trim(),
      category: editForm.category.trim(),
      subcategory:
        editForm.subcategory.trim() || null,
      description:
        editForm.description.trim(),
      brand:
        editForm.brand.trim() || null,
      price: Number(editForm.price),
      stock: Number(editForm.stock),
      tags: tagsArray,
      attributes: attributesObject,
    };

    try {
      setUpdating(true);

      const result = await updateProduct(
        editingProduct.id,
        payload
      );

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === editingProduct.id
            ? result.product
            : product
        )
      );

      setEditingProduct(null);
      setEditForm(null);
    } catch (error) {
      alert(
        error.message || "Could not update product."
      );
    } finally {
      setUpdating(false);
    }
  };

  // ---------------------------------
  // Categories
  // ---------------------------------

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        products
          .map((product) => product.category)
          .filter(Boolean)
      ),
    ];

    return uniqueCategories.sort();
  }, [products]);

  // ---------------------------------
  // Search + Category Filter
  // ---------------------------------

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        categoryFilter === "All" ||
        product.category === categoryFilter;

      const searchableText = [
        product.productName,
        product.category,
        product.subcategory,
        product.brand,
        product.description,
        ...(product.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        searchableText.includes(query);

      return (
        matchesCategory &&
        matchesSearch
      );
    });
  }, [products, search, categoryFilter]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 p-10">
        <div className="mx-auto max-w-7xl">
          {/* Header */}

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                Merchant Catalogue
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Products
              </h1>

              <p className="mt-2 text-slate-500">
                Browse and manage products available
                to the AI recommendation engine.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Total Products
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {products.length}
              </p>
            </div>
          </div>

          {/* Search + Filter */}

          <div className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_240px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search catalogue
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name, category, brand, tag..."
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Category
              </label>

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
                className={inputClass}
              >
                <option value="All">
                  All Categories
                </option>

                {categories.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading */}

          {loading && (
            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-slate-500">
                Loading catalogue...
              </p>
            </div>
          )}

          {/* Error */}

          {!loading && error && (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="font-medium text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Empty */}

          {!loading &&
            !error &&
            filteredProducts.length === 0 && (
              <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <h2 className="text-lg font-semibold text-slate-800">
                  No products found
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Try changing your search or category
                  filter.
                </p>
              </div>
            )}

          {/* Product Grid */}

          {!loading &&
            !error &&
            filteredProducts.length > 0 && (
              <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <article
                    key={product.id}
                    className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    {/* Product Header */}

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="inline-flex rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          {product.category}
                        </span>

                        <h2 className="mt-3 text-xl font-bold text-slate-900">
                          {product.productName}
                        </h2>

                        {product.subcategory && (
                          <p className="mt-1 text-sm text-slate-500">
                            {product.subcategory}
                          </p>
                        )}
                      </div>

                      <p className="whitespace-nowrap text-xl font-bold text-slate-900">
                        ₹
                        {Number(
                          product.price
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>

                    {/* Description */}

                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {product.description}
                    </p>

                    {/* Brand + Stock */}

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs text-slate-400">
                          Brand
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {product.brand ||
                            "Not specified"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-400">
                          Stock
                        </p>

                        <p
                          className={`mt-1 text-sm font-semibold ${
                            Number(product.stock) > 5
                              ? "text-emerald-600"
                              : Number(
                                  product.stock
                                ) > 0
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {product.stock}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}

                    {product.tags &&
                      product.tags.length > 0 && (
                        <div className="mt-5">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Tags
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {product.tags.map(
                              (tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                                >
                                  {tag}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Specifications */}

                    {product.attributes &&
                      Object.keys(
                        product.attributes
                      ).length > 0 && (
                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Specifications
                          </p>

                          <div className="space-y-2">
                            {Object.entries(
                              product.attributes
                            ).map(
                              ([key, value]) => (
                                <div
                                  key={key}
                                  className="flex items-center justify-between gap-4 text-sm"
                                >
                                  <span className="capitalize text-slate-500">
                                    {key.replaceAll(
                                      "_",
                                      " "
                                    )}
                                  </span>

                                  <span className="text-right font-medium text-slate-700">
                                    {String(value)}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Actions */}

                    <div className="mt-auto pt-6">
                      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                        <button
                          type="button"
                          onClick={() =>
                            handleEditClick(product)
                          }
                          className="rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
                        >
                          Edit Product
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(product)
                          }
                          className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Delete Product
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
        </div>
      </main>

      {/* =================================
          EDIT PRODUCT MODAL
      ================================= */}

      {editingProduct && editForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-4xl rounded-3xl bg-white shadow-2xl">
            {/* Modal Header */}

            <div className="flex items-start justify-between border-b border-slate-100 px-8 py-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                  Product Management
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Edit Product
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Update catalogue information and
                  product specifications.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseEdit}
                disabled={updating}
                className="rounded-xl px-3 py-2 text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            {/* Edit Form */}

            <form
              onSubmit={handleUpdate}
              className="p-8"
            >
              <div className="grid gap-6 md:grid-cols-2">
                {/* Product Name */}

                <div>
                  <label className={labelClass}>
                    Product Name
                  </label>

                  <input
                    className={inputClass}
                    value={editForm.productName}
                    onChange={(event) =>
                      handleEditChange(
                        "productName",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                {/* Brand */}

                <div>
                  <label className={labelClass}>
                    Brand
                  </label>

                  <input
                    className={inputClass}
                    value={editForm.brand}
                    onChange={(event) =>
                      handleEditChange(
                        "brand",
                        event.target.value
                      )
                    }
                  />
                </div>

                {/* Category */}

                <div>
                  <label className={labelClass}>
                    Category
                  </label>

                  <input
                    className={inputClass}
                    value={editForm.category}
                    onChange={(event) =>
                      handleEditChange(
                        "category",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                {/* Subcategory */}

                <div>
                  <label className={labelClass}>
                    Subcategory
                  </label>

                  <input
                    className={inputClass}
                    value={editForm.subcategory}
                    onChange={(event) =>
                      handleEditChange(
                        "subcategory",
                        event.target.value
                      )
                    }
                  />
                </div>

                {/* Price */}

                <div>
                  <label className={labelClass}>
                    Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={editForm.price}
                    onChange={(event) =>
                      handleEditChange(
                        "price",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                {/* Stock */}

                <div>
                  <label className={labelClass}>
                    Stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={editForm.stock}
                    onChange={(event) =>
                      handleEditChange(
                        "stock",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                {/* Description */}

                <div className="md:col-span-2">
                  <label className={labelClass}>
                    Description
                  </label>

                  <textarea
                    className={`${inputClass} min-h-28 resize-none`}
                    value={editForm.description}
                    onChange={(event) =>
                      handleEditChange(
                        "description",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                {/* Tags */}

                <div className="md:col-span-2">
                  <label className={labelClass}>
                    Tags
                  </label>

                  <input
                    className={inputClass}
                    value={editForm.tags}
                    onChange={(event) =>
                      handleEditChange(
                        "tags",
                        event.target.value
                      )
                    }
                    placeholder="coding, development, productivity"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    Separate multiple tags using commas.
                  </p>
                </div>
              </div>

              {/* Dynamic Attributes */}

              <div className="mt-8 rounded-2xl bg-slate-50 p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Dynamic Attributes
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Modify specifications for this
                      product.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addEditAttribute}
                    className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    + Add Attribute
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {editForm.attributes.map(
                    (attribute, index) => (
                      <div
                        key={index}
                        className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                      >
                        <input
                          className={inputClass}
                          value={attribute.key}
                          onChange={(event) =>
                            handleEditAttributeChange(
                              index,
                              "key",
                              event.target.value
                            )
                          }
                          placeholder="Attribute name"
                        />

                        <input
                          className={inputClass}
                          value={attribute.value}
                          onChange={(event) =>
                            handleEditAttributeChange(
                              index,
                              "value",
                              event.target.value
                            )
                          }
                          placeholder="Attribute value"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeEditAttribute(index)
                          }
                          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Footer Buttons */}

              <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  disabled={updating}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-xl bg-indigo-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updating
                    ? "Updating..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;
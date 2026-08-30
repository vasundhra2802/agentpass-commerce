import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { createProduct } from "../services/api";

function AddProduct() {
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
  const [saving, setSaving] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

  const labelClass =
    "mb-1.5 block text-sm font-medium text-slate-700";

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
    const updated = attributes.filter(
      (_, currentIndex) => currentIndex !== index
    );

    setAttributes(
      updated.length > 0
        ? updated
        : [{ key: "", value: "" }]
    );
  };

  const resetForm = () => {
    setProductName("");
    setCategory("");
    setSubcategory("");
    setDescription("");
    setBrand("");
    setPrice("");
    setStock("");
    setTags("");
    setAttributes([{ key: "", value: "" }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");

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
      .filter(Boolean);

    const product = {
      productName: productName.trim(),
      category: category.trim(),
      subcategory: subcategory.trim() || null,
      description: description.trim(),
      brand: brand.trim() || null,
      price: Number(price),
      stock: Number(stock),
      tags: tagsArray,
      attributes: attributesObject,
    };

    try {
      await createProduct(product);

      setMessage("Product added successfully.");
      resetForm();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 p-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Merchant Catalogue
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Add Product
          </h1>

          <p className="mt-2 text-slate-500">
            Add products from any category using a flexible
            catalogue schema.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Product Name
                </label>

                <input
                  className={inputClass}
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
                  min="0"
                  value={price}
                  onChange={(e) =>
                    setPrice(e.target.value)
                  }
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
                  min="0"
                  value={stock}
                  onChange={(e) =>
                    setStock(e.target.value)
                  }
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
                  placeholder="Describe the product and what it is useful for..."
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>
                  Tags
                </label>

                <input
                  className={inputClass}
                  value={tags}
                  onChange={(e) =>
                    setTags(e.target.value)
                  }
                  placeholder="coding, development, productivity"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Separate multiple tags using commas.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-slate-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Dynamic Attributes
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Add specifications specific to this product.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addAttributeField}
                  className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  + Add Attribute
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {attributes.map((attribute, index) => (
                  <div
                    key={index}
                    className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                  >
                    <input
                      className={inputClass}
                      value={attribute.key}
                      onChange={(e) =>
                        handleAttributeChange(
                          index,
                          "key",
                          e.target.value
                        )
                      }
                      placeholder="Attribute name"
                    />

                    <input
                      className={inputClass}
                      value={attribute.value}
                      onChange={(e) =>
                        handleAttributeChange(
                          index,
                          "value",
                          e.target.value
                        )
                      }
                      placeholder="Attribute value"
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

            <div className="mt-8 flex items-center justify-between">
              <div>
                {message && (
                  <p
                    className={`text-sm font-medium ${
                      message.includes("successfully")
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Add Product"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default AddProduct;
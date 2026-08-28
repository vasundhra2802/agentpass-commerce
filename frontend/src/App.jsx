import {useState} from "react";
function App() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(0);
  const [colour, setColour] = useState("");
  const [size, setSize] = useState("");
  const [stock, setStock] = useState(0);
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const product = {
      productName,
      category,
      price,
      colour,
      size,
      stock
    };
    console.log(product);
    fetch("http://127.0.0.1:8000/products", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(product),
})
  .then((response) => response.json())
  .then((data) => {
    console.log(data);
    setMessage(data.message);
  });
  };

  return(
    <div>
      <h1>AgentPass Commerce</h1>
      <p>Merchant Product Catalogue</p>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Product Name</label>
          <input 
            type="text" 
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
        </div>


        <div>
          <label>Category</label>
          <input 
            type="text" 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>


        <div>
          <label>Price</label>
          <input 
            type="number" 
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>


        <div>
          <label>Colour</label>
          <input 
            type="text" 
            value={colour}
            onChange={(e) => setColour(e.target.value)}
          />
        </div>


        <div>
          <label>Size</label>
          <input 
            type="text" 
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
        </div>


        <div>
          <label>Stock</label>
          <input 
            type="number" 
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>


        <button type="submit">Add Product</button>
        <p>{message}</p>
        
      </form>
    </div>
  );
}

export default App;
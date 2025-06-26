import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./App.css";
import Popup from "./popup"; // Import Popup component

function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      {/* Render Popup component */}
      <Popup />

      {/* <div>
        <a href="https://wxt.dev" target="_blank" rel="noopener noreferrer">
          <img src={wxtLogo} className="logo" alt="WXT logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>WXT + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the WXT and React logos to learn more
      </p> */}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

export default App;

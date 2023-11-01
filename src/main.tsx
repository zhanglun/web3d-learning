import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./routes/root";
import ErrorPage from "./error-page";
import Basic from "./routes/basic";
import "./index.css";
import Geometry from "./routes/geometry";
import Vector from "./routes/vector";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/basic",
        element: <Basic />,
      },
      {
        path: "/geometry",
        element: <Geometry />,
      },
      {
        path: "/vector",
        element: <Vector />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);

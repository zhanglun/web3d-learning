import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./routes/root";
import ErrorPage from "./error-page";
import Basic from "./routes/basic";
import "./index.css";
import Geometry from "./routes/geometry";
import Vector from "./routes/vector";
import Texture from "./routes/texture";
import { GLTF } from "./routes/gltf";
import { CircularArc } from "./routes/CircularArc";
import Kid from "./routes/kid";
import SolarSystemRoute from "./routes/solar-system";
import RobotRoute from './routes/robot';
import AnnotatorRoute from './routes/annotator';
import ArmDeckRoute from "./routes/armdeck";
import ArmDeckPhase1Route from "./routes/armdeck-phase1";
import ArmDeckPhase2Route from "./routes/armdeck-phase2";
import ArmDeckPhase3Route from "./routes/armdeck-phase3";
import ArmDeckPhase4Route from "./routes/armdeck-phase4";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/basic", element: <Basic /> },
      { path: "/geometry", element: <Geometry /> },
      { path: "/vector", element: <Vector /> },
      { path: "/texture", element: <Texture /> },
      { path: "/gltf", element: <GLTF /> },
      { path: "/circular-arc", element: <CircularArc /> },
      { path: "/kid", element: <Kid /> },
      { path: "/solar-system", element: <SolarSystemRoute /> },
      { path: "/robot", element: <RobotRoute /> },
      { path: "/annotator", element: <AnnotatorRoute /> },
      { path: "/armdeck", element: <ArmDeckRoute /> },
      { path: "/armdeck/phase1", element: <ArmDeckPhase1Route /> },
      { path: "/armdeck/phase2", element: <ArmDeckPhase2Route /> },
      { path: "/armdeck/phase3", element: <ArmDeckPhase3Route /> },
      { path: "/armdeck/phase4", element: <ArmDeckPhase4Route /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);

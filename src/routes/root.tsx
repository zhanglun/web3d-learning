import { Outlet } from "react-router-dom";

export default function Root() {
  return (
    <>
      <div id="sidebar">
        <h1>React Router Contacts</h1>
        <div>
          <form id="search-form" role="search">
            <input
              id="q"
              aria-label="Search contacts"
              placeholder="Search"
              type="search"
              name="q"
            />
            <div
              id="search-spinner"
              aria-hidden
              hidden={true}
            />
            <div
              className="sr-only"
              aria-live="polite"
            ></div>
          </form>
          {/* <form method="post">
            <button type="submit">New</button>
          </form> */}
        </div>
        <nav>
          <ul>
            <li>
              <a href={`/basic`}>Basic</a>
            </li>
            <li>
              <a href={`/geometry`}>Geometry</a>
            </li>
            <li>
              <a href={`/vector`}>Vector</a>
            </li>
            <li>
              <a href={`/texture`}>Texture</a>
            </li>
            <li>
              <a href={`/gltf`}>Gltf</a>
            </li>
          </ul>
          <ul>
            <li>
              <a href={'/circular-arc'}>Circular Arc</a>
            </li>
          </ul>
          <ul>
            <li>
              <a href={'/kid'}>Kid</a>
            </li>
          </ul>
          <ul>
            <li>
              <a href={'/solar-system'}>Solar System</a>
            </li>
          </ul>
          <ul>
            <li>
              <a href={'/robot'}>Robot</a>
            </li>
          </ul>
          <ul>
            <li>
              <a href={'/annotator'}>Annotator</a>
            </li>
          </ul>
          <ul>
            <li><a href={'/armdeck/phase1'}>ArmDeck Phase 1 — URDF Viewer</a></li>
            <li><a href={'/armdeck/phase2'}>ArmDeck Phase 2 — IK</a></li>
            <li><a href={'/armdeck/phase3'}>ArmDeck Phase 3 — Recording</a></li>
            <li><a href={'/armdeck/phase4'}>ArmDeck Phase 4 — ROS2</a></li>
          </ul>
        </nav>
      </div>
      <div id="detail">
        <Outlet />
      </div>
    </>
  );
}

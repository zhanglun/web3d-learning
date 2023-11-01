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
          </ul>
        </nav>
      </div>
      <div id="detail">
        <Outlet />
      </div>
    </>
  );
}
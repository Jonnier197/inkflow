type RouteHandler = (params?: Record<string, string>) => void;

interface Route {
  pattern: RegExp;
  keys: string[];
  handler: RouteHandler;
}

const routes: Route[] = [];

export function addRoute(path: string, handler: RouteHandler) {
  const keys: string[] = [];
  const pattern = new RegExp(
    '^' + path.replace(/:([^/]+)/g, (_: string, key: string) => { keys.push(key); return '([^/]+)'; }) + '$'
  );
  routes.push({ pattern, keys, handler });
}

export function navigate(path: string) {
  history.pushState(null, '', path);
  dispatch(path);
}

function dispatch(path: string) {
  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) {
      const params: Record<string, string> = {};
      route.keys.forEach((key, i) => { params[key] = match[i + 1]; });
      route.handler(params);
      return;
    }
  }
}

export function initRouter() {
  window.addEventListener('popstate', () => dispatch(location.pathname));
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('[data-link]') as HTMLAnchorElement | null;
    if (target) {
      e.preventDefault();
      navigate(target.getAttribute('href') || '/');
    }
  });
  dispatch(location.pathname);
}

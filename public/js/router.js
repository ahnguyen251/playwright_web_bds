export class Router {
  constructor(routes, defaultRoute) {
    this.routes = routes;
    this.defaultRoute = defaultRoute;
    this.currentView = null;
    this.rootElement = document.getElementById('app-root');
    this.pageTitle = document.getElementById('page-title');
    
    window.addEventListener('hashchange', () => this.handleRouteChange());
  }

  init() {
    this.handleRouteChange();
  }

  handleRouteChange() {
    let hash = window.location.hash.slice(1) || this.defaultRoute;
    
    try {
      hash = decodeURIComponent(hash);
    } catch (e) {
      hash = this.defaultRoute;
    }

    let matchedRoute = null;
    let params = {};
    
    for (const [routePath, routeDef] of Object.entries(this.routes)) {
      if (routePath.includes(':')) {
        const routeParts = routePath.split('/');
        const hashParts = hash.split('/');
        
        if (routeParts.length === hashParts.length) {
          let isMatch = true;
          for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
              params[routeParts[i].slice(1)] = hashParts[i];
            } else if (routeParts[i] !== hashParts[i]) {
              isMatch = false;
              break;
            }
          }
          if (isMatch) {
            matchedRoute = routeDef;
            break;
          }
        }
      } else if (routePath === hash) {
        matchedRoute = routeDef;
        break;
      }
    }
    
    if (!matchedRoute) {
      matchedRoute = this.routes[this.defaultRoute];
      hash = this.defaultRoute;
    }

    const baseHash = hash.split('/')[0];
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${baseHash}`);
    if (activeNav) activeNav.classList.add('active');

    this.pageTitle.textContent = matchedRoute.title;

    if (this.currentView && this.currentView.unmount) {
      this.currentView.unmount();
    }

    this.rootElement.innerHTML = '';
    this.currentView = matchedRoute.view;
    this.currentView.mount(this.rootElement, params);
  }
}

if (!window.KAALRoutes) {
    window.KAALRoutes = new Map()
    window.KAALCurrentRoute = null
}
const Routes = window.KAALRoutes

export default class RouterHandler {

    static installRoute (route, callback) 
    {
        Routes.set(route, callback)
    }

    static removeRoute (route)
    {
        Routes.delete(route)
    }

    static executeRoute(action)
    {
        /* execute route only if different */
        if (window.KAALCurrentRoute && window.KAALCurrentRoute === action) {
            return
        }
        window.KAALCurrentRoute = action
        action = action.split(':')
        const route = action.shift()
        if (!Routes.has(route)) return
        Routes.get(route)(action.shift())
    }

    static runRoute (event)
    {
        if (!event.currentTarget || !event.currentTarget.dataset.action) return
        if (window.self !== window.top) {
            window.top.postMessage({type: 'route', action: event.currentTarget.dataset.action})
            return
        }
        RouterHandler.executeRoute(event.currentTarget.dataset.action)
    }

    static attachRoute(element)
    {
        element.addEventListener('click', RouterHandler.runRoute)
    }

    static detachRoute(element) 
    {
        element.removeEventListener('click', RouterHandler.runRoute)
    }

}
const EventListeners = new WeakMap()

export default class EventHandler
{
    static runEvents (event) 
    {
        EventHandler.getEventHandler(
            event.currentTarget, 
            event.dataset.action
        ).forEach(callback => {
            callback(event)
        })
    }

    static installEventOnElement (element)
    {
        element.addEventListener('click', EventHandler.runEvents)
    }

    static removeEventFromElement (element)
    {
        element.removeEventListener('click', EventHandler.runEvents)
    }

    static getEventHandler(element, route)
    {
        if (!EventListeners.has(element)) return null
        const map = EventListeners.get(element)
        if (!map.has(route)) return null
        return map.get(route)
    }

    static addEvent (element, route, handler)
    {
        if (!EventListeners.has(element)) {
            EventListeners.set(element, new Map())
        }
        const map = EventListeners.get(element)
        if (!map.has(route)) {
            map.set(route, new Set())
        }
        const handlers = map.get(route)
        if (!handlers.has(handler)) {
            handlers.add(handler)
            EventHandler.installEventOnElement(element)
        }
    }

    static removeEvent (element, route, handler)
    {
        if (!EventListeners.has(element)) return
        const map = EventListeners.get(element)
        if (!map.has(route)) return
        const handlers = map.get(route)
        if (!handlers.has(handler)) return
        handlers.delete(handler)
        if (map.size === 0) {
            EventListeners.delete(element)
            EventHandler.removeEventFromElement(element)
        }
    }
}
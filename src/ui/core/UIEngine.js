export class UIEngine {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.components = new Map();
        this.tickSubscriptions = [];
    }

    registerComponent(name, component) {
        this.components.set(name, component);
        if (component.onRegister) {
            component.onRegister(this.eventBus, this);
        }
        if (component.onTick) {
            this.tickSubscriptions.push(component);
        }
    }

    tick(delta, camera) {
        for (const comp of this.tickSubscriptions) {
            comp.onTick(delta, camera);
        }
    }
}

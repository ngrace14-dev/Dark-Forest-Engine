import { UIEngine } from './core/UIEngine.js';
import { IntelBagComponent } from './components/IntelBagComponent.js';
import { IntelDebugComponent } from './components/IntelDebugComponent.js';
import { OracleBoardComponent } from './components/OracleBoardComponent.js';
import { IntelBrokerComponent } from './components/IntelBrokerComponent.js';
import { CompanionDialogueComponent } from './components/CompanionDialogueComponent.js';
import { CompanionInventoryComponent } from './components/CompanionInventoryComponent.js';
import { MerchantShopComponent } from './components/MerchantShopComponent.js';
import { PlayerCampComponent } from './components/PlayerCampComponent.js';
import { GladiatorProfileComponent } from './components/GladiatorProfileComponent.js';
import { ArenaResultComponent } from './components/ArenaResultComponent.js';
import { CaravanDialogueComponent } from './components/CaravanDialogueComponent.js';
import { ArmorerForgeComponent } from './components/ArmorerForgeComponent.js';
import { TreatmentCenterComponent } from './components/TreatmentCenterComponent.js';
import { RuneSocketMenuComponent } from './components/RuneSocketMenuComponent.js';

export function initializeUIEngine(eventBus) {
    const engine = new UIEngine(eventBus);
    
    // Register Components
    engine.registerComponent('companion-dialogue', new CompanionDialogueComponent());
    engine.registerComponent('intel-bag', new IntelBagComponent());
    engine.registerComponent('intel-debug', new IntelDebugComponent());
    engine.registerComponent('oracle-board', new OracleBoardComponent());
    engine.registerComponent('intel-broker', new IntelBrokerComponent());
    engine.registerComponent('companion-inventory', new CompanionInventoryComponent());
    engine.registerComponent('merchant-shop', new MerchantShopComponent());
    engine.registerComponent('player-camp', new PlayerCampComponent());
    engine.registerComponent('gladiator-profile', new GladiatorProfileComponent());
    engine.registerComponent('arena-result', new ArenaResultComponent());
    engine.registerComponent('caravan-dialogue', new CaravanDialogueComponent());
    engine.registerComponent('armorer-forge', new ArmorerForgeComponent());
    engine.registerComponent('treatment-center', new TreatmentCenterComponent());
    engine.registerComponent('rune-socket-menu', new RuneSocketMenuComponent());
    
    window.UIEngineInstance = engine;
    return engine;
}

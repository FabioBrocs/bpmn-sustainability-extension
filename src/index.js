import SustainabilityPropertiesProvider from './SustainabilityPropertiesProvider.js';
import SustainabilityOverlays from './overlays/SustainabilityOverlays.js';

export default {
  __init__: [ 'sustainabilityPropertiesProvider', 'sustainabilityOverlays' ],
  sustainabilityPropertiesProvider: [ 'type', SustainabilityPropertiesProvider ],
  sustainabilityOverlays: [ 'type', SustainabilityOverlays ]
};
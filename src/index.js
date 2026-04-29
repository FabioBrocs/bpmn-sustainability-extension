import SustainabilityPropertiesProvider from './SustainabilityPropertiesProvider.js';
import SustainabilityOverlays from './overlays/SustainabilityOverlays.js';
import './assets/css/sustainability.css';

export default {
  __init__: [ 'sustainabilityPropertiesProvider', 'sustainabilityOverlays' ],
  sustainabilityPropertiesProvider: [ 'type', SustainabilityPropertiesProvider ],
  sustainabilityOverlays: [ 'type', SustainabilityOverlays ]
};
# bpmn-sustainability-extension

[![Compatible with bpmn-js](https://img.shields.io/badge/bpmn--js-%3E%3D%_17.0.0-green.svg)](https://github.com/bpmn-io/bpmn-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A BPMN 2.0 extension and properties panel module for modeling, tracking, and visualizing sustainability data in IoT-enhanced business processes.

This extension allows process modelers to attach environmental indicators (such as energy usage, carbon footprint, temperature, and thermal sensation) directly to BPMN elements. It provides a seamless UI within the properties panel and renders dynamic, formula-driven badges directly on the BPMN canvas.

## Features

* **BPMN 2.0 Compliant:** Extends the standard BPMN metamodel via a custom `sust` namespace without breaking standard execution.
* **Properties Panel Integration:** A dedicated UI group to add, configure, and remove indicators.
* **Raw & Calculated Indicators:** Supports raw sensor data tracking or complex, formula-based calculated metrics (e.g., Thermal Sensation).
* **Data Aggregation:** Built-in support for 1-to-N sensor aggregations (`AVG`, `SUM`, `MIN`, `MAX`).
* **Canvas Overlays:** Real-time visual badges on BPMN shapes that summarize sustainability metrics and flag missing sensor configurations.

## Installation

Install the extension via npm:

```bash
npm install bpmn-sustainability-extension
```

### Peer Dependencies

This extension requires `bpmn-js` and the properties panel modules to be installed in your project. It also relies on `htm` and `preact` for UI components.

```bash
npm install bpmn-js bpmn-js-properties-panel @bpmn-io/properties-panel htm preact
```

## Usage

To use the extension, you need to inject it into your `BpmnModeler` instance alongside the standard properties panel modules. You must also provide the custom Moddle extension.

```javascript
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { 
  BpmnPropertiesPanelModule, 
  BpmnPropertiesProviderModule 
} from 'bpmn-js-properties-panel';

// Import the sustainability extension and its descriptor
import BpmnSustainabilityExtension from 'bpmn-sustainability-extension';
import sustainabilityDescriptor from 'bpmn-sustainability-extension/descriptors/sustainability.json';

// Initialize the modeler
const modeler = new BpmnModeler({
  container: '#canvas',
  propertiesPanel: {
    parent: '#properties-panel'
  },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    BpmnSustainabilityExtension // <--- Inject the extension here
  ],
  moddleExtensions: {
    sust: sustainabilityDescriptor // <--- Inject the metamodel here
  }
});

// Load your BPMN diagram
modeler.importXML(yourXML).then(() => {
  console.log('Modeler loaded with sustainability features!');
});
```

### BPMN XML Namespace

Ensure your target BPMN XML file includes the `sust` namespace in the definitions node:

```xml
<bpmn:definitions xmlns:sust="http://sustainability" ... >
```

## Building the Extension

If you want to build the extension from source for your own usage:

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Build the project (creates the `dist` folder):

```bash
npm run build
```

## License

MIT

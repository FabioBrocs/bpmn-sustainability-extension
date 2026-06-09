# bpmn-sustainability-extension

[[Compatible with bpmn-js]](https://github.com/bpmn-io/bpmn-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A BPMN 2.0 extension and properties panel module for modeling, tracking, and visualizing sustainability data in IoT-enhanced business processes.

This extension allows process modelers to attach environmental indicators (such as energy usage, carbon footprint, temperature, and thermal sensation) directly to BPMN elements. It provides a seamless UI within the properties panel, allowing users to categorize indicators by Values, and renders dynamic, formula-driven badges directly on the BPMN canvas.


## Features


* **BPMN 2.0 Compliant:** Extends the standard BPMN metamodel via a custom `sust` namespace without breaking standard execution engines (e.g., Camunda).
* **Multi-Dimensional Categorization:** Group indicators by Target Values (e.g., *Improving Comfort*, *Reducing Energy Consumption*) and automatically bind them to sustainability Dimensions (e.g., *Environmental, Social, Economic*). Metadata is saved directly in the XML for runtime analytics.
* **Properties Panel Integration:** A dedicated UI group to add, configure, and remove indicators with dynamic dropdown filtering.
* **Raw & Calculated Indicators:** Supports raw sensor data tracking or complex, formula-based calculated metrics (e.g., Thermal Sensation).
* **Data Aggregation:** Built-in support for 1-to-N sensor aggregations (`AVG`, `SUM`, `MIN`, `MAX`, or `CUSTOM` formulas).
* **Canvas Overlays:** Real-time visual badges on BPMN shapes that summarize sustainability metrics and flag missing sensor configurations.

---


## Requirements

To run this extension, your project must have a modern JavaScript bundler (like Webpack) and the following minimum peer dependencies installed:


* **`bpmn-js`**: `>= 18.15.0`
* **`bpmn-js-properties-panel`**: `>= 5.54.0`
* **`@bpmn-io/properties-panel`**: `>= 3.41.2`
* **`preact`**: `>= 10.29.1`
* **`htm`**: `>= 3.1.1`

*Example of a minimal `package.json` setup:*

~~~json
{
  "dependencies": {
    "@bpmn-io/properties-panel": "^3.41.2",
    "bpmn-js": "^18.15.0",
    "bpmn-js-properties-panel": "^5.54.0",
    "bpmn-sustainability-extension": "file:../path-to/bpmn-sustainability-extension-1.0.1.tgz",
    "htm": "^3.1.1",
    "preact": "^10.29.1"
  },
  "devDependencies": {
    "html-webpack-plugin": "^5.6.7",
    "webpack": "^5.106.2",
    "webpack-cli": "^7.0.2",
    "webpack-dev-server": "^5.2.3"
  }
}
~~~

---


## Installation

Install the extension via npm (either from a registry or a local tarball):

~~~bash
npm install bpmn-sustainability-extension
~~~

Ensure your peer dependencies are also installed:

~~~bash
npm install bpmn-js bpmn-js-properties-panel @bpmn-io/properties-panel htm preact
~~~

---


## Usage

To use the extension, you need to inject it into your `BpmnModeler` instance alongside the standard properties panel modules. You must also provide the custom Moddle extension.

~~~javascript
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
~~~


### BPMN XML Namespace

Ensure your target BPMN XML file includes the `sust` namespace in the definitions node, otherwise the modeler will strip out the extension elements:

~~~xml
<bpmn:definitions xmlns:sust="http://sustainability" ... >
~~~

---


## Configuration Files

The extension relies on two JSON files for its business logic and UI population:


* **`valuesConfig.json`**: Defines the higher-level Values (e.g., Improving Comfort) and the Dimensions they impact. It dictates which indicators are available when a value is selected.
* **`indicatorsConfig.json`**: Defines the technical specifics of each metric (icons, units, calculated formulas, and required variables).

*If you fork this project, you can easily add new indicators or dimensions by editing these files.*

---


## Building the Extension

If you want to build the extension from source for your own usage:


* Clone the repository.
* Install dependencies:

~~~bash
npm install
~~~


* Build the project (compiles assets and creates the `dist` folder):

~~~bash
npm run build
~~~


## License

MIT
# Camunda Modeler Sustainability Extension

[[Compatible with bpmn-js]](https://github.com/bpmn-io/bpmn-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A custom extension for the **Camunda Modeler** that enables process designers to model, calculate, and monitor Sustainability Metrics directly onto BPMN diagrams. 

This plugin is **Part 1 of a 3-Tier Architecture**:
1.  **Sustainability Extension (This Repo):** The UI to model the metrics in Camunda.
2.  **[Spring Boot Sustainability Engine](https://github.com/FabioBrocs/bpmn-sustainability-engine):** The Java backend that parses the BPMN, evaluates SpEL formulas, and generates IoT sensor data.
3.  **[Sustainability Analytics Dashboard](https://github.com/FabioBrocs/bpmn-sustainability-dashboard):** The React application that renders real-time data, textual metrics, and cross-compares process executions.

---

## Features

-   **Dynamic Properties Panel:** Select sustainability goals (e.g., *Improving Comfort*, *Reducing Energy*) and assign context-aware indicators (e.g., *Temperature*, *Carbon Footprint*).
-   **Canvas Overlays:** Interactive "Leaf" badges appear on the BPMN canvas for tasks containing sustainability data. Click to reveal real-time configurations.
-   **Raw & Calculated Indicators:** Define raw sensors (IoT inputs) or build calculated formulas (e.g., *Thermal Sensation Index*) evaluated directly in the properties panel.
-   **Sensor Aggregation:** Aggregate multiple child sensors into a single node using `AVG`, `SUM`, `MIN`, `MAX`, or custom math strings.
-   **Master Dictionary Driven:** The entire UI is driven by a single `sustainability-dictionary.json` file shared across the architecture.

---

## Installation & Usage

This extension can be used within a custom web-based BPMN modeler or as a standalone plugin for the Camunda Desktop Modeler.

### Option A: Custom Web Modeler (NPM)

**Requirements:**
To run this extension, your project must have a modern JavaScript bundler (like Webpack) and the following minimum peer dependencies installed:

* **`bpmn-js`**: `>= 18.15.0`
* **`bpmn-js-properties-panel`**: `>= 5.54.0`
* **`@bpmn-io/properties-panel`**: `>= 3.41.2`
* **`preact`**: `>= 10.29.1`
* **`htm`**: `>= 3.1.1`

**1. Install the extension and dependencies:**

```bash
npm install bpmn-sustainability-extension
npm install bpmn-js bpmn-js-properties-panel @bpmn-io/properties-panel htm preact
```

**2. Inject the extension into your BpmnModeler:**

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

### Option B: Camunda Desktop Modeler Plugin

To use this extension in the official Camunda 7 Desktop Modeler, you need to build the desktop-specific bundle to prevent UI framework collisions.

**1. Clone and Build:**
```bash
git clone <this-repository-url>
cd bpmn-sustainability-extension
npm install
npm run build
```
*(This will generate the compiled `client.js` file inside the `dist-desktop` folder).*

**2. Install in Camunda:**
1. Navigate to your Camunda Modeler plugins directory:
   - **Windows:** `%APPDATA%\camunda-modeler\plugins\`
   - **Mac:** `~/Library/Application Support/camunda-modeler/plugins/`
   - **Linux:** `~/.config/camunda-modeler/plugins/`
2. Create a new folder named `bpmn-sustainability-extension`.
3. Copy the predefined **`index.js`** file from the repository's `desktop-plugin/` folder into this new directory.
4. Copy the newly compiled **`client.js`** from the `dist-desktop/` folder into the same directory.
5. Restart the Camunda Modeler.

---

## Important: BPMN XML Namespace

Ensure your target BPMN XML file includes the `sust` namespace in the `<bpmn:definitions>` node, otherwise the modeler will strip out the extension elements upon saving:

```xml
<bpmn:definitions xmlns:sust="http://sustainability" ... >
```

---

## The Master Dictionary Guide

The heart of the entire ecosystem is the `sustainability-dictionary.json` file. Updating this file instantly updates the Modeler menus, the Java calculation engine, and the React Dashboard charts.

### 1. Dimensions & Values
Organize your indicators by adding to the `dimensions` and `values` arrays:
```json
"dimensions": [
  { "id": "Environmental", "label": "Environmental" },
  { "id": "Social", "label": "Social" }
],
"values": [
  {
    "id": "improving_comfort",
    "label": "Improving Comfort",
    "dimensions": ["Individual", "Social"],
    "indicators": ["temperature", "thermal_sensation"]
  }
]
```

### 2. Adding a RAW Indicator (IoT Sensors)
Used for direct sensor readings. You must provide a `chartConfig` for the dashboard rendering.
```json
{
  "id": "humidity",
  "label": "Humidity",
  "icon": "💧",
  "type": "raw",
  "chartConfig": { "min": 0, "max": 100, "color": "#007bff" },
  "allowedUnits": [ { "value": "%", "label": "Percentage (%)" } ]
}
```

### 3. Adding a CALCULATED Indicator (Formulas)
Used to derive complex metrics from raw sensors. The Modeler evaluates these via JS, while the Spring Boot backend evaluates them via **SpEL**.
*Note: Standard math operations `(+, -, *, /, ^)` and ternary operators `(? :)` are natively supported.*

```json
{
  "id": "thermal_sensation",
  "label": "Thermal Sensation",
  "icon": "🧠",
  "type": "calculated",
  "chartConfig": { "min": 0, "max": 50, "color": "#17a2b8" },
  "formulas": [
    {
      "id": "hot_climate",
      "label": "Thermal Sensation (Hot >=27°C)",
      "expression": "-8.7846 + 1.6113 * T + 2.3385 * H - 0.1461 * T * H",
      "variables": [
        { "id": "T", "unit": "°C", "description": "Temperature" },
        { "id": "H", "unit": "%", "description": "Humidity" }
      ]
    }
  ]
}
```

### 4. Categorical Mapping (Textual Charts)
If you want the dashboard to display **Words instead of Numbers** on the Y-Axis (e.g., "Too Hot" instead of "3"), use a ternary formula alongside a `categoryMapping`:

```json
{
  "id": "temperature_comfort",
  "label": "Temperature Comfort",
  "icon": "😌",
  "type": "calculated",
  "chartConfig": { "min": 0, "max": 4, "color": "#fd7e14" },
  "categoryMapping": {
    "1": "Too Cold",
    "2": "Perfect",
    "3": "Too Hot"
  },
  "formulas": [
    {
      "id": "comfort_index",
      "label": "Basic Comfort Index",
      "expression": "T < 20 ? 1 : (T > 25 ? 3 : 2)",
      "variables": [ { "id": "T", "unit": "°C" } ]
    }
  ]
}
```
*(In this example, the Java Engine saves `1, 2, or 3` in the Database, but the React Dashboard translates those digits dynamically into the assigned text labels).*

---

## License
MIT License

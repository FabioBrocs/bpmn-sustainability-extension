import { registerBpmnJSPlugin, registerBpmnJSModdleExtension } from 'camunda-modeler-plugin-helpers';
import SustainabilityExtensionModule from '../src/index.js'; 
import sustainabilityDescriptor from '../descriptors/sustainability.json';
registerBpmnJSPlugin(SustainabilityExtensionModule);
registerBpmnJSModdleExtension(sustainabilityDescriptor);
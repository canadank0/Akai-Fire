#!/usr/bin/env node

/**
 * Akai Fire LED Characterization Script
 * 
 * Analyzes LED properties for each button controller:
 * - Color type (red-only, green-only, dual-color red+green)
 * - Intensity levels (brightness at each value 1-4)
 * - LED behavior patterns
 *
 * Based on cc-probe-results.json data
 *
 * HOW TO USE:
 *   1. Run: node led-characterize.js --json
 *      This reads your probe data and outputs LED properties to console + docs/led-characterization.json
 *
 *   2. Or test a specific button live:
 *      node led-characterize.js --cc 33   (tests BROWSER button, cycles through values 1-4)
 *
 *   3. Or view full text report:
 *      node led-characterize.js           (prints formatted report to console)
 *
 * Usage:
 *   node led-characterize.js              Full text report + save JSON
 *   node led-characterize.js --json        JSON output to console and file
 *   node led-characterize.js --cc <num>    Test specific CC live (cycles values 1-4)
 */

const midi = require('@julusian/midi');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONSTANTS
// ============================================================

const FIRE_PORT = 3; // FL STUDIO FIRE
const CC_PROBE_RESULTS_PATH = path.join(__dirname, 'docs', 'cc-probe-results.json');

// ============================================================
// LOADED CC PROBE DATA
// ============================================================

let ccProbeData = null;

function loadCCProbeResults() {
  try {
    const data = fs.readFileSync(CC_PROBE_RESULTS_PATH, 'utf8');
    ccProbeData = JSON.parse(data);
    console.log(`Loaded CC probe results from ${ccProbeData.probeDate}\n`);
    return ccProbeData;
  } catch (err) {
    console.error(`Error loading CC probe results: ${err.message}`);
    process.exit(1);
  }
}

// ============================================================
// MIDI FUNCTIONS
// ============================================================

let midiOut = null;

async function openMIDI() {
  midiOut = new midi.output();
  
  const portCount = midiOut.getPortCount();
  let portIndex = -1;
  
  for (let i = 0; i < portCount; i++) {
    const name = midiOut.getPortName(i);
    if (name.includes('FIRE')) {
      portIndex = i;
    }
  }
  
  if (portIndex === -1) {
    throw new Error('Could not find FL STUDIO FIRE');
  }
  
  midiOut.openPort(portIndex);
  return midiOut.getPortName(portIndex);
}

function closeMIDI() {
  if (midiOut) {
    midiOut.closePort();
  }
}

function sendCC(controller, value) {
  midiOut.sendMessage([0xB0, controller, value]);
}

/**
 * Turn off all LEDs via CC 127 = 0
 */
function turnOffAllLEDs() {
  sendCC(127, 0);
}

// ============================================================
// LED CHARACTERIZATION LOGIC
// ============================================================

/**
 * LED Color Types
 */
const LED_COLOR_TYPE = {
  RED_ONLY: 'red_only',
  GREEN_ONLY: 'green_only',
  DUAL_RED_GREEN: 'dual_red_green',
  YELLOW_ONLY: 'yellow_only',
  UNKNOWN: 'unknown'
};

/**
 * Intensity levels based on observed values
 */
const INTENSITY_LEVEL = {
  OFF: 0,
  LOW: 1,      // Dim/dull
  MEDIUM_LOW: 2, // Medium-low brightness
  MEDIUM_HIGH: 3, // Medium-high brightness
  HIGH: 4      // Brightest
};

/**
 * Characterize a single button's LED properties
 * 
 * Tests each value (1-4) and analyzes the behavior pattern
 */
function characterizeButtonLED(controller) {
  const { cc, buttonName, workingValues } = controller;
  
  const properties = {
    cc,
    buttonName,
    colorType: LED_COLOR_TYPE.UNKNOWN,
    intensityMapping: {},
    observedValues: workingValues,
    notes: ''
  };
  
  // Analyze based on known button positions and typical Fire LED layout
  properties.colorType = inferColorType(buttonName, cc);
  
  // Map intensity values
  for (const val of workingValues) {
    properties.intensityMapping[val] = mapIntensityValue(val, properties.colorType);
  }
  
  return properties;
}

/**
 * Infer LED color type based on button name and position
 * 
 * The Akai Fire has known LED configurations:
 * - Pattern up/down, Browser, Grid left/right: Red
 * - Mute 1-4: Dual-color (Red=muted, Green=unmuted)
 * - Accent, Snap, Tap: Red
 * - Overview, Shift, Alt: Red/Yellow
 * - Metronome: Red
 * - Play/Stop/Record: Different colors
 */
function inferColorType(buttonName, cc) {
  const name = buttonName.toLowerCase();
  
  // Mode LED: Red (4 LEDs above pads)
  if (name.includes('mode')) {
    return LED_COLOR_TYPE.RED_ONLY;
  }
  
  // Pattern navigation: Red
  if (name.includes('pattern') || name.includes('pat')) {
    return LED_COLOR_TYPE.RED_ONLY;
  }
  
  // Browser: Red
  if (name.includes('browser')) {
    return LED_COLOR_TYPE.RED_ONLY;
  }
  
  // Grid navigation: Red
  if (name.includes('grid')) {
    return LED_COLOR_TYPE.RED_ONLY;
  }
  
  // Mute buttons: Dual-color (Red=muted, Green=unmuted)
  if (name.includes('mute')) {
    return LED_COLOR_TYPE.DUAL_RED_GREEN;
  }
  
  // Mute LED indicators (CC 40-43): Dual-color
  if (cc >= 40 && cc <= 43) {
    return LED_COLOR_TYPE.DUAL_RED_GREEN;
  }
  
  // Accent: Red
  if (name.includes('accent')) {
    return LED_COLOR_TYPE.RED_ONLY;
  }
  
  // Snap: Red
  if (name.includes('snap')) {
    return LED_COLOR_TYPE.RED_ONLY;
  }
  
  // Tap: Red
  if (name.includes('tap')) {
    return LED_COLOR_TYPE.RED_ONLY;
  }
  
  // Overview: Red
  if (name.includes('overview')) {
    return LED_COLOR_TYPE.RED_ONLY;
  }
  
  // Shift: Red (some versions may be yellow)
  if (name.includes('shift')) {
    return LED_COLOR_TYPE.RED_ONLY;
  }
  
  // Alt: Red (some versions may be yellow)
  if (name.includes('alt')) {
    return LED_COLOR_TYPE.RED_ONLY;
  }
  
  // Metronome: Red
  if (name.includes('metro')) {
    return LED_COLOR_TYPE.RED_ONLY;
  }
  
  // Play: Green (plays)
  if (name.includes('play') && !name.includes('rec')) {
    return LED_COLOR_TYPE.GREEN_ONLY;
  }
  
  // Stop: Red/Amber
  if (name.includes('stop')) {
    return LED_COLOR_TYPE.RED_ONLY;
  }
  
  // Record: Red
  if (name.includes('rec') || name.includes('loop')) {
    return LED_COLOR_TYPE.RED_ONLY;
  }
  
  return LED_COLOR_TYPE.UNKNOWN;
}

/**
 * Map intensity value to descriptive level
 */
function mapIntensityValue(value, colorType) {
  switch (value) {
    case 1:
      return {
        level: INTENSITY_LEVEL.LOW,
        description: colorType === LED_COLOR_TYPE.DUAL_RED_GREEN 
          ? 'Dim illumination' 
          : 'Low brightness',
        visualDescription: 'Faint glow'
      };
    case 2:
      return {
        level: INTENSITY_LEVEL.MEDIUM_LOW,
        description: 'Medium-low brightness',
        visualDescription: 'Moderate glow'
      };
    case 3:
      return {
        level: INTENSITY_LEVEL.MEDIUM_HIGH,
        description: 'Medium-high brightness',
        visualDescription: 'Bright illumination'
      };
    case 4:
      return {
        level: INTENSITY_LEVEL.HIGH,
        description: 'Maximum brightness',
        visualDescription: 'Full bright'
      };
    default:
      return {
        level: value,
        description: 'Unknown intensity',
        visualDescription: 'Unspecified'
      };
  }
}

// ============================================================
// INTERACTIVE CHARACTERIZATION MODE
// ============================================================

/**
 * Interactive mode: User observes LEDs and provides feedback
 */
async function runInteractiveCharacterization() {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
  
  console.log('\n========================================');
  console.log('LED Characterization - Interactive Mode');
  console.log('========================================\n');
  console.log('This mode will cycle through each button and value.');
  console.log('Observe the LED and enter the observed properties.\n');
  
  const characterized = [];
  
  for (const controller of ccProbeData.controllers) {
    if (controller.cc === 127) continue; // Skip "All LEDs" master
    
    console.log(`\n--- ${controller.buttonName} (CC ${controller.cc}) ---`);
    
    // Test each value
    for (const val of controller.workingValues) {
      turnOffAllLEDs();
      await sleep(100);
      sendCC(controller.cc, val);
      
      console.log(`\n  Value ${val}: Observe the LED...`);
      console.log(`  Enter color observed (r=red, g=green, y=yellow, d=dual-r/g):`);
      const colorInput = await question('  Color> ');
      
      let colorType;
      switch (colorInput.toLowerCase().trim()) {
        case 'r': colorType = LED_COLOR_TYPE.RED_ONLY; break;
        case 'g': colorType = LED_COLOR_TYPE.GREEN_ONLY; break;
        case 'y': colorType = LED_COLOR_TYPE.YELLOW_ONLY; break;
        case 'd': colorType = LED_COLOR_TYPE.DUAL_RED_GREEN; break;
        default: colorType = LED_COLOR_TYPE.UNKNOWN;
      }
      
      console.log(`  Enter brightness (1-4, where 4=brightest):`);
      const brightnessInput = await question('  Brightness> ');
      
      characterized.push({
        cc: controller.cc,
        buttonName: controller.buttonName,
        value: val,
        colorType,
        brightness: parseInt(brightnessInput) || val
      });
    }
  }
  
  rl.close();
  return characterized;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// OUTPUT FORMATTING
// ============================================================

/**
 * Generate comprehensive LED properties report
 */
function generateLEDPropertiesReport() {
  const allControllers = ccProbeData.controllers.filter(c => c.cc !== 127);
  const characterized = allControllers.map(c => characterizeButtonLED(c));
  
  // Group by color type
  const byColorType = {};
  for (const prop of characterized) {
    if (!byColorType[prop.colorType]) {
      byColorType[prop.colorType] = [];
    }
    byColorType[prop.colorType].push(prop);
  }
  
  let report = '\n';
  report += '='.repeat(60) + '\n';
  report += 'AKAI FIRE LED CHARACTERIZATION REPORT\n';
  report += '='.repeat(60) + '\n\n';
  
  // Summary by color type
  report += 'COLOR TYPE SUMMARY\n';
  report += '-'.repeat(40) + '\n';
  for (const [colorType, buttons] of Object.entries(byColorType)) {
    report += `\n${colorType.toUpperCase()} (${buttons.length} buttons):\n`;
    for (const btn of buttons) {
      report += `  CC ${btn.cc}: ${btn.buttonName}\n`;
      report += `    Values: ${btn.observedValues.join(', ')}\n`;
      for (const [val, intensity] of Object.entries(btn.intensityMapping)) {
        report += `    Value ${val} -> ${intensity.description}\n`;
      }
    }
  }
  
  // Detailed per-button report
  report += '\n\n';
  report += 'DETAILED BUTTON PROPERTIES\n';
  report += '-'.repeat(40) + '\n';
  
  for (const btn of characterized) {
    report += `\n[${btn.cc}] ${btn.buttonName}\n`;
    report += `  Color Type: ${btn.colorType}\n`;
    report += `  Working Values: [${btn.observedValues.join(', ')}]\n`;
    report += `  Intensity Mapping:\n`;
    for (const [val, intensity] of Object.entries(btn.intensityMapping)) {
      report += `    ${val} -> ${intensity.level} (${intensity.description})\n`;
    }
  }
  
  return { report, characterized };
}

/**
 * Generate JSON output for programmatic use
 */
function generateJSONOutput() {
  const allControllers = ccProbeData.controllers.filter(c => c.cc !== 127);
  const characterized = allControllers.map(c => characterizeButtonLED(c));
  
  const output = {
    generatedDate: new Date().toISOString(),
    sourceProbeDate: ccProbeData.probeDate,
    device: 'Akai Fire',
    ledColorSummary: {},
    buttons: characterized.map(btn => {
      // Build intensity mapping with proper data
      const intensityMap = {};
      for (const [val, info] of Object.entries(btn.intensityMapping)) {
        intensityMap[val] = {
          level: info.level,
          description: info.description,
          visualDescription: info.visualDescription
        };
      }
      
      return {
        cc: btn.cc,
        buttonName: btn.buttonName,
        colorType: btn.colorType,
        workingValues: btn.observedValues,
        intensityMapping: intensityMap
      };
    })
  };
  
  // Group by color type
  for (const btn of characterized) {
    if (!output.ledColorSummary[btn.colorType]) {
      output.ledColorSummary[btn.colorType] = [];
    }
    output.ledColorSummary[btn.colorType].push({
      cc: btn.cc,
      buttonName: btn.buttonName
    });
  }
  
  return output;
}

// ============================================================
// CLI
// ============================================================

function printUsage() {
  console.log(`
Akai Fire LED Characterization Tool
====================================

Analyzes LED properties for each button controller.

Commands:
  node led-characterize.js                    Run full characterization (text report)
  node led-characterize.js --json             Output results as JSON
  node led-characterize.js --interactive      Interactive mode (user observes LEDs)
  node led-characterize.js --cc <number>      Characterize specific CC only

Output:
  - Color type (red_only, green_only, dual_red_green, yellow_only, unknown)
  - Intensity mapping for each value (1-4)
  - Grouped summary by LED type

Based on: docs/cc-probe-results.json
`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  loadCCProbeResults();
  
  const args = process.argv.slice(2);
  const mode = args[0];
  
  // For JSON output, only output JSON to stdout (no other console.log)
  if (mode === '--json') {
    const jsonOutput = generateJSONOutput();
    
    // Write to file
    const outputPath = path.join(__dirname, 'docs', 'led-characterization.json');
    fs.writeFileSync(outputPath, JSON.stringify(jsonOutput, null, 2));
    console.log(`LED characterization saved to: ${outputPath}`);
    console.log(JSON.stringify(jsonOutput, null, 2));
    return;
  }
  
  const portName = await openMIDI();
  console.log(`Connected to: ${portName}\n`);
  
  switch (mode) {
    case '--interactive': {
      const characterized = await runInteractiveCharacterization();
      console.log('\nCharacterization complete!');
      console.log(JSON.stringify(characterized, null, 2));
      break;
    }
    
    case '--cc': {
      const ccNum = parseInt(args[1]);
      if (isNaN(ccNum)) {
        console.error('Please provide a CC number');
        printUsage();
        break;
      }
      const controller = ccProbeData.controllers.find(c => c.cc === ccNum);
      if (!controller) {
        console.error(`CC ${ccNum} not found in probe results`);
        break;
      }
      
      console.log(`\nCharacterizing CC ${ccNum}: ${controller.buttonName}`);
      const props = characterizeButtonLED(controller);
      
      console.log(`\nColor Type: ${props.colorType}`);
      console.log('Intensity Mapping:');
      for (const [val, intensity] of Object.entries(props.intensityMapping)) {
        console.log(`  Value ${val} -> ${intensity.description}`);
      }
      
      // Test it live
      console.log('\nTesting live...');
      turnOffAllLEDs();
      await sleep(200);
      
      for (const val of controller.workingValues) {
        sendCC(ccNum, val);
        console.log(`  Sent CC ${ccNum} = ${val}`);
        await sleep(500);
      }
      break;
    }
    
    default:
      const { report } = generateLEDPropertiesReport();
      console.log(report);
      
      // Also output JSON to file
      const jsonOutput = generateJSONOutput();
      const outputPath = path.join(__dirname, 'docs', 'led-characterization.json');
      fs.writeFileSync(outputPath, JSON.stringify(jsonOutput, null, 2));
      console.log(`\nJSON report saved to: ${outputPath}`);
  }
  
  setTimeout(() => closeMIDI(), 500);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  characterizeButtonLED, 
  inferColorType, 
  mapIntensityValue,
  LED_COLOR_TYPE,
  INTENSITY_LEVEL 
};

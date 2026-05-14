#!/usr/bin/env node

/**
 * Akai Fire LED Interactive Characterization Tool
 * 
 * Guides you through testing each button's LED by:
 * 1. Testing values 1-4 to discover color/intensity combinations
 * 2. You report the color and brightness level for each value
 * 3. Determining LED type (dual-color, tri-color, single-color, etc.)
 * 4. Saving results to JSON
 * 
 * Usage:
 *   node led-test-interactive.js                     Start interactive test
 *   node led-test-interactive.js --button ACCENT     Test specific button
 *   node led-test-interactive.js --cc 44             Test specific CC
 * 
 * When prompted, type your answer and press ENTER.
 */

const midi = require('@julusian/midi');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONSTANTS
// ============================================================

const CC_PROBE_RESULTS_PATH = path.join(__dirname, 'docs', 'cc-probe-results.json');
const RESULTS_PATH = path.join(__dirname, 'docs', 'led-characterization-interactive.json');

// Known LED color types based on Akai Fire research
const COLOR_TYPES = {
  SINGLE_COLOR: 'single_color',       // e.g., yellow_only, red_only
  DUAL_COLOR: 'dual_color',           // e.g., dual_red_green, dual_red_yellow
  TRI_COLOR: 'tri_color',             // e.g., tri_red_green_yellow
  POSITION_INDICATOR: 'position_indicator'  // Pattern selector (0-4 for 4 LEDs)
};

// ============================================================
// LOAD DATA
// ============================================================

let ccProbeData = null;

function loadCCProbeResults() {
  try {
    const data = fs.readFileSync(CC_PROBE_RESULTS_PATH, 'utf8');
    ccProbeData = JSON.parse(data);
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

function turnOffAllLEDs() {
  sendCC(127, 0);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// PROMPT FUNCTION - Using process.stdin directly
// ============================================================

function ask(promptText) {
  return new Promise((resolve) => {
    process.stdout.write(promptText);
    
    const handler = (data) => {
      const input = data.toString().trim();
      process.stdin.removeListener('data', handler);
      resolve(input);
    };
    
    process.stdin.on('data', handler);
  });
}

// ============================================================
// CURRENT TEST STATE
// ============================================================

let testResults = {};

// ============================================================
// POSITION INDICATOR TESTING (Pattern Selector)
// ============================================================

async function testPositionIndicator(cc, buttonName) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`TESTING: ${buttonName} (CC ${cc})`);
  console.log(`${'='.repeat(50)}`);
  console.log(`\nThis button appears to be a position indicator.`);
  console.log(`I will send values 0-4 to see which LED lights up.\n`);
  
  const ledStates = {};
  
  for (let val = 0; val <= 4; val++) {
    turnOffAllLEDs();
    await sleep(300);
    
    console.log(`  Sending value ${val}...`);
    sendCC(cc, val);
    await sleep(800);
    
    const answer = await ask(`  Did any LED light up at value ${val}? (yes/no) > `);
    ledStates[val] = answer.toLowerCase() === 'yes';
    
    if (ledStates[val]) {
      console.log(`  Value ${val}: LED ON ✓`);
    } else {
      console.log(`  Value ${val}: No LED\n`);
    }
  }
  
  return {
    cc,
    buttonName,
    behavior: 'position_indicator',
    ledStates,
    colorType: COLOR_TYPES.POSITION_INDICATOR,
    notes: 'Switches between 4 LED positions (0-4)'
  };
}

// ============================================================
// COLOR/INTENSITY TESTING (Standard Buttons)
// ============================================================

async function testColorIntensity(cc, buttonName) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`TESTING: ${buttonName} (CC ${cc})`);
  console.log(`${'='.repeat(50)}`);
  console.log(`\nI will send values 1-4 and you tell me:`);
  console.log(`  - What COLOR you see`);
  console.log(`  - What BRIGHTNESS level (dim or bright)\n`);
  
  const valueResults = {};
  
  for (let val = 1; val <= 4; val++) {
    turnOffAllLEDs();
    await sleep(300);
    
    sendCC(cc, val);
    console.log(`  Sending value ${val}...`);
    await sleep(800);
    
    const color = await ask(`  Value ${val} - What COLOR? (red/green/yellow/amber/white/other) > `);
    const brightness = await ask(`  Value ${val} - BRIGHTNESS? (dim/bright) > `);
    
    valueResults[val] = {
      color: color.trim().toLowerCase(),
      intensity: brightness.trim().toLowerCase()
    };
    
    console.log(`  Value ${val}: ${valueResults[val].color} / ${valueResults[val].intensity}\n`);
  }
  
  // Determine LED type
  const uniqueColors = [...new Set(Object.values(valueResults).map(v => v.color))];
  
  let colorType;
  if (uniqueColors.length === 1) {
    colorType = COLOR_TYPES.SINGLE_COLOR;
  } else if (uniqueColors.length === 2) {
    colorType = COLOR_TYPES.DUAL_COLOR;
  } else if (uniqueColors.length >= 3) {
    colorType = COLOR_TYPES.TRI_COLOR;
  }
  
  // Determine brightness levels
  const uniqueBrightesses = [...new Set(Object.values(valueResults).map(v => v.intensity))];
  const brightnessLevels = uniqueBrightesses.length;
  
  return {
    cc,
    buttonName,
    behavior: 'color_intensity',
    colorType,
    brightnessLevels,
    valueMapping: valueResults,
    uniqueColors,
    uniqueBrightness: uniqueBrightesses
  };
}

// ============================================================
// TEST ONE BUTTON
// ============================================================

async function testOneButton(cc, buttonName) {
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`CHARACTERIZING: ${buttonName} (CC ${cc})`);
  console.log(`${'='.repeat(60)}`);
  
  // First, do a quick test to determine button type
  console.log(`\nQuick detection test...`);
  turnOffAllLEDs();
  await sleep(300);
  
  // Test value 0 (position indicator check)
  sendCC(cc, 0);
  await sleep(500);
  
  const hasPosition = await ask(`  Did value 0 light up an LED? (position indicator check) (yes/no) > `);
  
  if (hasPosition.toLowerCase() === 'yes') {
    console.log(`\nDetected as POSITION INDICATOR button.\n`);
    return await testPositionIndicator(cc, buttonName);
  } else {
    console.log(`\nDetected as COLOR/INTENSITY button.\n`);
    return await testColorIntensity(cc, buttonName);
  }
}

// ============================================================
// LIST BUTTONS
// ============================================================

function listButtons() {
  console.log(`\nAvailable buttons from probe data:\n`);
  
  const controllers = ccProbeData.controllers.filter(c => c.cc !== 127);
  
  controllers.forEach((c, idx) => {
    console.log(`  ${idx + 1}. ${c.buttonName} (CC ${c.cc}) - values: [${c.workingValues.join(', ')}]`);
  });
  
  console.log(`\n0. Test custom CC`);
}

// ============================================================
// GROUP BUTTONS BY TYPE (for batch testing)
// ============================================================

function groupButtonsByCC() {
  const groups = [
    {
      name: 'Pattern Selector (CC 31-35)',
      buttons: [31, 32, 33, 34, 35]
    },
    {
      name: 'Mute Track 1-4 (CC 40-43)',
      buttons: [40, 41, 42, 43]
    },
    {
      name: 'Accent/Snap/Tap/Overview/Shift/Loop (CC 44-48, 53)',
      buttons: [44, 45, 46, 47, 48, 53]
    },
    {
      name: 'Alt/Stop (CC 49, 52)',
      buttons: [49, 52]
    },
    {
      name: 'Metronome/Play (CC 50-51)',
      buttons: [50, 51]
    }
  ];
  
  return groups;
}

// ============================================================
// INTERACTIVE MODE - Full flow
// ============================================================

async function runInteractiveMode() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`AKAI FIRE LED INTERACTIVE CHARACTERIZATION`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\nThis tool guides you through testing each button's LED.`);
  console.log(`You will observe the physical LED and report what you see.\n`);
  
  loadCCProbeResults();
  
  const portName = await openMIDI();
  console.log(`Connected to: ${portName}\n`);
  
  while (true) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`MENU`);
    console.log(`${'─'.repeat(40)}`);
    console.log(`1. Test next untested button`);
    console.log(`2. Test specific button by number`);
    console.log(`3. Test custom CC value`);
    console.log(`4. Test button group (by type)`);
    console.log(`5. View saved results`);
    console.log(`6. Save results and exit`);
    console.log(`7. Exit without saving\n`);
    
    const choice = await ask(`Choose option (1-7) > `);
    
    switch (choice.trim()) {
      case '1': {
        const testedCCs = new Set(Object.keys(testResults));
        const nextButton = ccProbeData.controllers.find(c => c.cc !== 127 && !testedCCs.has(String(c.cc)));
        
        if (!nextButton) {
          console.log(`\nAll buttons have been tested!`);
        } else {
          await testOneButton(nextButton.cc, nextButton.buttonName);
        }
        break;
      }
      
      case '2': {
        listButtons();
        const btnNum = await ask(`Enter button number > `);
        const btnIdx = parseInt(btnNum) - 1;
        const controllers = ccProbeData.controllers.filter(c => c.cc !== 127);
        
        if (btnIdx >= 0 && btnIdx < controllers.length) {
          await testOneButton(controllers[btnIdx].cc, controllers[btnIdx].buttonName);
        } else {
          console.log(`Invalid button number.`);
        }
        break;
      }
      
      case '3': {
        const customCC = await ask(`Enter CC number (0-127) > `);
        const ccNum = parseInt(customCC);
        
        if (!isNaN(ccNum) && ccNum >= 0 && ccNum <= 127) {
          const existing = ccProbeData.controllers.find(c => c.cc === ccNum);
          const name = existing ? existing.buttonName : `Custom CC ${ccNum}`;
          await testOneButton(ccNum, name);
        } else {
          console.log(`Invalid CC number.`);
        }
        break;
      }
      
      case '4': {
        const groups = groupButtonsByCC();
        
        console.log(`\nAvailable button groups:`);
        groups.forEach((g, idx) => {
          console.log(`  ${idx + 1}. ${g.name} (${g.buttons.length} buttons)`);
        });
        
        const groupNum = await ask(`\nEnter group number (1-${groups.length}) > `);
        const groupIdx = parseInt(groupNum) - 1;
        
        if (groupIdx >= 0 && groupIdx < groups.length) {
          const group = groups[groupIdx];
          console.log(`\nTesting group: ${group.name}`);
          
          for (const cc of group.buttons) {
            const existing = ccProbeData.controllers.find(c => c.cc === cc);
            const name = existing ? existing.buttonName : `CC ${cc}`;
            await testOneButton(cc, name);
          }
        } else {
          console.log(`Invalid group number.`);
        }
        break;
      }
      
      case '5': {
        console.log(`\n--- Saved Results ---`);
        console.log(JSON.stringify(testResults, null, 2));
        break;
      }
      
      case '6': {
        fs.writeFileSync(RESULTS_PATH, JSON.stringify(testResults, null, 2));
        console.log(`\nResults saved to: ${RESULTS_PATH}`);
        console.log(`Tested ${Object.keys(testResults).length} button(s).\n`);
        closeMIDI();
        process.exit(0);
        break;
      }
      
      case '7': {
        console.log(`\nExiting without saving.\n`);
        closeMIDI();
        process.exit(0);
        break;
      }
      
      default:
        console.log(`\nInvalid option.`);
    }
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];
  
  if (mode === '--help' || mode === '-h') {
    console.log(`
Akai Fire LED Interactive Characterization

Usage:
  node led-test-interactive.js                     Start interactive test mode
  node led-test-interactive.js --button ACCENT     Test specific button by name
  node led-test-interactive.js --cc 44             Test specific CC value
  node led-test-interactive.js --list              List all buttons from probe data

Interactive Mode Features:
  - Tests values 0-4 to detect position indicators vs color/intensity buttons
  - For color/intensity buttons: tests values 1-4 with color and brightness prompts
  - Determines LED type (single-color, dual-color, tri-color, position indicator)
  - Groups buttons by similar behavior for batch testing
  - Saves results to docs/led-characterization-interactive.json

When prompted, type your answer and press ENTER.
`);
    return;
  }
  
  if (mode === '--list') {
    loadCCProbeResults();
    listButtons();
    return;
  }
  
  if (mode === '--button') {
    const buttonName = args[1]?.toUpperCase();
    loadCCProbeResults();
    
    const controller = ccProbeData.controllers.find(c =>
      c.buttonName.toLowerCase().includes(buttonName.toLowerCase())
    );
    
    if (!controller) {
      console.error(`Button "${buttonName}" not found. Use --list to see available buttons.`);
      process.exit(1);
    }
    
    await openMIDI();
    await testOneButton(controller.cc, controller.buttonName);
    closeMIDI();
    return;
  }
  
  if (mode === '--cc') {
    const ccNum = parseInt(args[1]);
    if (isNaN(ccNum)) {
      console.error('Please provide a CC number');
      process.exit(1);
    }
    
    loadCCProbeResults();
    await openMIDI();
    
    const controller = ccProbeData.controllers.find(c => c.cc === ccNum);
    const name = controller ? controller.buttonName : `CC ${ccNum}`;
    
    await testOneButton(ccNum, name);
    closeMIDI();
    return;
  }
  
  // Default: interactive mode
  loadCCProbeResults();
  await openMIDI();
  await runInteractiveMode();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(`\n\nTest interrupted.`);
  if (Object.keys(testResults).length > 0) {
    console.log(`\nSaved ${Object.keys(testResults).length} result(s).`);
    fs.writeFileSync(RESULTS_PATH, JSON.stringify(testResults, null, 2));
    console.log(`Results saved to: ${RESULTS_PATH}`);
  }
  closeMIDI();
  process.exit(0);
});

main().catch(console.error);

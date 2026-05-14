#!/usr/bin/env node

/**
 * Akai Fire LED Control Tool
 * 
 * Controls:
 * - CC messages for function button LEDs (including dual-color with intensity)
 * - SysEx messages for RGB pads
 * 
 * Usage:
 *   node led-control.js all-off                    Turn all LEDs off
 *   node led-control.js all-white                  All pads white
 *   node led-control.js pad <0-63> <r> <g> <b>     Set single pad (RGB 0-127)
 *   node led-control.js button <NAME> <color> <intensity>
 *   node led-control.js interactive                Interactive mode
 */

const midi = require('@julusian/midi');

// ============================================================
// CONSTANTS
// ============================================================

const FIRE_PORT = 3; // FL STUDIO FIRE

/**
 * Button LED mappings
 * 
 * Format: { cc: number, type: 'single'|'dual-color', colors: [...], intensities: [...] }
 * 
 * Based on research and user testing:
 * - Single-color buttons: Red-only, Green-only, Yellow-only
 * - Dual-color buttons: Red+Green (e.g., Mute buttons with Red=Muted, Green=Unmuted)
 * - Each color can have LOW (1) or HIGH (2/3) intensity
 */

// LED intensity values per color
const LED = {
  OFF: 0,
  // Single-color buttons
  DULL_RED: 1,       // Value 1 = dull red
  HIGH_RED: 2,       // Value 2 = high red (some buttons also yellow)
  HIGH_YELLOW: 3,    // Value 3 = high yellow (some buttons)
  DULL_GREEN: 4,     // Value 4 = dull green
  HIGH_GREEN: 5,     // Some buttons support this
  
  // For dual-color: we send two CC messages
  // Red LOW = value 1, Red HIGH = value 2
  // Green LOW = value 4, Green HIGH = value 5
};

/**
 * Button LED definitions
 *
 * CC values discovered via cc-probe.js on 2026-04-30
 */
const BUTTONS = {
  // Mode - Controls 4 small red LEDs (bank-style, values 1-4 light each LED)
  'MODE':         { cc: 27, type: 'mode' },  // 4 red LEDs above pads
  
  // Top Navigation (5) - All single-color red
  'PAT_UP':       { cc: 31, type: 'single',  color: 'red' },
  'PAT_DOWN':     { cc: 32, type: 'single',  color: 'red' },
  'BROWSER':      { cc: 33, type: 'single',  color: 'red' },
  'GRID_LEFT':    { cc: 34, type: 'single',  color: 'red' },
  'GRID_RIGHT':   { cc: 35, type: 'single',  color: 'red' },
  
  // Left Side (5) - Mute buttons
  'MUTE_1':       { cc: 36, type: 'single',  color: 'red' },
  'MUTE_2':       { cc: 37, type: 'single',  color: 'red' },
  'MUTE_3':       { cc: 38, type: 'single',  color: 'red' },
  'MUTE_4':       { cc: 39, type: 'single',  color: 'red' },
  
  // Additional rectangular LEDs (40-43) - mapped to mute buttons for now
  
  // Bottom Left (6)
  'ACCENT':       { cc: 44, type: 'single',  color: 'red' },
  'SNAP':         { cc: 45, type: 'single',  color: 'red' },
  'TAP':          { cc: 46, type: 'single',  color: 'red' },
  'OVERVIEW':     { cc: 47, type: 'single',  color: 'red' },
  'SHIFT':        { cc: 48, type: 'single',  color: 'red' },
  'ALT':          { cc: 49, type: 'single',  color: 'red' },
  
  // Bottom Right (4)
  'METRONOME':    { cc: 50, type: 'single',  color: 'red' },
  'PLAY':         { cc: 51, type: 'single',  color: 'red' },
  'STOP':         { cc: 52, type: 'single',  color: 'red' },
  'RECORD':       { cc: 53, type: 'single',  color: 'red' },
  
  // Control Bank LEDs (4 circular red LEDs)
  'BANK':         { cc: 0x1B, type: 'bank' },
};

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

function sendSysEx(bytes) {
  midiOut.sendMessage(bytes);
}

// ============================================================
// LED CONTROL FUNCTIONS
// ============================================================

/**
 * Turn off all LEDs
 */
function turnOffAllLEDs() {
  console.log('Turning off all LEDs...');
  
  // CC 127 value 0 = master all off
  sendCC(127, 0);
  
  // Bank LEDs all off
  sendCC(0x1B, 0x10);
  
  console.log('Done.');
}

/**
 * Set a single pad color via SysEx
 * Format: F0 47 7F 43 65 00 04 ii rr gg bb F7
 */
function setPadColor(padIndex, red, green, blue) {
  red = Math.min(0x7F, Math.max(0, red));
  green = Math.min(0x7F, Math.max(0, green));
  blue = Math.min(0x7F, Math.max(0, blue));
  
  const sysex = [
    0xF0, 0x47, 0x7F, 0x43, 0x65,
    0x00, 0x04,                    // Length: 4 bytes follow
    padIndex,                      // Pad index (0-63)
    red, green, blue,              // RGB
    0xF7
  ];
  
  sendSysEx(sysex);
}

/**
 * Set all pads to a color
 */
function setAllPadsColor(red, green, blue) {
  const padData = [];
  for (let i = 0; i < 64; i++) {
    padData.push(i, red, green, blue);
  }
  
  const sysex = [
    0xF0, 0x47, 0x7F, 0x43, 0x65,
    0x02, 0x00,                    // Length: 256 (7-bit encoded)
    ...padData,
    0xF7
  ];
  
  sendSysEx(sysex);
  console.log(`All pads: R=${red} G=${green} B=${blue}`);
}

/**
 * Map intensity/color shorthand to CC value
 *
 * Format: [1-2][r/g/b/y] or [1-3][r/g] + intensity
 *
 * Supported formats:
 *   1r = low red, 2r = medium red, 3r = high red
 *   1g = low green, 2g = medium green, 3g = high green
 *   r = red (default intensity), g = green, etc.
/**
 * Map intensity/color shorthand to CC value
 *
 * Format: [1-4][r/g/b/y] - e.g., "1r" = low red, "2g" = medium green
 * Also supports standalone color names: r, g, b, y, red, green, etc.
 */
function parseColorIntensity(input) {
  if (!input) return { value: 1, color: 'red' };
  
  const inputLower = input.toLowerCase().trim();
  
  // Parse shorthand like "1r", "2g", "3b", "4y", etc.
  const match = inputLower.match(/^([1-4])([rgb])$/);
  if (match) {
    const intensity = parseInt(match[1]); // 1=low, 2=medium, 3=high, 4=maximum
    const color = match[2];
    
    // Map to CC values based on tested intensity levels
    let value = 1;
    switch (color) {
      case 'r': // Red: 1=low, 2=medium, 3=high
        value = Math.min(3, intensity);
        break;
      case 'g': // Green: 4=low, 5=medium, 6=high
        value = intensity <= 1 ? 4 : (intensity === 2 ? 5 : 6);
        break;
      case 'b': // Blue (for pads - uses same values as red)
        value = Math.min(3, intensity);
        break;
    }
    
    return { value, color };
  }
  
  // Parse just color (default to low intensity)
  if (['r', 'g', 'b'].includes(inputLower)) {
    return { value: 1, color: inputLower };
  }
  
  // Parse yellow (uses red values)
  if (inputLower === 'y') {
    return { value: 1, color: 'y' };
  }
  
  // Parse full words
  if (['low', 'dim'].includes(inputLower)) return { value: 1, color: 'red' };
  if (['medium', 'med'].includes(inputLower)) return { value: 2, color: 'red' };
  if (['high', 'bright'].includes(inputLower)) return { value: 3, color: 'red' };
  
  return { value: 1, color: 'red' };
}

/**
 * Set a function button LED
 */
function setButtonLED(buttonName, options = {}) {
  const btn = BUTTONS[buttonName];
  
  if (!btn) {
    console.log(`Unknown button: ${buttonName}`);
    console.log('Available:', Object.keys(BUTTONS).join(', '));
    return;
  }
  
  if (btn.cc === null) {
    console.log(`⚠ CC value not set for ${buttonName}`);
    return;
  }
  
  if (btn.type === 'bank') {
    const value = typeof options === 'number' ? options : 0x10;
    sendCC(btn.cc, value);
    console.log(`Bank LEDs: 0x${value.toString(16).toUpperCase()}`);
    return;
  }
  
  if (btn.type === 'mode') {
    const val = typeof options === 'number' ? options : (options.value || 0);
    sendCC(btn.cc, 0);
    if (val >= 1 && val <= 4) {
      sendCC(btn.cc, val);
    }
    console.log(`Mode LEDs: value=${val}`);
    return;
  }
  
  if (btn.type === 'single') {
    // options can be: { value, color } or a parsed shorthand result
    const parsed = typeof options === 'object' ? options : parseColorIntensity(options);
    const { value, color } = parsed;
    
    // Use the value directly - parseColorIntensity already returns correct CC values
    // for each color (red=1-3, green=4-6, blue=1-3)
    let ccValue = value;
    switch (color) {
      case 'r':   // Red: 1=low, 2=medium, 3=high
        ccValue = Math.min(3, Math.max(1, value));
        break;
      case 'g':   // Green: 4=low, 5=medium, 6=high (already set by parseColorIntensity)
        ccValue = Math.min(6, Math.max(4, value));
        break;
      case 'y':   // Yellow: 1=low, 3=high
        ccValue = value <= 2 ? 1 : 3;
        break;
      case 'b':   // Blue: same as red (1-3)
        ccValue = Math.min(3, Math.max(1, value));
        break;
      default:    // Default to red
        ccValue = Math.min(3, Math.max(1, value));
    }
    
    sendCC(btn.cc, ccValue);
    console.log(`Button ${buttonName} CC=${btn.cc} val=${ccValue} (${color})`);
    return;
  }
  
  console.log(`Unknown button type: ${btn.type}`);
}

// ============================================================
// CLI
// ============================================================

function printUsage() {
  console.log(`
Akai Fire LED Control Tool
==========================

Commands:
  node led-control.js all-off              Turn all LEDs off
  node led-control.js all-white            All pads white (R=G=B=127)
  node led-control.js all-red              All pads red
  node led-control.js all-green            All pads green
  node led-control.js all-blue             All pads blue
  
  node led-control.js pad <0-63> <r> <g> <b>   Set single pad (RGB 0-127)
  
  Shorthand syntax: [1-4][r/g/b]
    1r = low red,     2r = medium red,   3r = high red
    1g = low green,   2g = medium green, 3g = high green
    1b = low blue,    2b = medium blue,  3b = high blue
  
  node led-control.js button BROWSER 1r      # Red, low intensity
  node led-control.js button BROWSER 3r      # Red, high intensity
  node led-control.js button MUTE_1 2g       # Green, medium intensity
  
  Full syntax (alternative):
  node led-control.js button <NAME> [color] [intensity]
    Single-color buttons:
      node led-control.js button BROWSER low     # Red, low intensity
      node led-control.js button BROWSER high    # Red, high intensity
    
    Dual-color buttons (MUTE_1-4, MODE, PLAY):
      node led-control.js button MUTE_1 green low    # Green, low
      node led-control.js button MUTE_1 green high   # Green, high
      node led-control.js button MUTE_1 red low      # Red, low
      node led-control.js button MUTE_1 red high     # Red, high
  
  node led-control.js interactive          Interactive mode

Button Types:
  Single-color (Red):    PAT_BACK, PAT_NEXT, BROWSER, GRID_LEFT, GRID_RIGHT,
                          LOOP_REC, ACCENT, SNAP, TAP, OVERVIEW, METRONOME, RECORD
  Single-color (Green):  (none defined yet)
  Single-color (Yellow): SHIFT, ALT, STOP
  Dual-color (Green/Red): MODE, MUTE_1-4
  Dual-color (Yellow/Green): PLAY

Intensity Levels:
  low  = Dull/Dim (value 1-4 depending on color)
  high = Bright (value 2-5 depending on color)
`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const portName = await openMIDI();
  console.log(`Connected to: ${portName}\n`);
  
  const args = process.argv.slice(2);
  const cmd = args[0];
  
  if (!cmd) {
    printUsage();
    closeMIDI();
    return;
  }
  
  switch (cmd) {
    case 'all-off':
      turnOffAllLEDs();
      break;
      
    case 'all-white':
      setAllPadsColor(127, 127, 127);
      break;
      
    case 'all-red':
      setAllPadsColor(127, 0, 0);
      break;
      
    case 'all-green':
      setAllPadsColor(0, 127, 0);
      break;
      
    case 'all-blue':
      setAllPadsColor(0, 0, 127);
      break;
      
    case 'pad': {
      const idx = parseInt(args[1]);
      const r = parseInt(args[2]) || 0;
      const g = parseInt(args[3]) || 0;
      const b = parseInt(args[4]) || 0;
      
      if (isNaN(idx) || idx < 0 || idx > 63) {
        console.error('Pad index must be 0-63');
      } else {
        setPadColor(idx, r, g, b);
      }
      break;
    }
    
    case 'button': {
      const btnName = args[1]?.toUpperCase();
      const arg2 = args[2]; // Could be "1r", "2g", "3b", or color name
      
      if (!btnName) {
        console.error('Please provide a button name');
        printUsage();
      } else if (arg2 && /^([1-4])[rgb]$/i.test(arg2)) {
        // Parse shorthand like "1r", "2g", "3b", "4y"
        const parsed = parseColorIntensity(arg2);
        setButtonLED(btnName, parsed);
      } else {
        // Parse as color + intensity words
        const color = arg2?.toLowerCase();
        const intensity = args[3]?.toLowerCase();
        setButtonLED(btnName, { color, intensity });
      }
      break;
    }
    
    case 'interactive':
    case 'test':
      await runInteractiveTest();
      break;
      
    default:
      console.error(`Unknown command: ${cmd}`);
      printUsage();
  }
  
  setTimeout(() => closeMIDI(), 200);
}

/**
 * Interactive mode
 */
async function runInteractiveTest() {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  console.log('Interactive LED Control');
  console.log('=======================\n');
  console.log('Commands: all-off, all-white, all-red, all-green, all-blue');
  console.log('  pad <idx> <r> <g> <b>    Set single pad');
  console.log('  button <NAME> <shorthand>   Shorthand: 1r, 2g, 3b, etc.');
  console.log('  button <NAME> <color> <intensity>  Alternative: red low');
  console.log('  quit                     Exit\n');
  
  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
  
  while (true) {
    const input = await question('led> ');
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    
    if (!cmd) continue;
    
    if (cmd === 'quit' || cmd === 'exit' || cmd === 'q') break;
    else if (cmd === 'all-off') turnOffAllLEDs();
    else if (cmd === 'all-white') setAllPadsColor(127, 127, 127);
    else if (cmd === 'all-red') setAllPadsColor(127, 0, 0);
    else if (cmd === 'all-green') setAllPadsColor(0, 127, 0);
    else if (cmd === 'all-blue') setAllPadsColor(0, 0, 127);
    else if (cmd === 'pad') {
      const idx = parseInt(parts[1]);
      const r = parseInt(parts[2]) || 0;
      const g = parseInt(parts[3]) || 0;
      const b = parseInt(parts[4]) || 0;
      if (isNaN(idx) || idx < 0 || idx > 63) console.log('Usage: pad <0-63> <r> <g> <b>');
      else setPadColor(idx, r, g, b);
    }
    else if (cmd === 'button') {
      const btn = parts[1]?.toUpperCase();
      const arg2 = parts[2];
      
      if (!btn) {
        console.log('Available:', Object.keys(BUTTONS).join(', '));
      } else if (arg2 && /^([1-4])[rgb]$/i.test(arg2)) {
        // Parse shorthand like "1r", "2g", "3b"
        const parsed = parseColorIntensity(arg2);
        setButtonLED(btn, parsed);
      } else {
        // Parse as color + intensity words
        const color = arg2?.toLowerCase();
        const intensity = parts[3]?.toLowerCase();
        setButtonLED(btn, { color, intensity });
      }
    }
    else console.log(`Unknown: ${cmd}`);
  }
  
  rl.close();
}

main().catch(console.error);
